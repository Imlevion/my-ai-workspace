import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { buildSystemPrompt, titleFromText } from "@/app/lib/models";

export const runtime = "nodejs";

type AgentPayload = {
  id?: string;
  name: string;
  model: string;
  role: string;
  task?: string;
};

async function callGroq(opts: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
  maxTokens: number;
  stream?: boolean;
}) {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      stream: opts.stream ?? false,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Please log in." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!user.apiKey?.trim()) {
      return new Response(
        JSON.stringify({
          error:
            "Add your Groq API key in Settings first (same idea as connecting an account API).",
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
        role: String(a.role || "Help with the user request.").slice(0, 400),
        task: a.task ? String(a.task).slice(0, 800) : "",
      }));

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

    if (viewTab === "focus") {
      if (focusKind === "technical") {
        systemPromptContent += `\n\n[Focus Mode · Technical]:
You are in Focus technical mode. Produce complete, usable deliverables:
- Prefer full fenced code blocks with language tags for code
- For long drafts (articles, emails, docs), put the full draft first, then a short bullet summary
- Be precise; minimize chit-chat
- The UI will open a side canvas — structure output so code/long text is easy to extract`;
      } else {
        systemPromptContent += `\n\n[Focus Mode · General chat]:
Respond in dense bullet points only (5–8 bullets max). No long paragraphs.
Lead with the answer. Each bullet = one key takeaway.
Skip filler, greetings, and restating the question. Optimize for speed and low tokens.
If the user later asks for code or a long draft, switch to full deliverables.`;
      }
    }

    if (viewTab === "collaborate" && agents.length === 0) {
      systemPromptContent += `\n\n[Collaboration Mode]:
You coordinate a multi-agent team. Structure the answer with clear sections per role when useful:
### Planner
### Builder
### Reviewer
Keep each section focused on its specialty. Stay clean and professional.`;
    }

    const historyMsgs = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const temperature = user.temperature ?? 0.7;
    const maxTokens = user.maxTokens ?? 4096;

    // ── Multi-agent orchestration (real multi-model) ──────────────────────
    if (viewTab === "collaborate" && agents.length > 0) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
            );
          };

          send({ type: "meta", userMessage, title: nextTitle, multiAgent: true });

          const parts: string[] = [];
          let priorContext = "";

          try {
            for (let i = 0; i < agents.length; i++) {
              const agent = agents[i];
              const header = `### ${agent.name}\n_Model: ${agent.model}_\n\n`;
              send({
                type: "agent_start",
                agent: { name: agent.name, model: agent.model, index: i },
              });
              send({ type: "delta", content: i === 0 ? header : `\n\n${header}` });

              const agentSystem = `${systemPromptContent}

[You are agent "${agent.name}"]
Your specialty / role: ${agent.role}
${agent.task?.trim() ? `Your assigned task for this turn: ${agent.task.trim()}` : "Contribute your specialty to the shared user request."}
${priorContext ? `\nPrior teammates already produced:\n${priorContext.slice(0, 6000)}` : ""}
Respond ONLY with your section — do not speak for other agents. Be concrete.`;

              const agentUser = agent.task?.trim()
                ? `Shared user request:\n${content}\n\nYour specific task:\n${agent.task.trim()}`
                : content;

              const groqRes = await callGroq({
                apiKey: user.apiKey!,
                model: agent.model,
                messages: [
                  { role: "system", content: agentSystem },
                  ...historyMsgs,
                  { role: "user", content: agentUser },
                ],
                temperature,
                maxTokens: Math.min(maxTokens, 2048),
                stream: false,
              });

              if (!groqRes.ok) {
                const data = await groqRes.json().catch(() => ({}));
                const errMsg =
                  data.error?.message ||
                  data.message ||
                  `${agent.name} failed`;
                const fail = `_(Agent error: ${errMsg})_`;
                parts.push(header + fail);
                send({ type: "delta", content: fail });
                continue;
              }

              const data = await groqRes.json();
              const reply =
                data.choices?.[0]?.message?.content?.trim() ||
                "_(No response)_";
              parts.push(header + reply);
              priorContext += `\n\n[${agent.name}]:\n${reply}`;
              send({ type: "delta", content: reply });
              send({
                type: "agent_done",
                agent: { name: agent.name, model: agent.model, index: i },
              });
            }

            const full = parts.join("\n\n").trim() || "No response generated.";
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
      ...historyMsgs,
      { role: "user", content },
    ];

    const groqRes = await callGroq({
      apiKey: user.apiKey!,
      model,
      messages: payloadMessages,
      temperature,
      maxTokens,
      stream,
    });

    if (!groqRes.ok) {
      const data = await groqRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error:
            data.error?.message ||
            data.message ||
            "Failed to reach Groq API",
          userMessage,
        }),
        {
          status: groqRes.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (model && model !== user.model) {
      await prisma.user.update({
        where: { id: user.id },
        data: { model },
      });
    }

    if (!stream || !groqRes.body) {
      const data = await groqRes.json();
      const reply =
        data.choices?.[0]?.message?.content || "No response generated.";
      const assistantMessage = await prisma.message.create({
        data: { chatId, role: "assistant", content: reply },
      });
      return new Response(
        JSON.stringify({
          userMessage,
          assistantMessage,
          title: nextTitle,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let full = "";

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
        });

        const reader = groqRes.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n");
            buffer = parts.pop() || "";

            for (const line of parts) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  full += delta;
                  send({ type: "delta", content: delta });
                }
              } catch {
                // skip partial json
              }
            }
          }

          if (!full.trim()) {
            full = "No response generated.";
          }

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
            err instanceof Error ? err.message : "Stream failed";
          if (full.trim()) {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
