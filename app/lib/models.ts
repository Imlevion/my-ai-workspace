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
  "You are Construct, a precise and elegant AI assistant. Be clear, structured, and useful. When writing code, use fenced markdown blocks with a language tag.";

/** Commercial work modes — specialized system prompts people actually need */
export const WORK_MODES = [
  {
    id: "auto",
    label: "Auto",
    short: "Smart default",
    icon: "Sparkles",
    system:
      "You are Construct. Adapt to the user's intent. Be clear, structured, and actionable. Prefer concrete next steps over fluff.",
  },
  {
    id: "solve",
    label: "Solve",
    short: "Break down problems",
    icon: "Target",
    system:
      "You are Construct in Solve mode. Diagnose the problem first, list assumptions, then give a step-by-step solution with trade-offs. End with a short action checklist.",
  },
  {
    id: "write",
    label: "Write",
    short: "Draft & polish text",
    icon: "PenLine",
    system:
      "You are Construct in Write mode. Produce polished, audience-ready writing. Match the requested tone. Offer a tight draft first, then optional variants only if helpful.",
  },
  {
    id: "code",
    label: "Code",
    short: "Build & debug",
    icon: "Code2",
    system:
      "You are Construct in Code mode. Ship correct, modern code. Explain briefly, then provide complete fenced code blocks with language tags. Call out edge cases and how to test.",
  },
  {
    id: "analyze",
    label: "Analyze",
    short: "Insight from data",
    icon: "BarChart3",
    system:
      "You are Construct in Analyze mode. Structure findings as: summary, key insights, risks, recommendations. Use tables or bullets when dense. Be evidence-based.",
  },
  {
    id: "plan",
    label: "Plan",
    short: "Roadmaps & strategy",
    icon: "Map",
    system:
      "You are Construct in Plan mode. Create practical plans with phases, owners (if known), timelines, dependencies, and success metrics. Keep it realistic.",
  },
  {
    id: "translate",
    label: "Translate",
    short: "Languages & clarity",
    icon: "Languages",
    system:
      "You are Construct in Translate mode. Preserve meaning and tone. Provide the translation first, then brief notes on idioms or alternatives if relevant.",
  },
  {
    id: "summarize",
    label: "Summarize",
    short: "Cut to the point",
    icon: "ListTree",
    system:
      "You are Construct in Summarize mode. Lead with a 2–3 sentence executive summary, then bullets for key points, decisions, and open questions. Stay faithful to the source.",
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

/** Default multi-agent team for Collaborate mode */
export const DEFAULT_AGENTS = [
  {
    id: "agent-planner",
    name: "Planner",
    model: "llama-3.3-70b-versatile",
    role: "Break down the request, outline approach, list assumptions and success criteria.",
    color: "#60a5fa",
  },
  {
    id: "agent-coder",
    name: "Builder",
    model: "qwen/qwen3-32b",
    role: "Execute the technical work: code, specs, concrete deliverables.",
    color: "#34d399",
  },
  {
    id: "agent-reviewer",
    name: "Reviewer",
    model: "openai/gpt-oss-120b",
    role: "Critique quality, risks, and suggest improvements. Keep it sharp.",
    color: "#fbbf24",
  },
] as const;

export type AgentRoleDef = {
  id: string;
  name: string;
  model: string;
  role: string;
  color: string;
  task?: string;
  enabled?: boolean;
};

/** Real-world problem templates with live preview examples */
export const PROBLEM_TEMPLATES = [
  {
    id: "career-decision",
    category: "Decisions",
    title: "Career decision framework",
    description: "Compare options with a weighted matrix and a 30-day action plan.",
    prompt:
      "Help me decide between two career options. Ask me the missing details briefly, then build a decision matrix (impact, risk, growth, lifestyle, money) and recommend a path with a 30-day action plan.",
    mode: "solve" as WorkModeId,
    preview: {
      input: "Option A: Senior engineer at startup · Option B: Staff role at big tech",
      output: `**Recommendation:** Staff role (B) if stability matters; startup (A) if upside & ownership matter.

| Criterion | A (Startup) | B (Big tech) |
|-----------|-------------|--------------|
| Impact    | High        | Medium       |
| Risk      | High        | Low          |
| Growth    | Steep       | Steady       |
| Lifestyle | Intense     | Predictable  |
| Money     | Equity bet  | Cash strong  |

**30-day plan**
1. List non-negotiables (comp, hours, learning)
2. Talk to 2 people in each path
3. Negotiate both offers with BATNA clear`,
    },
  },
  {
    id: "email-hard",
    category: "Writing",
    title: "Difficult email",
    description: "Firm and warm drafts under 180 words for sensitive situations.",
    prompt:
      "Draft a clear, professional email for a sensitive situation. I'll describe context next. Give me 2 tone options (firm / warm) under 180 words each, plus a subject line.",
    mode: "write" as WorkModeId,
    preview: {
      input: "Need to push back on an unrealistic deadline from a client",
      output: `**Subject:** Timeline adjustment for Phase 2

**Firm**
Hi Maya — thanks for the urgency. Shipping by Friday would cut QA and risk regressions. We can deliver a solid release by next Wednesday with the full test pass. If Friday is fixed, we need to descope X and Y. Which do you prefer?

**Warm**
Hi Maya — I hear the pressure on Friday. To protect quality, Wednesday is safer for a complete release. Happy to walk through trade-offs on a quick call if that helps.`,
    },
  },
  {
    id: "bug-debug",
    category: "Code",
    title: "Debug this bug",
    description: "Root cause, minimal fix, and a short test plan.",
    prompt:
      "I'll paste an error and relevant code. Find the root cause, explain why it fails, and give a minimal fix with a short test plan.",
    mode: "code" as WorkModeId,
    preview: {
      input: "TypeError: Cannot read properties of undefined (reading 'map')",
      output: `**Root cause:** \`items\` is \`undefined\` before the fetch resolves.

**Fix**
\`\`\`tsx
const list = items ?? [];
return list.map((x) => <Row key={x.id} {...x} />);
\`\`\`

**Test plan**
1. Mount with no data → empty state, no crash
2. Resolve fetch with 3 items → renders rows
3. Reject fetch → error UI`,
    },
  },
  {
    id: "meeting-notes",
    category: "Work",
    title: "Meeting → action items",
    description: "Turn messy notes into summary, decisions, and owners.",
    prompt:
      "Turn the notes I paste into: executive summary, decisions, action items (owner · deadline · priority), and open questions.",
    mode: "summarize" as WorkModeId,
    preview: {
      input: "Talked Q3 launch… need design freeze… eng worried about scope…",
      output: `**Summary:** Team aims for Q3 launch; design freeze and scope control are blockers.

**Decisions**
- Freeze UI by May 12
- Cut “share to Slack” from MVP

**Action items**
| Owner | Task | Deadline | P |
|-------|------|----------|---|
| Ana | Final Figma | May 12 | P0 |
| Ken | Scope PRD | May 10 | P0 |

**Open questions**
- Do we need analytics v1 at launch?`,
    },
  },
  {
    id: "study-plan",
    category: "Learning",
    title: "Learn something fast",
    description: "A focused 14-day plan with drills and success checks.",
    prompt:
      "Create a focused 14-day learning plan for a skill I name. Include daily goals, resources, practice drills, and how I'll know I've leveled up.",
    mode: "plan" as WorkModeId,
    preview: {
      input: "Skill: TypeScript for React apps",
      output: `**Goal:** Ship a typed React feature without \`any\`.

**Days 1–3:** Basics — types, interfaces, unions  
**Days 4–7:** React props, hooks typing, events  
**Days 8–11:** Generics, utility types, API responses  
**Days 12–14:** Build a mini CRUD page fully typed

**Level-up check:** PR has zero \`any\`, props inferred, and tests pass.`,
    },
  },
  {
    id: "negotiate",
    category: "Work",
    title: "Salary / rate negotiation",
    description: "Scripts, BATNA, and replies for common pushback.",
    prompt:
      "Coach me for a compensation negotiation. Build a script, BATNA, and response lines for common pushback. Keep it practical and respectful.",
    mode: "solve" as WorkModeId,
    preview: {
      input: "Offer is 15% below market; I have another interview next week",
      output: `**BATNA:** Other process + current role stability.

**Script**
“I’m excited about the team. Based on market data and scope, I was targeting X–Y. Can we close that gap?”

**Pushback lines**
- “Budget is fixed” → “Could we add a 6-month review or signing bonus?”
- “That’s our band” → “Happy to discuss leveling if scope matches.”`,
    },
  },
  {
    id: "data-insight",
    category: "Analysis",
    title: "Make sense of this data",
    description: "Top insights, anomalies, and weekly recommendations.",
    prompt:
      "I'll paste CSV or metrics. Surface the top insights, anomalies, and 3 recommendations a manager could act on this week.",
    mode: "analyze" as WorkModeId,
    preview: {
      input: "Week 12 conversion 2.1% → Week 13 1.4%; traffic +20%",
      output: `**Insights**
- Conversion dropped 33% while traffic rose — quality or funnel issue
- Spike in mobile share correlates with drop

**Anomaly:** Checkout step 2 error rate 4× baseline

**This week**
1. Fix checkout step 2 error
2. Segment mobile vs desktop conversion
3. Pause low-intent traffic sources`,
    },
  },
  {
    id: "product-spec",
    category: "Product",
    title: "Product spec outline",
    description: "Lean PRD: problem, users, stories, scope, risks.",
    prompt:
      "Draft a lean product spec: problem, users, goals/metrics, user stories, scope in/out, risks, and MVP checklist.",
    mode: "plan" as WorkModeId,
    preview: {
      input: "In-app shared clipboard for design teams",
      output: `**Problem:** Designers lose context pasting assets across tools.

**Users:** Product designers on web

**Goals:** Time-to-paste −40%; weekly active sharers ≥ 30%

**Stories**
- As a designer, I pin an asset to the team board
- As a teammate, I paste with one click

**MVP:** pin, search, paste, permissions  
**Out:** version history, Figma plugin

**Risks:** permission leaks; clipboard API limits`,
    },
  },
  {
    id: "rewrite-clear",
    category: "Writing",
    title: "Make this clearer",
    description: "Tighter rewrite plus a short changelog of edits.",
    prompt:
      "Rewrite the text I paste to be clearer and more concise. Preserve meaning. Show: improved version, then a short list of what you changed.",
    mode: "write" as WorkModeId,
    preview: {
      input: "Due to the fact that we are currently in the process of…",
      output: `**Improved**
We’re finishing the migration this week, so reports may lag by a day.

**Changes**
- Cut filler (“due to the fact that”)
- Concrete timeline
- One idea per sentence`,
    },
  },
  {
    id: "system-design",
    category: "Code",
    title: "System design sketch",
    description: "Architecture, data model, APIs, scale, and failure modes.",
    prompt:
      "Help me design a system for a problem I describe. Cover requirements, architecture diagram (mermaid or ascii), data model, API sketch, scaling, and failure modes.",
    mode: "code" as WorkModeId,
    preview: {
      input: "URL shortener for 10M links / day",
      output: `**Requirements:** create, redirect, analytics; p99 < 50ms redirect

\`\`\`mermaid
flowchart LR
  Client --> API --> Cache
  API --> DB
  API --> Queue --> Analytics
\`\`\`

**Data:** \`links(id, code, url, owner, created)\`

**API**
- \`POST /links\`
- \`GET /:code\` → 302

**Scale:** cache hot codes; shard by code prefix  
**Failure:** cache miss → DB; DB down → stale cache only`,
    },
  },
  {
    id: "translate-tone",
    category: "Language",
    title: "Translate with tone",
    description: "Keep original tone; flag phrases that don’t map cleanly.",
    prompt:
      "Translate the text I paste. Keep the original tone. Provide the translation, then note any phrases that don't map cleanly.",
    mode: "translate" as WorkModeId,
    preview: {
      input: "EN → ID: “Let’s circle back after we land the launch.”",
      output: `**Translation**
“Mari kita bahas lagi setelah peluncuran selesai.”

**Notes**
- “Circle back” → “bahas lagi” (natural, not literal)
- “Land the launch” → “peluncuran selesai”`,
    },
  },
  {
    id: "weekly-review",
    category: "Productivity",
    title: "Weekly review",
    description: "Wins, blockers, lessons, and next-week priorities.",
    prompt:
      "Run a weekly review with me. Ask for wins, blockers, and priorities. Output: reflection, lessons, and a prioritized plan for next week.",
    mode: "plan" as WorkModeId,
    preview: {
      input: "Shipped auth; stuck on billing; want to start notifications",
      output: `**Reflection:** Auth shipped is a real win; billing is the critical path.

**Lessons**
- Scope creep on billing UI
- Need earlier QA on payments

**Next week (priority)**
1. Close billing edge cases (P0)
2. Write payment runbook
3. Spike notifications only if billing green`,
    },
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

/** Detect technical / long-form work that should open Focus canvas */
export function detectTechnicalIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (text.includes("```")) return true;
  if (text.length > 1200) return true;
  const keywords = [
    "code",
    "function",
    "component",
    "implement",
    "debug",
    "api",
    "typescript",
    "javascript",
    "python",
    "react",
    "html",
    "css",
    "sql",
    "bikin",
    "buatkan",
    "tulis kode",
    "draft",
    "artikel",
    "essay",
    "script",
    "refactor",
    "bug",
    "class ",
    "interface ",
    "write a",
    "generate code",
    "full code",
  ];
  return keywords.some((k) => t.includes(k));
}

/** Pull key takeaways for the Focus floating asset dock */
export function extractKeyAssets(
  text: string,
  max = 6
): { id: string; text: string }[] {
  const clean = stripCodeBlocks(text).trim();
  if (!clean) return [];

  const lines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const bullets = lines
    .filter((l) => /^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, ""))
    .filter((l) => l.length > 8 && l.length < 220);

  const assets = (bullets.length ? bullets : lines)
    .slice(0, max)
    .map((t, i) => ({
      id: `asset-${Date.now()}-${i}`,
      text: t.replace(/^#+\s*/, "").replace(/\*\*/g, "").slice(0, 180),
    }));

  return assets;
}

/** Prefer code / long prose for canvas injection */
export function extractCanvasPayload(text: string): string {
  const codes = extractCodeBlocks(text);
  if (codes.length) {
    return codes
      .map((c) => `\`\`\`${c.lang}\n${c.code}\n\`\`\``)
      .join("\n\n");
  }
  const clean = stripCodeBlocks(text).trim();
  if (clean.length > 400) return clean;
  return clean;
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
      const who = m.role === "user" ? "You" : "Construct";
      return `### ${who}\n\n${m.content}\n`;
    })
    .join("\n");
  return `# ${title}\n\n_Exported from Construct_\n\n${body}`;
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
