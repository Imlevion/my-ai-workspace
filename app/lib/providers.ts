/** Multi-provider AI keys + model catalog */

export type ProviderId =
  | "openai"
  | "gemini"
  | "groq"
  | "anthropic"
  | "moonshot";

export type ProviderKeys = Partial<Record<ProviderId, string>>;

export const PROVIDERS: {
  id: ProviderId;
  label: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-…",
    hint: "platform.openai.com",
  },
  {
    id: "gemini",
    label: "Gemini (Google AI Studio)",
    placeholder: "AIza…",
    hint: "aistudio.google.com",
  },
  {
    id: "groq",
    label: "Groq",
    placeholder: "gsk_…",
    hint: "console.groq.com",
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    placeholder: "sk-ant-…",
    hint: "console.anthropic.com",
  },
  {
    id: "moonshot",
    label: "Moonshot",
    placeholder: "sk-…",
    hint: "platform.moonshot.cn",
  },
];

export type ModelDef = {
  id: string;
  provider: ProviderId;
  label: string;
  tagline: string;
  speed: string;
  tier: string;
};

/** Models shown only when that provider's key is set */
export const ALL_MODELS: ModelDef[] = [
  // OpenAI
  {
    id: "gpt-4o",
    provider: "openai",
    label: "GPT-4o",
    tagline: "Flagship multimodal",
    speed: "Standard",
    tier: "Flagship",
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "GPT-4o mini",
    tagline: "Fast · affordable",
    speed: "Fast",
    tier: "Speed",
  },
  {
    id: "o4-mini",
    provider: "openai",
    label: "o4-mini",
    tagline: "Reasoning · compact",
    speed: "Standard",
    tier: "Reason",
  },
  // Gemini
  {
    id: "gemini-2.0-flash",
    provider: "gemini",
    label: "Gemini 2.0 Flash",
    tagline: "Fast multimodal",
    speed: "Fast",
    tier: "Speed",
  },
  {
    id: "gemini-2.5-flash",
    provider: "gemini",
    label: "Gemini 2.5 Flash",
    tagline: "Balanced · sharp",
    speed: "Fast",
    tier: "Flagship",
  },
  {
    id: "gemini-2.5-pro",
    provider: "gemini",
    label: "Gemini 2.5 Pro",
    tagline: "Deep reasoning",
    speed: "Standard",
    tier: "Scale",
  },
  // Groq
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    label: "Llama 3.3 70B",
    tagline: "Balanced · deep reasoning",
    speed: "Standard",
    tier: "Flagship",
  },
  {
    id: "llama-3.1-8b-instant",
    provider: "groq",
    label: "Llama 3.1 8B",
    tagline: "Instant replies",
    speed: "Fast",
    tier: "Speed",
  },
  {
    id: "openai/gpt-oss-120b",
    provider: "groq",
    label: "GPT-OSS 120B",
    tagline: "Large context",
    speed: "Standard",
    tier: "Scale",
  },
  {
    id: "qwen/qwen3-32b",
    provider: "groq",
    label: "Qwen3 32B",
    tagline: "Multilingual · coding",
    speed: "Standard",
    tier: "Code",
  },
  // Anthropic
  {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    label: "Claude Sonnet 4",
    tagline: "Strong coding & writing",
    speed: "Standard",
    tier: "Flagship",
  },
  {
    id: "claude-3-5-haiku-latest",
    provider: "anthropic",
    label: "Claude 3.5 Haiku",
    tagline: "Fast · efficient",
    speed: "Fast",
    tier: "Speed",
  },
  // Moonshot
  {
    id: "moonshot-v1-8k",
    provider: "moonshot",
    label: "Moonshot v1 8K",
    tagline: "Everyday use",
    speed: "Fast",
    tier: "Speed",
  },
  {
    id: "moonshot-v1-32k",
    provider: "moonshot",
    label: "Moonshot v1 32K",
    tagline: "Longer context",
    speed: "Standard",
    tier: "Scale",
  },
  {
    id: "moonshot-v1-128k",
    provider: "moonshot",
    label: "Moonshot v1 128K",
    tagline: "Very long context",
    speed: "Standard",
    tier: "Scale",
  },
];

/** @deprecated use ALL_MODELS — kept for import compatibility */
export const GROQ_MODELS = ALL_MODELS.filter((m) => m.provider === "groq");

export function parseProviderKeys(raw: string | null | undefined): ProviderKeys {
  if (!raw?.trim()) return {};
  const t = raw.trim();
  if (!t.startsWith("{")) {
    // Legacy single Groq key
    return { groq: t };
  }
  try {
    const obj = JSON.parse(t) as Record<string, unknown>;
    const out: ProviderKeys = {};
    for (const p of PROVIDERS) {
      const v = obj[p.id];
      if (typeof v === "string" && v.trim()) out[p.id] = v.trim();
    }
    return out;
  } catch {
    return { groq: t };
  }
}

export function serializeProviderKeys(keys: ProviderKeys): string {
  const clean: ProviderKeys = {};
  for (const p of PROVIDERS) {
    const v = keys[p.id]?.trim();
    if (v) clean[p.id] = v;
  }
  return JSON.stringify(clean);
}

export function providerFlags(keys: ProviderKeys): Record<ProviderId, boolean> {
  return {
    openai: Boolean(keys.openai?.trim()),
    gemini: Boolean(keys.gemini?.trim()),
    groq: Boolean(keys.groq?.trim()),
    anthropic: Boolean(keys.anthropic?.trim()),
    moonshot: Boolean(keys.moonshot?.trim()),
  };
}

export function hasAnyApiKey(keys: ProviderKeys): boolean {
  return Object.values(keys).some((k) => Boolean(k?.trim()));
}

export function modelsForKeys(keys: ProviderKeys): ModelDef[] {
  const flags = providerFlags(keys);
  return ALL_MODELS.filter((m) => flags[m.provider]);
}

export function modelById(id: string): ModelDef | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

export function providerForModel(modelId: string): ProviderId | null {
  return modelById(modelId)?.provider ?? null;
}

export function keyForModel(
  keys: ProviderKeys,
  modelId: string
): string | null {
  const p = providerForModel(modelId);
  if (!p) return null;
  return keys[p]?.trim() || null;
}

/** Max agents = number of usable models from connected keys (min 1, max 6) */
export function maxAgentsForKeys(keys: ProviderKeys): number {
  const n = modelsForKeys(keys).length;
  if (n <= 0) return 1;
  return Math.min(6, Math.max(1, n));
}

export type ChatMessage = { role: string; content: string };

/**
 * Unified chat completion across providers.
 * Returns OpenAI-shaped { choices: [{ message: { content } }] } or stream Response.
 */
export async function callProvider(opts: {
  provider: ProviderId;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  stream?: boolean;
}): Promise<Response> {
  const { provider, apiKey, model, messages, temperature, maxTokens, stream } =
    opts;

  if (provider === "openai" || provider === "groq" || provider === "moonshot") {
    const base =
      provider === "openai"
        ? "https://api.openai.com/v1"
        : provider === "groq"
          ? "https://api.groq.com/openai/v1"
          : "https://api.moonshot.cn/v1";
    return fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: stream ?? false,
      }),
    });
  }

  if (provider === "anthropic") {
    // Anthropic Messages API — no OpenAI stream format; always non-stream then fake if needed
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const anthropicMsgs = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    // Ensure alternating starts with user
    if (anthropicMsgs.length === 0 || anthropicMsgs[0].role !== "user") {
      anthropicMsgs.unshift({ role: "user", content: "(continue)" });
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: system || undefined,
        messages: anthropicMsgs,
      }),
    });
    if (!res.ok || stream === false) return res;
    // Convert to OpenAI-like JSON for non-stream path; for stream callers we return adapted JSON
    const data = await res.json().catch(() => ({}));
    const text =
      data?.content?.map((c: { text?: string }) => c.text || "").join("") ||
      data?.error?.message ||
      "";
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: text } }],
        error: data?.error,
      }),
      {
        status: res.ok ? 200 : res.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (provider === "gemini") {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    if (system) {
      // Prepend system as user turn for broader model compatibility
      contents.unshift({
        role: "user",
        parts: [{ text: `[System instructions]\n${system}` }],
      });
      contents.splice(1, 0, {
        role: "model",
        parts: [{ text: "Understood." }],
      });
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              data?.error?.message || data?.message || "Gemini request failed",
          },
        }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("") || "";
    return new Response(
      JSON.stringify({ choices: [{ message: { content: text } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ error: { message: "Unknown provider" } }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

/** Normalize any provider response body to assistant text */
export async function readAssistantText(res: Response): Promise<{
  ok: boolean;
  text: string;
  error?: string;
  status: number;
}> {
  const status = res.status;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      text: "",
      status,
      error:
        data?.error?.message ||
        data?.message ||
        data?.error ||
        `Request failed (${status})`,
    };
  }
  const text =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.content?.[0]?.text ||
    "";
  return { ok: true, text: String(text).trim(), status };
}
