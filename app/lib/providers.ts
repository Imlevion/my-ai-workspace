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
    label: "Moonshot / Kimi",
    placeholder: "sk-… (pick provider if Auto is unsure)",
    hint: "platform.kimi.ai · platform.kimi.com",
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
  // Moonshot / Kimi — current model IDs from official platform.kimi.ai docs
  {
    id: "kimi-k2.6",
    provider: "moonshot",
    label: "Kimi K2.6",
    tagline: "Flagship · thinking mode",
    speed: "Standard",
    tier: "Flagship",
  },
  {
    id: "kimi-k2.5",
    provider: "moonshot",
    label: "Kimi K2.5",
    tagline: "Strong general model",
    speed: "Standard",
    tier: "Scale",
  },
  {
    id: "kimi-k2.7-code",
    provider: "moonshot",
    label: "Kimi K2.7 Code",
    tagline: "Coding · always thinking",
    speed: "Standard",
    tier: "Code",
  },
  {
    id: "kimi-k2.7-code-highspeed",
    provider: "moonshot",
    label: "Kimi K2.7 Code Fast",
    tagline: "Coding · ~180 tok/s",
    speed: "Fast",
    tier: "Code",
  },
  {
    id: "kimi-k3",
    provider: "moonshot",
    label: "Kimi K3",
    tagline: "Latest K3 reasoning",
    speed: "Standard",
    tier: "Flagship",
  },
];

/** @deprecated use ALL_MODELS — kept for import compatibility */
export const GROQ_MODELS = ALL_MODELS.filter((m) => m.provider === "groq");

export type KeyClassifyResult = {
  /** High-confidence provider, or null if unknown/ambiguous */
  provider: ProviderId | null;
  /** sk- without sk-proj- can be OpenAI OR Moonshot/Kimi */
  needsManualPick: boolean;
  label: string;
};

/**
 * Classify a pasted API key by known official prefixes.
 * Never guess OpenAI for generic `sk-` — Moonshot/Kimi keys also use `sk-`.
 */
export function classifyApiKey(key: string): KeyClassifyResult {
  const k = key.trim();
  if (!k) {
    return { provider: null, needsManualPick: false, label: "" };
  }
  if (k.startsWith("gsk_")) {
    return { provider: "groq", needsManualPick: false, label: "Groq" };
  }
  if (k.startsWith("sk-ant-")) {
    return {
      provider: "anthropic",
      needsManualPick: false,
      label: "Claude (Anthropic)",
    };
  }
  if (k.startsWith("AIza")) {
    return {
      provider: "gemini",
      needsManualPick: false,
      label: "Gemini (Google AI Studio)",
    };
  }
  // OpenAI project / service-account keys (distinct from Moonshot)
  if (k.startsWith("sk-proj-") || k.startsWith("sk-svcacct-")) {
    return { provider: "openai", needsManualPick: false, label: "OpenAI" };
  }
  // Generic sk- : OpenAI user keys AND Moonshot/Kimi keys share this prefix
  if (k.startsWith("sk-")) {
    return {
      provider: null,
      needsManualPick: true,
      label: "OpenAI or Moonshot/Kimi",
    };
  }
  // Google AI Studio sometimes issues non-AIza keys (rare)
  if (/^[A-Za-z0-9_-]{35,}$/.test(k) && !k.includes(".")) {
    return {
      provider: "gemini",
      needsManualPick: false,
      label: "Gemini (Google AI Studio)",
    };
  }
  return { provider: null, needsManualPick: false, label: "Unknown format" };
}

/** Sync detect — only returns high-confidence providers (never guesses sk- → openai) */
export function detectProviderFromKey(key: string): ProviderId | null {
  return classifyApiKey(key).provider;
}

async function probeModelsEndpoint(
  baseUrl: string,
  apiKey: string
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Probe which OpenAI-compatible host accepts this key */
export async function resolveProviderFromKey(
  key: string,
  override?: ProviderId | null | "auto"
): Promise<{ provider: ProviderId | null; error?: string }> {
  const k = key.trim();
  if (!k) return { provider: null, error: "Empty API key" };

  if (override && override !== "auto") {
    return { provider: override };
  }

  const classified = classifyApiKey(k);
  if (classified.provider) {
    return { provider: classified.provider };
  }

  if (!classified.needsManualPick) {
    return {
      provider: null,
      error:
        "Unrecognized key format. Choose a provider manually (OpenAI, Gemini, Groq, Claude, or Moonshot/Kimi).",
    };
  }

  // Ambiguous sk- : live-probe Moonshot/Kimi then OpenAI
  const [msAi, msCn, oai] = await Promise.all([
    probeModelsEndpoint("https://api.moonshot.ai/v1", k),
    probeModelsEndpoint("https://api.moonshot.cn/v1", k),
    probeModelsEndpoint("https://api.openai.com/v1", k),
  ]);
  const moonshotOk = msAi || msCn;
  if (moonshotOk && !oai) return { provider: "moonshot" };
  if (oai && !moonshotOk) return { provider: "openai" };
  if (moonshotOk && oai) {
    return {
      provider: null,
      error:
        "This key format matches both OpenAI and Moonshot. Pick the provider manually before saving.",
    };
  }
  return {
    provider: null,
    error:
      "Key was rejected by OpenAI and Moonshot/Kimi. Check the key or pick the correct provider.",
  };
}

export function parseProviderKeys(raw: string | null | undefined): ProviderKeys {
  if (!raw?.trim()) return {};
  const t = raw.trim();
  if (!t.startsWith("{")) {
    const p = detectProviderFromKey(t);
    // Don't silently mis-assign ambiguous sk- keys
    if (!p) return {};
    return { [p]: t };
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
    const p = detectProviderFromKey(t);
    if (!p) return {};
    return { [p]: t };
  }
}

/** Merge one universal key into the stored multi-key map */
export function mergeUniversalKey(
  existing: ProviderKeys,
  key: string,
  provider: ProviderId
): ProviderKeys {
  if (!provider || !key.trim()) return existing;
  return { ...existing, [provider]: key.trim() };
}

/** Official Moonshot/Kimi OpenAI-compatible bases (intl + China) */
export const MOONSHOT_BASES = [
  "https://api.moonshot.ai/v1",
  "https://api.moonshot.cn/v1",
] as const;

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
    if (provider === "moonshot") {
      // Try international endpoint first, then China (official dual hosts)
      const body = JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: stream ?? false,
      });
      let last: Response | null = null;
      for (const base of MOONSHOT_BASES) {
        try {
          const res = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body,
          });
          last = res;
          // Wrong region often 401/403/404 with empty body — try next only on network-ish failures
          if (res.ok || res.status === 400 || res.status === 429) return res;
          if (res.status === 401 || res.status === 403) {
            // Invalid key is the same on both; still try the other host once
            continue;
          }
        } catch {
          /* try next host */
        }
      }
      return (
        last ||
        new Response(
          JSON.stringify({
            error: { message: "Moonshot/Kimi API unreachable" },
          }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        )
      );
    }

    const base =
      provider === "openai"
        ? "https://api.openai.com/v1"
        : "https://api.groq.com/openai/v1";
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
