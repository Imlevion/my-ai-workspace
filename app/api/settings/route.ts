import { NextResponse } from "next/server";
import { publicUser, requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  ALL_MODELS,
  parseProviderKeys,
  serializeProviderKeys,
  type ProviderId,
  type ProviderKeys,
} from "@/app/lib/providers";

const PROVIDER_IDS: ProviderId[] = [
  "openai",
  "gemini",
  "groq",
  "anthropic",
  "moonshot",
];

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | number | boolean> = {};

    // Universal multi-provider keys
    if (body.providerKeys && typeof body.providerKeys === "object") {
      const current = parseProviderKeys(user.apiKey || "");
      const next: ProviderKeys = { ...current };
      for (const id of PROVIDER_IDS) {
        const v = body.providerKeys[id];
        if (typeof v === "string") {
          // empty string = keep existing; "__clear__" = remove
          if (v === "__clear__") {
            delete next[id];
          } else if (v.trim()) {
            next[id] = v.trim();
          }
        }
      }
      data.apiKey = serializeProviderKeys(next);
    } else if (typeof body.apiKey === "string" && body.apiKey.trim()) {
      // Legacy single-key field → treat as Groq (backward compatible)
      const current = parseProviderKeys(user.apiKey || "");
      current.groq = body.apiKey.trim();
      data.apiKey = serializeProviderKeys(current);
    }

    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (
      typeof body.theme === "string" &&
      ["dark", "light", "system"].includes(body.theme)
    ) {
      data.theme = body.theme;
    }
    if (typeof body.model === "string") {
      if (ALL_MODELS.some((m) => m.id === body.model)) data.model = body.model;
    }
    if (typeof body.temperature === "number") {
      data.temperature = Math.min(1.5, Math.max(0, body.temperature));
    }
    if (typeof body.maxTokens === "number") {
      data.maxTokens = Math.min(8192, Math.max(256, Math.round(body.maxTokens)));
    }
    if (typeof body.systemPrompt === "string") {
      data.systemPrompt = body.systemPrompt.slice(0, 4000);
    }
    if (typeof body.sendWithEnter === "boolean") {
      data.sendWithEnter = body.sendWithEnter;
    }
    if (typeof body.showCanvas === "boolean") {
      data.showCanvas = body.showCanvas;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: publicUser(updated) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
