// Re-export model catalog (multi-provider). Prefer modelsForKeys() for UI.
export { ALL_MODELS, GROQ_MODELS, type ModelDef } from "./providers";
import { ALL_MODELS, GROQ_MODELS } from "./providers";

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/** Soft cap — hard limit is maxAgentsForKeys() based on connected API keys */
export const MAX_AGENTS = 6;

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

export type AgentRoleDef = {
  id: string;
  name: string;
  model: string;
  /** Short specialty label shown in UI */
  role: string;
  /** What this agent must produce (handoff contract) */
  deliverable: string;
  /** Default task when user leaves task blank */
  defaultTask: string;
  color: string;
  task?: string;
  enabled?: boolean;
};

/**
 * Default multi-agent team — fully customizable.
 * Users define each agent's name, function (role), and task.
 */
export const DEFAULT_AGENTS: AgentRoleDef[] = [
  {
    id: "agent-1",
    name: "Agent 1",
    model: "llama-3.3-70b-versatile",
    role: "Plan and structure the approach",
    deliverable: "",
    defaultTask: "",
    color: "#60a5fa",
    task: "",
    enabled: true,
  },
  {
    id: "agent-2",
    name: "Agent 2",
    model: "qwen/qwen3-32b",
    role: "Build the main deliverable",
    deliverable: "",
    defaultTask: "",
    color: "#34d399",
    task: "",
    enabled: true,
  },
];

const AGENT_COLORS = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#38bdf8",
];

export function nextAvailableModel(
  usedModels: string[],
  availableIds?: string[]
): string {
  const pool =
    availableIds && availableIds.length
      ? availableIds
      : ALL_MODELS.map((m) => m.id);
  const free = pool.find((id) => !usedModels.includes(id));
  return free || pool[usedModels.length % pool.length] || DEFAULT_MODEL;
}

export function createAgentSlot(
  existing: AgentRoleDef[],
  opts?: { max?: number; availableModelIds?: string[] }
): AgentRoleDef | null {
  const max = opts?.max ?? MAX_AGENTS;
  if (existing.length >= max) return null;
  const used = existing.map((a) => a.model);
  const n = existing.length + 1;
  return {
    id: `agent-${Date.now()}`,
    name: `Agent ${n}`,
    model: nextAvailableModel(used, opts?.availableModelIds),
    role: "",
    deliverable: "",
    defaultTask: "",
    color: AGENT_COLORS[n % AGENT_COLORS.length],
    task: "",
    enabled: true,
  };
}

/**
 * Build the per-agent system + user messages for Collaborate orchestration.
 * Makes role boundaries and pipeline order explicit so agents don't freestyle.
 */
export function buildAgentTurnPrompt(opts: {
  baseSystem: string;
  agent: {
    name: string;
    role: string;
    deliverable?: string;
    defaultTask?: string;
    task?: string;
  };
  agentIndex: number;
  agentCount: number;
  userRequest: string;
  priorContext: string;
}) {
  const { baseSystem, agent, agentIndex, agentCount, userRequest, priorContext } =
    opts;
  const phase = agentIndex + 1;
  const isFirst = agentIndex === 0;
  const isLast = agentIndex === agentCount - 1;
  const assigned =
    agent.task?.trim() ||
    agent.defaultTask?.trim() ||
    "Contribute your specialty to the shared user request.";

  const pipelineHint = isFirst
    ? "You are FIRST in the pipeline. Set a clear foundation for teammates."
    : isLast
      ? "You are LAST in the pipeline. Finish cleanly; prefer actionable output."
      : "You are MID-pipeline. Build on prior teammates when useful.";

  const functionLine =
    agent.role?.trim() ||
    "Do what the assigned task asks. Stay focused and concrete.";

  const system = `${baseSystem}

══════════════════════════════════════
MULTI-AGENT COLLABORATE · CUSTOM ROLE
══════════════════════════════════════
You are agent "${agent.name}" (${phase} of ${agentCount}).
Your function (defined by the user): ${functionLine}
${agent.deliverable?.trim() ? `Expected output shape: ${agent.deliverable.trim()}` : ""}
${pipelineHint}

RULES:
1. Respond ONLY as ${agent.name}. Never write sections for other agents.
2. Follow YOUR function and assigned task — do not invent a different job.
3. Be concrete and usable — no filler, no role-play chatter.
4. If prior teammate output exists, USE it when relevant.
5. Structure with a short heading matching your name, then your work.
${priorContext ? `\nPrior teammates already produced (context only):\n${priorContext.slice(0, 7000)}` : "No prior teammate output yet."}`;

  const user = `## Shared user request
${userRequest}

## Your assigned task this turn
${assigned}

Produce only your contribution now.`;

  return { system, user, assigned };
}

export type TemplateKind =
  | "website"
  | "analyze"
  | "code"
  | "writing"
  | "product"
  | "work"
  | "learning";

export type ProblemTemplate = {
  id: string;
  category: string;
  kind: TemplateKind;
  title: string;
  description: string;
  /** Instruction sent with the scaffold */
  prompt: string;
  /** Actual template body (HTML, markdown scaffold, etc.) */
  scaffold: string;
  mode: WorkModeId;
  /** Open Focus canvas with scaffold when applied */
  openCanvas?: boolean;
  /** Short badge for cards */
  badge: string;
  preview: {
    input: string;
    output: string;
  };
};

/** Real starter templates — scaffolds users can fill, not just prompt text */
export const PROBLEM_TEMPLATES: ProblemTemplate[] = [
  {
    id: "website-landing",
    category: "Website",
    kind: "website",
    badge: "HTML",
    title: "Landing page starter",
    description:
      "Full single-file landing page: hero, features, pricing, CTA. Edit brand then ship.",
    mode: "code",
    openCanvas: true,
    prompt:
      "Customize this landing-page template for my product. Keep the structure, improve copy and styling for the brief below. Return one complete HTML file.",
    scaffold: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{PRODUCT_NAME}} — {{TAGLINE}}</title>
  <style>
    :root {
      --bg: #0b0b0f;
      --surface: #14141a;
      --text: #f4f4f6;
      --muted: #9b9ba8;
      --accent: #6d8cff;
      --radius: 16px;
      --font: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background: radial-gradient(1200px 600px at 20% -10%, #1a1f3a 0%, var(--bg) 55%);
      color: var(--text);
      line-height: 1.55;
    }
    .wrap { width: min(1100px, 92%); margin: 0 auto; }
    header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 0; position: sticky; top: 0;
      backdrop-filter: blur(12px); background: color-mix(in srgb, var(--bg) 80%, transparent);
    }
    .logo { font-weight: 700; letter-spacing: -0.03em; }
    nav { display: flex; gap: 1.25rem; color: var(--muted); font-size: 0.92rem; }
    nav a { color: inherit; text-decoration: none; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0.7rem 1.15rem; border-radius: 999px; border: 0;
      background: var(--accent); color: white; font-weight: 600; text-decoration: none;
    }
    .btn-ghost {
      background: transparent; border: 1px solid #2a2a34; color: var(--text);
    }
    .hero { padding: 5rem 0 3.5rem; display: grid; gap: 1.25rem; max-width: 720px; }
    .hero h1 {
      font-size: clamp(2.2rem, 5vw, 3.4rem); letter-spacing: -0.04em; line-height: 1.08;
    }
    .hero p { color: var(--muted); font-size: 1.1rem; max-width: 52ch; }
    .cta-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem; padding: 2rem 0 3rem;
    }
    .card {
      background: var(--surface); border: 1px solid #24242e; border-radius: var(--radius);
      padding: 1.25rem;
    }
    .card h3 { font-size: 1.05rem; margin-bottom: 0.4rem; letter-spacing: -0.02em; }
    .card p { color: var(--muted); font-size: 0.95rem; }
    .pricing {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem; padding-bottom: 4rem;
    }
    .price { font-size: 2rem; font-weight: 700; letter-spacing: -0.03em; margin: 0.5rem 0; }
    footer {
      border-top: 1px solid #22222c; padding: 1.5rem 0 2.5rem; color: var(--muted); font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="logo">{{PRODUCT_NAME}}</div>
      <nav>
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#cta">Contact</a>
      </nav>
      <a class="btn" href="#cta">Get started</a>
    </header>

    <section class="hero">
      <h1>{{HEADLINE}}</h1>
      <p>{{SUBHEAD}}</p>
      <div class="cta-row">
        <a class="btn" href="#cta">{{PRIMARY_CTA}}</a>
        <a class="btn btn-ghost" href="#features">See features</a>
      </div>
    </section>

    <section id="features" class="grid">
      <article class="card">
        <h3>{{FEATURE_1_TITLE}}</h3>
        <p>{{FEATURE_1_BODY}}</p>
      </article>
      <article class="card">
        <h3>{{FEATURE_2_TITLE}}</h3>
        <p>{{FEATURE_2_BODY}}</p>
      </article>
      <article class="card">
        <h3>{{FEATURE_3_TITLE}}</h3>
        <p>{{FEATURE_3_BODY}}</p>
      </article>
    </section>

    <section id="pricing" class="pricing">
      <article class="card">
        <h3>Starter</h3>
        <div class="price">$0</div>
        <p>For individuals exploring the product.</p>
      </article>
      <article class="card">
        <h3>Pro</h3>
        <div class="price">$29</div>
        <p>For teams that need collaboration and priority support.</p>
      </article>
    </section>

    <section id="cta" class="hero" style="padding-top:0">
      <h1 style="font-size:2rem">{{FINAL_CTA_HEADLINE}}</h1>
      <p>{{FINAL_CTA_BODY}}</p>
      <div class="cta-row">
        <a class="btn" href="mailto:hello@example.com">Talk to us</a>
      </div>
    </section>

    <footer>© {{YEAR}} {{PRODUCT_NAME}}. All rights reserved.</footer>
  </div>
</body>
</html>`,
    preview: {
      input: "SaaS for freelance invoicing · brand: InvoiceFlow · calm blue",
      output: `Complete HTML landing with:
• Sticky nav + logo
• Hero + dual CTAs
• 3 feature cards
• Starter / Pro pricing
• Footer contact CTA

Placeholders filled with product copy.`,
    },
  },
  {
    id: "website-portfolio",
    category: "Website",
    kind: "website",
    badge: "HTML",
    title: "Portfolio site",
    description:
      "Minimal personal portfolio: about, work grid, contact. One file, ready to host.",
    mode: "code",
    openCanvas: true,
    prompt:
      "Customize this portfolio template for me. Fill placeholders with the profile below and improve visual polish. Return one complete HTML file.",
    scaffold: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{NAME}} — Portfolio</title>
  <style>
    :root {
      --bg: #f6f5f2; --ink: #171717; --muted: #5c5c5c; --line: #e4e1da;
      --card: #fff; --accent: #1a1a1a; --font: "Iowan Old Style", Georgia, serif;
      --sans: ui-sans-serif, system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); }
    .wrap { width: min(960px, 92%); margin: 0 auto; padding: 2.5rem 0 4rem; }
    header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3rem; }
    .name { font-family: var(--font); font-size: 1.6rem; letter-spacing: -0.02em; }
    nav { display: flex; gap: 1rem; font-size: 0.9rem; color: var(--muted); }
    nav a { color: inherit; text-decoration: none; }
    .hero { max-width: 36rem; margin-bottom: 3rem; }
    .hero h1 { font-family: var(--font); font-size: clamp(2rem, 4vw, 2.8rem); line-height: 1.15; margin-bottom: 0.75rem; }
    .hero p { color: var(--muted); font-size: 1.05rem; }
    h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin: 2rem 0 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
    .work {
      background: var(--card); border: 1px solid var(--line); border-radius: 14px;
      padding: 1.15rem; min-height: 140px;
    }
    .work h3 { font-size: 1.05rem; margin-bottom: 0.35rem; }
    .work p { color: var(--muted); font-size: 0.92rem; }
    .contact {
      margin-top: 2.5rem; padding: 1.25rem; border-radius: 14px;
      border: 1px dashed var(--line); display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;
    }
    .btn {
      background: var(--accent); color: #fff; text-decoration: none;
      padding: 0.65rem 1rem; border-radius: 999px; font-size: 0.9rem; font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="name">{{NAME}}</div>
      <nav>
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
    <section class="hero">
      <h1>{{HEADLINE}}</h1>
      <p>{{BIO}}</p>
    </section>
    <h2 id="work">Selected work</h2>
    <div class="grid">
      <article class="work"><h3>{{PROJECT_1}}</h3><p>{{PROJECT_1_DESC}}</p></article>
      <article class="work"><h3>{{PROJECT_2}}</h3><p>{{PROJECT_2_DESC}}</p></article>
      <article class="work"><h3>{{PROJECT_3}}</h3><p>{{PROJECT_3_DESC}}</p></article>
    </div>
    <h2 id="about">About</h2>
    <p style="color:var(--muted);max-width:48ch">{{ABOUT}}</p>
    <div class="contact" id="contact">
      <span style="color:var(--muted)">Available for {{AVAILABILITY}}</span>
      <a class="btn" href="mailto:{{EMAIL}}">Email me</a>
    </div>
  </div>
</body>
</html>`,
    preview: {
      input: "Name: Ava Chen · Product designer · 3 case studies",
      output: "Editorial portfolio HTML with work grid + contact CTA.",
    },
  },
  {
    id: "analyze-metrics",
    category: "Analyze",
    kind: "analyze",
    badge: "Framework",
    title: "Metrics deep-dive",
    description:
      "Fillable analysis framework: summary, trends, anomalies, actions for the week.",
    mode: "analyze",
    prompt:
      "Fill this analysis template using the data I provide. Keep section headers. Be evidence-based and specific.",
    scaffold: `# Metrics analysis

## Context
- Product / team:
- Period:
- Goal of this review:

## Data snapshot
| Metric | Previous | Current | Δ | Notes |
|--------|----------|---------|---|-------|
|        |          |         |   |       |

## Executive summary
(2–3 sentences)

## Key insights
1.
2.
3.

## Anomalies & risks
| Signal | Severity | Likely cause | Evidence |
|--------|----------|--------------|----------|
|        |          |              |          |

## Recommendations (this week)
| # | Action | Owner | Effort | Impact | Due |
|---|--------|-------|--------|--------|-----|
| 1 |        |       |        |        |     |
| 2 |        |       |        |        |     |
| 3 |        |       |        |        |     |

## Open questions
-
-`,
    preview: {
      input: "Week 12 conversion 2.1% → Week 13 1.4%; traffic +20%",
      output: `Filled framework with:
• Conversion drop diagnosed
• Mobile / checkout anomaly table
• 3 prioritized weekly actions`,
    },
  },
  {
    id: "analyze-competitor",
    category: "Analyze",
    kind: "analyze",
    badge: "Framework",
    title: "Competitor teardown",
    description:
      "Structured competitive analysis: positioning, strengths, gaps, opportunities.",
    mode: "analyze",
    prompt:
      "Complete this competitor teardown template for the companies I name. Use the structure as-is; fill every section.",
    scaffold: `# Competitor teardown

## Scope
- Our product:
- Competitors:
- Customer segment:

## Positioning map
| Competitor | Promise | Audience | Price band | Differentiator |
|------------|---------|----------|------------|----------------|
| Us         |         |          |            |                |
| A          |         |          |            |                |
| B          |         |          |            |                |

## Feature matrix
| Capability | Us | A | B | Notes |
|------------|----|---|---|-------|
|            |    |   |   |       |

## Strengths & weaknesses
### Competitor A
- Strengths:
- Weaknesses:

### Competitor B
- Strengths:
- Weaknesses:

## Opportunities for us
1.
2.
3.

## Risks if we ignore them
-

## Recommended moves (30 days)
| Move | Why | Success metric |
|------|-----|----------------|
|      |     |                |`,
    preview: {
      input: "Us: Notion-like wiki · vs Confluence & Coda",
      output: "Positioning map + feature matrix + 30-day moves.",
    },
  },
  {
    id: "code-debug",
    category: "Code",
    kind: "code",
    badge: "Playbook",
    title: "Bug debug playbook",
    description:
      "Root-cause template: reproduce, hypothesize, minimal fix, tests.",
    mode: "code",
    prompt:
      "Use this debug playbook on the error and code I paste. Fill every section; give a minimal fix with tests.",
    scaffold: `# Bug debug playbook

## Symptom
- Error / unexpected behavior:
- Environment (browser, OS, version):
- First seen:

## Reproduction steps
1.
2.
3.

## Expected vs actual
- Expected:
- Actual:

## Relevant code
\`\`\`ts
// paste code here
\`\`\`

## Hypotheses (ranked)
1.
2.
3.

## Root cause
(Explain why it fails — not only where)

## Minimal fix
\`\`\`ts
// patch
\`\`\`

## Test plan
| # | Case | Pass criteria |
|---|------|---------------|
| 1 |      |               |
| 2 |      |               |
| 3 |      |               |

## Prevention
-`,
    preview: {
      input: "TypeError: Cannot read properties of undefined (reading 'map')",
      output: "Root cause + null-safe fix + 3 test cases.",
    },
  },
  {
    id: "code-api",
    category: "Code",
    kind: "code",
    badge: "Spec",
    title: "REST API scaffold",
    description:
      "API design template: resources, endpoints, schemas, errors, auth.",
    mode: "code",
    openCanvas: true,
    prompt:
      "Design the API using this scaffold for the domain I describe. Fill schemas and example requests/responses.",
    scaffold: `# REST API scaffold

## Overview
- Service name:
- Base URL: \`/api/v1\`
- Auth:

## Resources
| Resource | Description | Owner |
|----------|-------------|-------|
|          |             |       |

## Endpoints
### \`GET /resource\`
- Purpose:
- Query params:
- Response 200:
\`\`\`json
{}
\`\`\`

### \`POST /resource\`
- Body:
\`\`\`json
{}
\`\`\`
- Response 201:
\`\`\`json
{}
\`\`\`

## Error model
\`\`\`json
{ "error": { "code": "", "message": "", "details": [] } }
\`\`\`

## Status codes
| Code | When |
|------|------|
| 400  |      |
| 401  |      |
| 404  |      |
| 409  |      |

## Rate limits & idempotency
-

## OpenAPI notes
-`,
    preview: {
      input: "URL shortener · create, redirect, analytics",
      output: "Endpoints, JSON schemas, error model filled.",
    },
  },
  {
    id: "write-email",
    category: "Writing",
    kind: "writing",
    badge: "Draft",
    title: "Difficult email pack",
    description:
      "Subject + firm / warm variants under 180 words, with optional PS.",
    mode: "write",
    prompt:
      "Fill this email pack for the situation I describe. Keep both tones under 180 words.",
    scaffold: `# Difficult email pack

## Context
- Recipient:
- Relationship:
- Goal of the email:
- Constraints / non-negotiables:

## Subject options
1.
2.

## Firm draft
\`\`\`
Hi …,

…

Best,
{{NAME}}
\`\`\`

## Warm draft
\`\`\`
Hi …,

…

Best,
{{NAME}}
\`\`\`

## Optional PS / attachment note
-

## What not to say
-`,
    preview: {
      input: "Push back on unrealistic client deadline",
      output: "2 subjects + firm & warm drafts under 180 words.",
    },
  },
  {
    id: "write-brief",
    category: "Writing",
    kind: "writing",
    badge: "Doc",
    title: "Creative brief",
    description:
      "Campaign / content brief: audience, message, must-haves, success metrics.",
    mode: "write",
    prompt:
      "Complete this creative brief from the notes I provide. Keep sections tight and usable by a designer or writer.",
    scaffold: `# Creative brief

## Project
- Working title:
- Owner:
- Due date:

## Background
(Why this exists — 3–5 lines)

## Audience
- Primary:
- Secondary:
- Jobs to be done:

## Single-minded message
>

## Tone & brand guardrails
- Do:
- Don't:

## Deliverables
| Asset | Spec | Channel |
|-------|------|---------|
|       |      |         |

## Must-include
-
-

## Success metrics
-

## References
-`,
    preview: {
      input: "Launch email for AI note-taking app",
      output: "Filled brief with message, tone, deliverables.",
    },
  },
  {
    id: "product-prd",
    category: "Product",
    kind: "product",
    badge: "PRD",
    title: "Lean product PRD",
    description:
      "Problem, users, stories, scope, risks, MVP checklist — ready to share.",
    mode: "plan",
    prompt:
      "Draft a lean PRD using this template for the feature I describe. Fill every section.",
    scaffold: `# Lean PRD

## Problem
-

## Users & jobs
| Persona | Job to be done | Pain today |
|---------|----------------|------------|
|         |                |            |

## Goals & metrics
| Goal | Metric | Target | Timeframe |
|------|--------|--------|-----------|
|      |        |        |           |

## User stories
1. As a …, I want …, so that …
2.
3.

## Scope
### In (MVP)
-
### Out
-

## UX notes / happy path
1.
2.
3.

## Risks & mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
|      |            |        |            |

## MVP checklist
- [ ]
- [ ]
- [ ]

## Open questions
-`,
    preview: {
      input: "In-app shared clipboard for design teams",
      output: "PRD with stories, scope, risks, MVP checklist.",
    },
  },
  {
    id: "plan-roadmap",
    category: "Product",
    kind: "product",
    badge: "Roadmap",
    title: "90-day roadmap",
    description:
      "Phased plan with owners, dependencies, and success metrics.",
    mode: "plan",
    prompt:
      "Build a 90-day roadmap with this template for the initiative I describe.",
    scaffold: `# 90-day roadmap

## North star
-

## Constraints
- Budget:
- Team:
- Hard deadlines:

## Phases
### Days 1–30 — Foundation
| Workstream | Outcome | Owner | Dependencies |
|------------|---------|-------|--------------|
|            |         |       |              |

### Days 31–60 — Build
| Workstream | Outcome | Owner | Dependencies |
|------------|---------|-------|--------------|
|            |         |       |              |

### Days 61–90 — Ship & learn
| Workstream | Outcome | Owner | Dependencies |
|------------|---------|-------|--------------|
|            |         |       |              |

## Success metrics
| Metric | Baseline | Target D90 |
|--------|----------|------------|
|        |          |            |

## Risks
-

## Decision log
| Date | Decision | Why |
|------|----------|-----|
|      |          |     |`,
    preview: {
      input: "Launch mobile app v1 for existing web SaaS",
      output: "3 phases + metrics + risk list.",
    },
  },
  {
    id: "work-meeting",
    category: "Work",
    kind: "work",
    badge: "Notes",
    title: "Meeting → actions",
    description:
      "Turn messy notes into summary, decisions, owners, and open questions.",
    mode: "summarize",
    prompt:
      "Convert the raw notes I paste into this meeting template. Infer owners only when clear; otherwise leave TBD.",
    scaffold: `# Meeting notes

## Meta
- Meeting:
- Date:
- Attendees:

## Executive summary
(2–3 sentences)

## Decisions
| Decision | Rationale | Owner |
|----------|-----------|-------|
|          |           |       |

## Action items
| Owner | Task | Deadline | Priority |
|-------|------|----------|----------|
|       |      |          | P0/P1/P2 |

## Open questions
-

## Parking lot
-`,
    preview: {
      input: "Q3 launch… design freeze… eng worried about scope…",
      output: "Summary + decisions table + action items with owners.",
    },
  },
  {
    id: "work-negotiation",
    category: "Work",
    kind: "work",
    badge: "Script",
    title: "Negotiation script",
    description:
      "BATNA, opening script, and replies for common pushback.",
    mode: "solve",
    prompt:
      "Fill this negotiation script for my situation. Keep language practical and respectful.",
    scaffold: `# Negotiation script

## Situation
- What I'm negotiating:
- Current offer / status:
- Target:
- Walk-away (BATNA):

## Leverage & constraints
- Strengths:
- Weaknesses:
- Timeline pressure:

## Opening script (30–45 sec)
\`\`\`
…
\`\`\`

## Pushback playbook
| They say | You say |
|----------|---------|
| Budget is fixed | |
| That's our band | |
| We need an answer today | |
| Can you do less equity? | |

## Concessions I can trade
-

## Close / next step
\`\`\`
…
\`\`\``,
    preview: {
      input: "Offer 15% below market; other interview next week",
      output: "BATNA + opening script + pushback table.",
    },
  },
  {
    id: "learn-14day",
    category: "Learning",
    kind: "learning",
    badge: "Plan",
    title: "14-day skill plan",
    description:
      "Daily goals, drills, resources, and a level-up check.",
    mode: "plan",
    prompt:
      "Create a focused 14-day plan for the skill I name using this template.",
    scaffold: `# 14-day learning plan

## Skill
-

## Starting level & goal
- Now:
- After 14 days:

## Daily structure (45–90 min)
- Learn:
- Practice:
- Review:

## Schedule
| Day | Focus | Drill | Done? |
|-----|-------|-------|-------|
| 1 | | | [ ] |
| 2 | | | [ ] |
| 3 | | | [ ] |
| 4 | | | [ ] |
| 5 | | | [ ] |
| 6 | | | [ ] |
| 7 | Mid-check | | [ ] |
| 8 | | | [ ] |
| 9 | | | [ ] |
| 10 | | | [ ] |
| 11 | | | [ ] |
| 12 | | | [ ] |
| 13 | | | [ ] |
| 14 | Capstone | | [ ] |

## Resources
-

## Level-up check
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3`,
    preview: {
      input: "TypeScript for React apps",
      output: "14-day grid + drills + capstone criteria.",
    },
  },
  {
    id: "translate-tone",
    category: "Language",
    kind: "writing",
    badge: "Locale",
    title: "Translate with tone",
    description:
      "Preserve tone; flag phrases that don't map cleanly.",
    mode: "translate",
    prompt:
      "Translate using this template. Keep tone; note untranslatable phrases.",
    scaffold: `# Translation pack

## Direction
- From:
- To:
- Audience:
- Tone (formal / casual / marketing):

## Source text
\`\`\`
{{PASTE_SOURCE}}
\`\`\`

## Translation
\`\`\`
…
\`\`\`

## Notes on tricky phrases
| Original | Choice | Why |
|----------|--------|-----|
|          |        |     |

## Alternative lines (optional)
-`,
    preview: {
      input: 'EN → ID: "Let\'s circle back after we land the launch."',
      output: "Natural ID + notes on idioms.",
    },
  },
];

/** Compose the message that goes into the chat input when a template is applied */
export function composeTemplateMessage(t: ProblemTemplate): string {
  return `${t.prompt}

---
## Template: ${t.title}
\`\`\`${t.kind === "website" ? "html" : "markdown"}
${t.scaffold}
\`\`\`

## My brief
(Describe your product, data, or constraints here)`;
}

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
