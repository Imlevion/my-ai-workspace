export const GROQ_MODELS = [
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    tagline: "Balanced · deep reasoning",
    speed: "Standard",
    tier: "Flagship",
  },
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B",
    tagline: "Instant replies · everyday use",
    speed: "Fast",
    tier: "Speed",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    tagline: "Large context · complex tasks",
    speed: "Standard",
    tier: "Scale",
  },
  {
    id: "qwen/qwen3-32b",
    label: "Qwen3 32B",
    tagline: "Multilingual · sharp coding",
    speed: "Standard",
    tier: "Code",
  },
] as const;

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export const DEFAULT_SYSTEM_PROMPT =
  "You are Aura, a precise and elegant AI assistant. Be clear, structured, and useful. When writing code, use fenced markdown blocks with a language tag.";

/** Commercial work modes — specialized system prompts people actually need */
export const WORK_MODES = [
  {
    id: "auto",
    label: "Auto",
    short: "Smart default",
    icon: "Sparkles",
    system:
      "You are Aura. Adapt to the user's intent. Be clear, structured, and actionable. Prefer concrete next steps over fluff.",
  },
  {
    id: "solve",
    label: "Solve",
    short: "Break down problems",
    icon: "Target",
    system:
      "You are Aura in Solve mode. Diagnose the problem first, list assumptions, then give a step-by-step solution with trade-offs. End with a short action checklist.",
  },
  {
    id: "write",
    label: "Write",
    short: "Draft & polish text",
    icon: "PenLine",
    system:
      "You are Aura in Write mode. Produce polished, audience-ready writing. Match the requested tone. Offer a tight draft first, then optional variants only if helpful.",
  },
  {
    id: "code",
    label: "Code",
    short: "Build & debug",
    icon: "Code2",
    system:
      "You are Aura in Code mode. Ship correct, modern code. Explain briefly, then provide complete fenced code blocks with language tags. Call out edge cases and how to test.",
  },
  {
    id: "analyze",
    label: "Analyze",
    short: "Insight from data",
    icon: "BarChart3",
    system:
      "You are Aura in Analyze mode. Structure findings as: summary, key insights, risks, recommendations. Use tables or bullets when dense. Be evidence-based.",
  },
  {
    id: "plan",
    label: "Plan",
    short: "Roadmaps & strategy",
    icon: "Map",
    system:
      "You are Aura in Plan mode. Create practical plans with phases, owners (if known), timelines, dependencies, and success metrics. Keep it realistic.",
  },
  {
    id: "translate",
    label: "Translate",
    short: "Languages & clarity",
    icon: "Languages",
    system:
      "You are Aura in Translate mode. Preserve meaning and tone. Provide the translation first, then brief notes on idioms or alternatives if relevant.",
  },
  {
    id: "summarize",
    label: "Summarize",
    short: "Cut to the point",
    icon: "ListTree",
    system:
      "You are Aura in Summarize mode. Lead with a 2–3 sentence executive summary, then bullets for key points, decisions, and open questions. Stay faithful to the source.",
  },
] as const;

export type WorkModeId = (typeof WORK_MODES)[number]["id"];

export function modeById(id: string) {
  return WORK_MODES.find((m) => m.id === id) || WORK_MODES[0];
}

export function buildSystemPrompt(
  base: string | null | undefined,
  modeId?: string | null
) {
  const mode = modeById(modeId || "auto");
  const custom = base?.trim();
  if (!custom || mode.id === "auto") {
    return mode.id === "auto"
      ? custom || mode.system
      : `${mode.system}\n\nAdditional preferences:\n${custom || DEFAULT_SYSTEM_PROMPT}`;
  }
  return `${mode.system}\n\nAdditional preferences:\n${custom}`;
}

/** Real-world problem templates people open AI tools for */
export const PROBLEM_TEMPLATES = [
  {
    id: "career-decision",
    category: "Decisions",
    title: "Career decision framework",
    prompt:
      "Help me decide between two career options. Ask me the missing details briefly, then build a decision matrix (impact, risk, growth, lifestyle, money) and recommend a path with a 30-day action plan.",
    mode: "solve" as WorkModeId,
  },
  {
    id: "email-hard",
    category: "Writing",
    title: "Difficult email",
    prompt:
      "Draft a clear, professional email for a sensitive situation. I'll describe context next. Give me 2 tone options (firm / warm) under 180 words each, plus a subject line.",
    mode: "write" as WorkModeId,
  },
  {
    id: "bug-debug",
    category: "Code",
    title: "Debug this bug",
    prompt:
      "I'll paste an error and relevant code. Find the root cause, explain why it fails, and give a minimal fix with a short test plan.",
    mode: "code" as WorkModeId,
  },
  {
    id: "meeting-notes",
    category: "Work",
    title: "Meeting → action items",
    prompt:
      "Turn the notes I paste into: executive summary, decisions, action items (owner · deadline · priority), and open questions.",
    mode: "summarize" as WorkModeId,
  },
  {
    id: "study-plan",
    category: "Learning",
    title: "Learn something fast",
    prompt:
      "Create a focused 14-day learning plan for a skill I name. Include daily goals, resources, practice drills, and how I'll know I've leveled up.",
    mode: "plan" as WorkModeId,
  },
  {
    id: "negotiate",
    category: "Work",
    title: "Salary / rate negotiation",
    prompt:
      "Coach me for a compensation negotiation. Build a script, BATNA, and response lines for common pushback. Keep it practical and respectful.",
    mode: "solve" as WorkModeId,
  },
  {
    id: "data-insight",
    category: "Analysis",
    title: "Make sense of this data",
    prompt:
      "I'll paste CSV or metrics. Surface the top insights, anomalies, and 3 recommendations a manager could act on this week.",
    mode: "analyze" as WorkModeId,
  },
  {
    id: "product-spec",
    category: "Product",
    title: "Product spec outline",
    prompt:
      "Draft a lean product spec: problem, users, goals/metrics, user stories, scope in/out, risks, and MVP checklist.",
    mode: "plan" as WorkModeId,
  },
  {
    id: "rewrite-clear",
    category: "Writing",
    title: "Make this clearer",
    prompt:
      "Rewrite the text I paste to be clearer and more concise. Preserve meaning. Show: improved version, then a short list of what you changed.",
    mode: "write" as WorkModeId,
  },
  {
    id: "system-design",
    category: "Code",
    title: "System design sketch",
    prompt:
      "Help me design a system for a problem I describe. Cover requirements, architecture diagram (mermaid or ascii), data model, API sketch, scaling, and failure modes.",
    mode: "code" as WorkModeId,
  },
  {
    id: "translate-tone",
    category: "Language",
    title: "Translate with tone",
    prompt:
      "Translate the text I paste. Keep the original tone. Provide the translation, then note any phrases that don't map cleanly.",
    mode: "translate" as WorkModeId,
  },
  {
    id: "weekly-review",
    category: "Productivity",
    title: "Weekly review",
    prompt:
      "Run a weekly review with me. Ask for wins, blockers, and priorities. Output: reflection, lessons, and a prioritized plan for next week.",
    mode: "plan" as WorkModeId,
  },
] as const;

export const QUICK_TOOLS = [
  {
    id: "simplify",
    label: "Explain simply",
    prompt: "Explain this more simply, as if to a smart beginner:\n\n",
  },
  {
    id: "actions",
    label: "Action items",
    prompt:
      "Extract concrete action items from our conversation so far. Format as a prioritized checklist.",
  },
  {
    id: "proscons",
    label: "Pros & cons",
    prompt:
      "List pros, cons, and a recommendation for the main decision we're discussing.",
  },
  {
    id: "improve",
    label: "Improve last reply",
    prompt:
      "Improve your previous answer: tighter structure, clearer wording, and more actionable next steps.",
  },
] as const;

export const ACCEPTED_MEDIA =
  ".txt,.md,.json,.js,.ts,.tsx,.jsx,.css,.html,.py,.csv,.log,.xml,.yaml,.yml,.toml,.sql,.rs,.go,.java,.kt,.swift,.c,.cpp,.h,.rb,.php,.sh";

export function titleFromText(content: string) {
  const line = content.replace(/\s+/g, " ").trim();
  if (!line) return "New chat";
  return line.length > 48 ? `${line.slice(0, 48)}…` : line;
}

export function extractCodeBlocks(text: string) {
  const blocks: { id: string; lang: string; code: string }[] = [];
  const re = /```(\w+)?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    blocks.push({
      id: `code-${i++}-${m.index}`,
      lang: (m[1] || "text").toLowerCase(),
      code: m[2].replace(/\n$/, ""),
    });
  }
  return blocks;
}

export function stripCodeBlocks(text: string) {
  return text.replace(/```(?:\w+)?\n[\s\S]*?```/g, "").trim();
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toUpperCase() : "FILE";
}

export function exportChatMarkdown(
  title: string,
  messages: { role: string; content: string }[]
) {
  const body = messages
    .map((m) => {
      const who = m.role === "user" ? "You" : "Aura";
      return `### ${who}\n\n${m.content}\n`;
    })
    .join("\n");
  return `# ${title}\n\n_Exported from Aura_\n\n${body}`;
}

/** Lightweight follow-up suggestions from last assistant text */
export function suggestFollowUps(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  if (t.includes("code") || t.includes("```")) {
    out.push("Add tests for this");
    out.push("Explain the edge cases");
  }
  if (t.includes("plan") || t.includes("step")) {
    out.push("Turn this into a checklist");
    out.push("What are the risks?");
  }
  if (t.includes("email") || t.includes("draft") || t.includes("write")) {
    out.push("Make it shorter");
    out.push("More formal tone");
  }
  out.push("Give me an example");
  out.push("What should I do next?");
  return [...new Set(out)].slice(0, 4);
}
