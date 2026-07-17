import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { buildSystemPrompt, titleFromText } from "@/app/lib/models";

export const runtime = "nodejs";

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

    const payloadMessages = [
      {
        role: "system",
        content: buildSystemPrompt(user.systemPrompt, mode),
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content },
    ];

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          temperature: user.temperature ?? 0.7,
          max_tokens: user.maxTokens ?? 4096,
          stream,
        }),
      }
    );

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

    // Non-streaming fallback
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
