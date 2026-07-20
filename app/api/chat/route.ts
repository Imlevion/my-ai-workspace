import { requireUser, getUserProviderKeys } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  buildAgentTurnPrompt,
  buildSystemPrompt,
  MAX_AGENTS,
  titleFromText,
} from "@/app/lib/models";
import {
  callProvider,
  hasAnyApiKey,
  keyForModel,
  maxAgentsForKeys,
  modelById,
  providerForModel,
  readAssistantText,
  type ProviderId,
} from "@/app/lib/providers";

export const runtime = "nodejs";

type AgentPayload = {
  id?: string;
  name: string;
  model: string;
  role: string;
  deliverable?: string;
  defaultTask?: string;
  task?: string;
};

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Please log in." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const keys = getUserProviderKeys(user);
    if (!hasAnyApiKey(keys)) {
      return new Response(
        JSON.stringify({
          error:
            "Add at least one API key in Settings (OpenAI, Gemini, Groq, Claude, or Moonshot).",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const chatId = String(body.chatId || "");
    const content = String(body.content || "").trim();
    const model = String(body.model || user.model);
    const mode = String(body.mode || "auto");
    const stream = body.stream !== false;
    const focusKind = body.focusKind === "technical" ? "technical" : "general";
    const agentCap = maxAgentsForKeys(keys);
    const agentsRaw = Array.isArray(body.agents) ? body.agents : [];
    const agents: AgentPayload[] = agentsRaw
      .filter(
        (a: AgentPayload) =>
          a && typeof a.name === "string" && typeof a.model === "string"
      )
      .map((a: AgentPayload) => ({
        id: a.id,
        name: String(a.name).slice(0, 40),
        model: String(a.model),
        role: String(a.role || "").slice(0, 200),
        deliverable: a.deliverable
          ? String(a.deliverable).slice(0, 400)
          : "",
        defaultTask: a.defaultTask
          ? String(a.defaultTask).slice(0, 800)
          : "",
        task: a.task ? String(a.task).slice(0, 800) : "",
      }))
      .slice(0, Math.min(MAX_AGENTS, agentCap));

    if (!chatId || !content) {
      return new Response(
        JSON.stringify({ error: "chatId and content are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let history = chat.messages;
    if (body.replaceFromId) {
      const idx = history.findIndex((m) => m.id === body.replaceFromId);
      if (idx >= 0) {
        const toDelete = history.slice(idx).map((m) => m.id);
        await prisma.message.deleteMany({
          where: { id: { in: toDelete } },
        });
        history = history.slice(0, idx);
      }
    }

    const userMessage = await prisma.message.create({
      data: { chatId, role: "user", content },
    });

    const isFirst = history.length === 0;
    const nextTitle = isFirst ? titleFromText(content) : undefined;

    await prisma.chat.update({
      where: { id: chatId },
      data: {
        updatedAt: new Date(),
        ...(nextTitle ? { title: nextTitle } : {}),
        ...(mode ? { mode } : {}),
      },
    });

    const customMemory =
      typeof body.customMemory === "string" ? body.customMemory.trim() : "";
    const uiLanguage = body.uiLanguage === "id" ? "id" : "en";
    const langLine =
      uiLanguage === "id"
        ? "Always respond in Bahasa Indonesia unless the user explicitly asks for another language. Keep technical terms clear; code and identifiers stay in their original form."
        : "Always respond in English unless the user explicitly asks for another language. Keep technical terms clear; code and identifiers stay in their original form.";
    const viewTab = String(body.viewTab || "collaborate");
    const basePrompt = buildSystemPrompt(user.systemPrompt, mode);
    let systemPromptContent = `${basePrompt}\n\n[Language]:\n${langLine}`;
    if (customMemory) {
      systemPromptContent += `\n\n[User Memory Context]:\nRemember this context about the user for the assistant's responses:\n${customMemory}`;
    }

    // Match answer style to the user's intent — never force code on casual chat
    systemPromptContent += `\n\n[Response style · intent matching]:
Match the user's request. For ordinary questions, chat, opinions, explanations, or advice:
- Answer in natural prose (or short bullets if helpful).
- Do NOT invent code, scaffolding, or fenced code blocks unless the user clearly asks for code, debugging, implementation, or a technical deliverable.
- Do not open with code. Prefer a direct human answer first.
Only when the user wants code/build/debug/HTML/CSS/JS/API work: provide complete fenced code with language tags.`;

    if (viewTab === "focus") {
      if (focusKind === "technical") {
        systemPromptContent += `\n\n[Focus Mode · Technical]:
The user intent looks technical. Produce complete, usable deliverables:
- Prefer full fenced code blocks with language tags for code
- For long drafts (articles, emails, docs), put the full draft first, then a short bullet summary
- Be precise; minimize chit-chat
- The UI may open a side canvas — structure output so code/long text is easy to extract`;
      } else {
        systemPromptContent += `\n\n[Focus Mode · General chat]:
This is a normal conversation, not a coding task.
- Answer clearly in natural language (short paragraphs or 3–6 bullets).
- Do NOT produce code, HTML, or pseudo-code unless the user explicitly asks.
- Lead with the answer. Skip filler and restating the question.`;
      }
    }

    if (viewTab === "collaborate" && agents.length === 0) {
      systemPromptContent += `\n\n[Collaboration Mode]:
Structure answers clearly. Stay concrete. If the user is not asking for code or multi-step technical work, reply like a normal assistant — no code dumps.`;
    }

    const historyMsgs = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const temperature = user.temperature ?? 0.7;
    const maxTokens = user.maxTokens ?? 4096;

    async function runModel(opts: {
      modelId: string;
      messages: { role: string; content: string }[];
      temperature: number;
      maxTokens: number;
      stream?: boolean;
    }) {
      const provider = (providerForModel(opts.modelId) ||
        "groq") as ProviderId;
      const apiKey = keyForModel(keys, opts.modelId);
      if (!apiKey) {
        return {
          ok: false as const,
          error: `No API key for model ${opts.modelId} (${provider}). Add it in Settings.`,
          text: "",
          streamRes: null as Response | null,
        };
      }
      // Streaming only for OpenAI-compatible providers
      const canStream =
        opts.stream &&
        (provider === "openai" ||
          provider === "groq" ||
          provider === "moonshot");

      const res = await callProvider({
        provider,
        apiKey,
        model: opts.modelId,
        messages: opts.messages,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        stream: canStream,
      });

      if (canStream && res.ok) {
        return {
          ok: true as const,
          error: "",
          text: "",
          streamRes: res,
        };
      }

      const parsed = await readAssistantText(res);
      return {
        ok: parsed.ok,
        error: parsed.error || "",
        text: parsed.text,
        streamRes: null as Response | null,
      };
    }

    // ── Multi-agent orchestration ─────────────────────────────────────────
    if (viewTab === "collaborate" && agents.length > 0) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
            );
          };

          send({
            type: "meta",
            userMessage,
            title: nextTitle,
            multiAgent: true,
          });

          const parts: string[] = [];
          let priorContext = "";

          try {
            const roster = agents
              .map(
                (a, idx) =>
                  `${idx + 1}. **${a.name}**${
                    a.role?.trim() ? ` — ${a.role.trim()}` : ""
                  }${
                    a.task?.trim() ? ` · _${a.task.trim().slice(0, 80)}_` : ""
                  }`
              )
              .join("\n");
            const pipelineIntro = `## Multi-agent pipeline\n${roster}\n\n`;
            send({ type: "delta", content: pipelineIntro });
            parts.push(pipelineIntro);

            for (let i = 0; i < agents.length; i++) {
              const agent = agents[i];
              const meta = modelById(agent.model);
              const header = `### ${agent.name}\n_${
                agent.role?.trim() || "Custom agent"
              } · ${meta?.label || agent.model}_\n\n`;
              send({
                type: "agent_start",
                agent: {
                  name: agent.name,
                  model: agent.model,
                  role: agent.role,
                  index: i,
                  total: agents.length,
                },
              });
              send({ type: "delta", content: header });

              const turn = buildAgentTurnPrompt({
                baseSystem: systemPromptContent,
                agent: {
                  name: agent.name,
                  role: agent.role,
                  deliverable: agent.deliverable,
                  defaultTask: agent.defaultTask,
                  task: agent.task,
                },
                agentIndex: i,
                agentCount: agents.length,
                userRequest: content,
                priorContext,
              });

              const result = await runModel({
                modelId: agent.model,
                messages: [
                  { role: "system", content: turn.system },
                  ...historyMsgs.slice(-6),
                  { role: "user", content: turn.user },
                ],
                temperature: Math.min(temperature, 0.65),
                maxTokens: Math.min(maxTokens, 2500),
                stream: false,
              });

              if (!result.ok) {
                const fail = `_(Agent error: ${result.error})_`;
                parts.push(header + fail);
                send({ type: "delta", content: fail });
                continue;
              }

              const reply = result.text || "_(No response)_";
              parts.push(header + reply);
              priorContext += `\n\n[${agent.name}]:\n${reply}`;
              send({ type: "delta", content: reply });
              send({
                type: "agent_done",
                agent: { name: agent.name, model: agent.model, index: i },
              });
            }

            const full =
              parts.join("\n\n").trim() || "No response generated.";
            const assistantMessage = await prisma.message.create({
              data: { chatId, role: "assistant", content: full },
            });
            await prisma.chat.update({
              where: { id: chatId },
              data: { updatedAt: new Date() },
            });
            send({ type: "done", assistantMessage, title: nextTitle });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Multi-agent failed";
            const partial = parts.join("\n\n").trim();
            if (partial) {
              try {
                const assistantMessage = await prisma.message.create({
                  data: { chatId, role: "assistant", content: partial },
                });
                send({ type: "done", assistantMessage, partial: true });
              } catch {
                /* ignore */
              }
            }
            send({ type: "error", error: message });
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // ── Single-model path ─────────────────────────────────────────────────
    const payloadMessages = [
      { role: "system", content: systemPromptContent },
      ...(chat.contextSummary
        ? [
            {
              role: "user",
              content: `[Previous conversation summary]: ${chat.contextSummary}`,
            },
          ]
        : []),
      ...historyMsgs,
      { role: "user", content },
    ];

    const result = await runModel({
      modelId: model,
      messages: payloadMessages,
      temperature,
      maxTokens,
      stream,
    });

    if (!result.ok && !result.streamRes) {
      return new Response(
        JSON.stringify({
          error: result.error || "Failed to reach model API",
          userMessage,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (model && model !== user.model) {
      // keep user preference lightly updated
      prisma.user
        .update({ where: { id: user.id }, data: { model } })
        .catch(() => {});
    }

    // Streaming OpenAI-compatible
    if (result.streamRes) {
      const encoder = new TextEncoder();
      const reader = result.streamRes.body?.getReader();
      if (!reader) {
        return new Response(
          JSON.stringify({ error: "No stream", userMessage }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      let full = "";
      const readable = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
            );
          };
          send({ type: "meta", userMessage, title: nextTitle });

          const decoder = new TextDecoder();
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const t = line.trim();
                if (!t.startsWith("data:")) continue;
                const payload = t.slice(5).trim();
                if (payload === "[DONE]") continue;
                try {
                  const json = JSON.parse(payload);
                  const delta =
                    json.choices?.[0]?.delta?.content ||
                    json.choices?.[0]?.text ||
                    "";
                  if (delta) {
                    full += delta;
                    send({ type: "delta", content: delta });
                  }
                } catch {
                  /* skip */
                }
              }
            }

            const assistantMessage = await prisma.message.create({
              data: {
                chatId,
                role: "assistant",
                content: full || "_(No response)_",
              },
            });
            await prisma.chat.update({
              where: { id: chatId },
              data: { updatedAt: new Date() },
            });
            send({ type: "done", assistantMessage, title: nextTitle });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Stream failed";
            if (full) {
              try {
                const assistantMessage = await prisma.message.create({
                  data: { chatId, role: "assistant", content: full },
                });
                send({ type: "done", assistantMessage, partial: true });
              } catch {
                /* ignore */
              }
            }
            send({ type: "error", error: message });
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Non-stream (Gemini / Anthropic / fallback)
    const full = result.text || "_(No response)_";
    const assistantMessage = await prisma.message.create({
      data: { chatId, role: "assistant", content: full },
    });
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    if (stream) {
      // Fake SSE for clients expecting stream
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          const send = (obj: unknown) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
            );
          };
          send({ type: "meta", userMessage, title: nextTitle });
          send({ type: "delta", content: full });
          send({ type: "done", assistantMessage, title: nextTitle });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    return new Response(
      JSON.stringify({
        userMessage,
        assistantMessage,
        title: nextTitle,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
