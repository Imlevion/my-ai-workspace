import { NextResponse } from "next/server";
import { publicUser, requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  ALL_MODELS,
  mergeUniversalKey,
  modelsForKeys,
  parseProviderKeys,
  resolveProviderFromKey,
  serializeProviderKeys,
  type ProviderId,
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

    // Single universal API key — resolve provider (manual override or live probe)
    if (typeof body.apiKey === "string" && body.apiKey.trim()) {
      const rawKey = body.apiKey.trim();
      const overrideRaw = body.providerOverride;
      const override: ProviderId | "auto" | null =
        typeof overrideRaw === "string" &&
        PROVIDER_IDS.includes(overrideRaw as ProviderId)
          ? (overrideRaw as ProviderId)
          : overrideRaw === "auto"
            ? "auto"
            : "auto";

      const resolved = await resolveProviderFromKey(rawKey, override);
      if (!resolved.provider) {
        return NextResponse.json(
          {
            error:
              resolved.error ||
              "Could not detect provider. Choose OpenAI or Moonshot/Kimi manually.",
          },
          { status: 400 }
        );
      }

      const current = parseProviderKeys(user.apiKey || "");
      const next = mergeUniversalKey(current, rawKey, resolved.provider);
      data.apiKey = serializeProviderKeys(next);

      // If current model is not available under new keys, pick a valid default
      const avail = modelsForKeys(next);
      const currentModel = String(body.model || user.model || "");
      if (avail.length && !avail.some((m) => m.id === currentModel)) {
        data.model = avail[0].id;
      }
    } else if (body.providerKeys && typeof body.providerKeys === "object") {
      const current = parseProviderKeys(user.apiKey || "");
      const next = { ...current };
      for (const id of PROVIDER_IDS) {
        const v = (body.providerKeys as Record<string, unknown>)[id];
        if (typeof v === "string") {
          if (v === "__clear__") delete next[id];
          else if (v.trim()) next[id] = v.trim();
        }
      }
      data.apiKey = serializeProviderKeys(next);
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

    return NextResponse.json({
      user: publicUser(updated),
      detectedProvider:
        typeof body.apiKey === "string" && body.apiKey.trim()
          ? (data.apiKey
              ? // re-read from saved
                Object.keys(parseProviderKeys(String(data.apiKey))).find(
                  (id) =>
                    parseProviderKeys(String(data.apiKey))[
                      id as ProviderId
                    ]
                )
              : null)
          : undefined,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
