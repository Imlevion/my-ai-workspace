"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Sparkles,
  X,
  Send,
  Plus,
  MessageSquare,
  Code2,
  Copy,
  Check,
  Trash2,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  Search,
  Upload,
  FileText,
  ChevronDown,
  Square,
  Wand2,
  Target,
  PenLine,
  Map,
  Languages,
  ListTree,
  Keyboard,
  Download,
  Cpu,
  BarChart3,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Globe,
  Brain,
  Shield,
  Terminal,
  FilePlus2,
  Monitor,
  User,
  Camera,
  Image as ImageIcon,
  Puzzle,
  Wrench,
  Video,
  Layers,
  FileType2,
  Archive,
  Paintbrush,
  Mic,
  Table2,
  UsersRound,
  StickyNote,
  Bot,
  Layout,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import {
  ACCEPTED_MEDIA,
  GROQ_MODELS,
  ALL_MODELS,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  WORK_MODES,
  PROBLEM_TEMPLATES,
  DEFAULT_AGENTS,
  MAX_AGENTS,
  createAgentSlot,
  extractCodeBlocks,
  stripCodeBlocks,
  formatBytes,
  extOf,
  exportChatMarkdown,
  suggestFollowUps,
  modeById,
  detectTechnicalIntent,
  extractKeyAssets,
  extractCanvasPayload,
  type WorkModeId,
  type AgentRoleDef,
  type ProblemTemplate,
  type TemplateKind,
} from "./lib/models";
import {
  PROVIDERS,
  classifyApiKey,
  maxAgentsForKeys,
  type ProviderId,
  type ProviderKeys,
} from "./lib/providers";
import {
  VisualPreview,
  htmlFromCanvas,
  canvasFromHtml,
} from "./components/VisualPreview";
import { MarkdownBody } from "./lib/markdown";
import {
  t as i18n,
  detectDefaultLang,
  LANG_OPTIONS,
  type Lang,
} from "./lib/i18n";

type User = {
  id: string;
  email: string;
  name: string;
  model: string;
  theme: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  sendWithEnter: boolean;
  showCanvas: boolean;
  hasApiKey: boolean;
  providers?: Record<ProviderId, boolean>;
  availableModels?: string[];
};

type ChatItem = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt?: string;
  pinned?: boolean;
  mode?: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type AttachFile = {
  id: string;
  name: string;
  text: string;
  size: number;
  kind: "code" | "doc" | "data" | "other";
};

type Sheet =
  | "none"
  | "settings"
  | "model"
  | "attach"
  | "templates"
  | "shortcuts"
  | "command"
  | "library";

type ViewTab = "collaborate" | "focus";
/** Settings IA inspired by ChatGPT / Claude / Gemini */
type SettingsTab =
  | "general"
  | "account"
  | "model"
  | "personalization"
  | "capabilities"
  | "data";

function ConstructIcon({
  className = "h-5 w-5",
  branded = false,
}: {
  className?: string;
  branded?: boolean;
}) {
  if (branded) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/construct-icon.svg"
        alt="Construct"
        className={className}
        draggable={false}
      />
    );
  }
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(100,100)">
        <rect x="-60" y="-22" width="120" height="44" rx="14" fill="currentColor" transform="rotate(-18)"/>
        <rect x="-50" y="-30" width="100" height="38" rx="12" fill="currentColor" transform="rotate(35) translate(10,-6)"/>
        <rect x="-45" y="-18" width="90" height="34" rx="11" fill="currentColor" transform="rotate(80) translate(-8,10)"/>
      </g>
    </svg>
  );
}

function resolveThemeMode(theme: string): "dark" | "light" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

/** Make dense pasted user text readable in chat bubbles */
function formatUserMessage(text: string): string {
  let t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!t) return t;

  // Fix missing spaces after punctuation: "pesat.Mari" → "pesat. Mari"
  t = t.replace(/([.!?…:;])([^\s\d.!?…:;)\]])/g, "$1 $2");
  // Space after closing paren / bracket when stuck: ")Profil"
  t = t.replace(/([)\]])([A-Za-zÀ-ÿ])/g, "$1 $2");
  // Camel-stuck words: "kasus):(Profil" / "lokalbernama"
  t = t.replace(/([a-zà-ÿ])([A-ZÀ-Ö])/g, "$1 $2");
  // Label patterns: "Target Pasar:" keep, but "Target:X" → "Target: X"
  t = t.replace(/([A-Za-zÀ-ÿ])([:])([^\s])/g, "$1$2 $3");
  // Emoji glued to text
  t = t.replace(/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])([A-Za-zÀ-ÿ])/gu, "$1 $2");
  t = t.replace(/([A-Za-zÀ-ÿ0-9])([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/gu, "$1 $2");

  // Wall of text → paragraph breaks at sentence ends
  if (!t.includes("\n") && t.length > 120) {
    t = t.replace(/([.!?…])\s+/g, "$1\n\n");
  } else {
    t = t.replace(/\n{3,}/g, "\n\n");
  }

  // Soft line break after long list-like segments separated by " - " or "·"
  if (t.length > 280 && (t.match(/\n\n/g) || []).length < 2) {
    t = t.replace(/\s[–—-]\s+/g, "\n• ");
  }

  return t.trim();
}

type ComposerMenu = "none" | "attach" | "tools";

const CREATIVE_TOOLS = [
  {
    id: "gen-image",
    icon: "Paintbrush",
    prompt:
      "Generate a detailed image generation prompt for: ",
  },
  {
    id: "gen-video",
    icon: "Video",
    prompt: "Create a short video concept and shot list for: ",
  },
  {
    id: "canvas",
    icon: "Layers",
    prompt:
      "Open a spatial canvas plan: layout, components, and interactions for: ",
  },
  {
    id: "convert-file",
    icon: "FileType2",
    prompt:
      "Help me convert a file format. Ask what source/target formats I need, then give clear steps and any code/tools required for: ",
  },
  {
    id: "compress-file",
    icon: "Archive",
    prompt:
      "Help me compress / reduce file size. Ask for file type and constraints, then recommend the best approach for: ",
  },
  {
    id: "transcribe",
    icon: "Mic",
    prompt: "Transcribe and clean up the following audio/notes content: ",
  },
  {
    id: "data-table",
    icon: "Table2",
    prompt:
      "Turn the following into a clean table with columns, types, and sample rows: ",
  },
  {
    id: "diagram",
    icon: "Sparkles",
    prompt: "Draw a mermaid diagram that explains: ",
  },
] as const;

const MODE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Sparkles,
  Target,
  PenLine,
  Code2,
  BarChart3,
  Map,
  Languages,
  ListTree,
};

const TEMPLATE_KIND_ICONS: Record<
  TemplateKind,
  React.ComponentType<{ className?: string }>
> = {
  website: Monitor,
  analyze: BarChart3,
  code: Code2,
  writing: PenLine,
  product: Layout,
  work: Briefcase,
  learning: GraduationCap,
};

function fileKind(name: string): AttachFile["kind"] {
  const e = name.split(".").pop()?.toLowerCase() || "";
  if (
    ["js", "ts", "tsx", "jsx", "py", "rs", "go", "java", "css", "html", "sql", "sh"].includes(
      e
    )
  )
    return "code";
  if (["md", "txt", "log"].includes(e)) return "doc";
  if (["json", "csv", "xml", "yaml", "yml", "toml"].includes(e)) return "data";
  return "other";
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<AttachFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [query, setQuery] = useState("");
  const [cmdQuery, setCmdQuery] = useState("");
  const [model, setModel] = useState<string>(GROQ_MODELS[0].id);
  const [mode, setMode] = useState<WorkModeId>("auto");
  const [activeCodeId, setActiveCodeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [templateCat, setTemplateCat] = useState<string>("__all__");
  const [viewTab, setViewTab] = useState<ViewTab>("collaborate");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const [nameDraft, setNameDraft] = useState("");
  /** Single universal API key field (provider auto-detected) */
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [providerOverride, setProviderOverride] = useState<ProviderId | "auto">(
    "auto"
  );
  const [greetingTick, setGreetingTick] = useState(0);
  const [tempDraft, setTempDraft] = useState(0.7);
  const [tokensDraft, setTokensDraft] = useState(4096);
  const [promptDraft, setPromptDraft] = useState(DEFAULT_SYSTEM_PROMPT);
  const [enterDraft, setEnterDraft] = useState(true);
  const [canvasDraft, setCanvasDraft] = useState(true);
  const [themeDraft, setThemeDraft] = useState<"dark" | "light" | "system">("light");
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [fontFamily, setFontFamily] = useState<"sans" | "mono" | "serif">("sans");
  const [chatDensity, setChatDensity] = useState<"cozy" | "compact">("cozy");
  const [topP, setTopP] = useState<number>(0.9);
  const [autoRead, setAutoRead] = useState<boolean>(false);
  const [ttsVoice, setTtsVoice] = useState<string>("");
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // New features state
  const [codeExecution, setCodeExecution] = useState<boolean>(true);
  const [fileCreation, setFileCreation] = useState<boolean>(true);
  const [webSearch, setWebSearch] = useState<boolean>(true);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(true);
  const [memoryText, setMemoryText] = useState<string>("");
  const [shareData, setShareData] = useState<boolean>(false);
  const [localCache, setLocalCache] = useState<boolean>(true);
  const [uiLang, setUiLang] = useState<Lang>("en");
  const [composerMenu, setComposerMenu] = useState<ComposerMenu>("none");
  const [toolsAllowed, setToolsAllowed] = useState(true);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  // Multi-agent collaborate (capped at available provider models)
  const [agents, setAgents] = useState<AgentRoleDef[]>(() =>
    DEFAULT_AGENTS.map((a) => ({ ...a, task: a.task || "", enabled: true }))
  );
  const [multiAgentEnabled, setMultiAgentEnabled] = useState(true);
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);
  const [activeAgentLabel, setActiveAgentLabel] = useState<string | null>(null);
  const [globalDrag, setGlobalDrag] = useState(false);
  const dragDepthRef = useRef(0);

  // Focus mode: floating assets + technical canvas
  const [focusAssets, setFocusAssets] = useState<
    { id: string; text: string }[]
  >([]);
  const [focusCanvasOpen, setFocusCanvasOpen] = useState(false);
  const [focusCanvasText, setFocusCanvasText] = useState("");
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    PROBLEM_TEMPLATES[0]?.id ?? null
  );

  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const composerMenuRef = useRef<HTMLDivElement>(null);

  const i = useMemo(() => i18n(uiLang), [uiLang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fontSize = (localStorage.getItem("aura-font-size") as "sm" | "base" | "lg" | "xl") || "base";
    const fontFamily = (localStorage.getItem("aura-font-family") as "sans" | "mono" | "serif") || "sans";
    const chatDensity = (localStorage.getItem("aura-chat-density") as "cozy" | "compact") || "cozy";
    const topP = Number(localStorage.getItem("aura-top-p") || "0.9");
    setFontSize(fontSize);
    setFontFamily(fontFamily);
    setChatDensity(chatDensity);
    setTopP(topP);
    setAutoRead(localStorage.getItem("aura-auto-read") === "true");
    setTtsVoice(localStorage.getItem("aura-tts-voice") || "");
    setWordWrap(localStorage.getItem("aura-word-wrap") !== "false");

    // Load new features
    setCodeExecution(localStorage.getItem("aura-code-execution") !== "false");
    setFileCreation(localStorage.getItem("aura-file-creation") !== "false");
    setWebSearch(localStorage.getItem("aura-web-search") !== "false");
    setMemoryEnabled(localStorage.getItem("aura-memory-enabled") !== "false");
    setMemoryText(localStorage.getItem("aura-memory-text") || "");
    setShareData(localStorage.getItem("aura-share-data") === "true");
    setLocalCache(localStorage.getItem("aura-local-cache") !== "false");
    setToolsAllowed(localStorage.getItem("aura-tools-allowed") !== "false");

    const storedLang = localStorage.getItem("aura-ui-lang") as Lang | null;
    const nextLang =
      storedLang === "en" || storedLang === "id"
        ? storedLang
        : detectDefaultLang();
    setUiLang(nextLang);
    document.documentElement.lang = nextLang;

    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const toggleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = stripCodeBlocks(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (ttsVoice) {
        const voiceObj = window.speechSynthesis.getVoices().find((v) => v.name === ttsVoice);
        if (voiceObj) utterance.voice = voiceObj;
      }
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
      setSpeakingMsgId(msgId);
      window.speechSynthesis.speak(utterance);
    }
  };

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (composerMenu === "none") return;
    const onDown = (e: MouseEvent) => {
      if (!composerMenuRef.current?.contains(e.target as Node)) {
        setComposerMenu("none");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [composerMenu]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const toolsAllowed = localStorage.getItem("aura-tools-allowed") !== "false";
    setToolsAllowed(toolsAllowed);
  }, []);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) || null,
    [chats, activeId]
  );

  // Stable history: pin first, then createdAt. Never reshuffle by last message.
  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? chats.filter((c) => c.title.toLowerCase().includes(q))
      : chats;
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const ac = a.createdAt || a.updatedAt;
      const bc = b.createdAt || b.updatedAt;
      return new Date(bc).getTime() - new Date(ac).getTime();
    });
  }, [chats, query]);

  const allCodes = useMemo(
    () =>
      messages.flatMap((m) =>
        m.role === "assistant" ? extractCodeBlocks(m.content) : []
      ),
    [messages]
  );

  /** Codes for live preview — messages + Focus canvas (template scaffolds) */
  const previewCodes = useMemo(() => {
    const fromCanvas = focusCanvasText
      ? extractCodeBlocks(focusCanvasText)
      : [];
    if (!fromCanvas.length) return allCodes;
    // Prefer newest canvas scaffolds when previewing templates before a reply
    const seen = new Set(allCodes.map((c) => c.code.slice(0, 80)));
    const extra = fromCanvas.filter((c) => !seen.has(c.code.slice(0, 80)));
    return [...allCodes, ...extra];
  }, [allCodes, focusCanvasText]);


  const followUps = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || last.streaming || loading) return [];
    return suggestFollowUps(last.content).slice(0, 3);
  }, [messages, loading]);

  const availableModelList = useMemo(() => {
    if (user?.availableModels?.length) {
      return ALL_MODELS.filter((m) => user.availableModels!.includes(m.id));
    }
    return user?.hasApiKey ? ALL_MODELS : [];
  }, [user]);

  const agentLimit = useMemo(() => {
    if (!user?.availableModels?.length) return 1;
    const pseudo: ProviderKeys = {};
    if (user.providers) {
      for (const p of PROVIDERS) {
        if (user.providers[p.id]) pseudo[p.id] = "1";
      }
    }
    return Math.min(MAX_AGENTS, maxAgentsForKeys(pseudo));
  }, [user]);

  const currentModel =
    ALL_MODELS.find((m) => m.id === model) ||
    availableModelList[0] ||
    ALL_MODELS[0];
  const currentMode = modeById(mode);
  const canvasIsHtml = useMemo(() => {
    const h = htmlFromCanvas(focusCanvasText);
    return (
      h.includes("<html") ||
      h.includes("<!DOCTYPE") ||
      h.includes("<div") ||
      h.includes("<section") ||
      focusCanvasText.includes("```html")
    );
  }, [focusCanvasText]);

  const templateCategories = useMemo(
    () => [
      { id: "__all__", label: i.all },
      ...Array.from(new Set(PROBLEM_TEMPLATES.map((t) => t.category))).map(
        (c) => ({ id: c, label: c })
      ),
    ],
    [i.all]
  );

  const visibleTemplates = useMemo(() => {
    if (templateCat === "__all__") return [...PROBLEM_TEMPLATES];
    return PROBLEM_TEMPLATES.filter((t) => t.category === templateCat);
  }, [templateCat]);

  useEffect(() => {
    if (!visibleTemplates.some((t) => t.id === previewTemplateId)) {
      const newTemplateId = visibleTemplates[0]?.id ?? null;
      setPreviewTemplateId(newTemplateId);
    }
  }, [visibleTemplates, previewTemplateId]);

  function setLanguage(next: Lang) {
    setUiLang(next);
    localStorage.setItem("aura-ui-lang", next);
    document.documentElement.lang = next;
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  function setThemeCookie(themeName: string) {
    if (typeof window === "undefined") return;
    const resolved = resolveThemeMode(themeName);
    document.cookie = `theme=${resolved}; path=/; max-age=31536000; SameSite=Lax`;
  }

  function applyTheme(themeName: string) {
    const resolved = resolveThemeMode(themeName);
    const root = document.documentElement;
    root.classList.add("theme-animating");
    root.setAttribute("data-theme", resolved);
    setThemeCookie(themeName);
    window.setTimeout(() => root.classList.remove("theme-animating"), 320);
  }

  useEffect(() => {
    const active = themeDraft === "system" ? "system" : themeDraft;
    if (active !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [themeDraft]);

  function pickTheme(next: "dark" | "light" | "system") {
    setThemeDraft(next);
    applyTheme(next);
    setThemeCookie(next);
  }

  function applyUser(u: User) {
    setUser(u);
    const avail =
      u.availableModels && u.availableModels.length
        ? u.availableModels
        : GROQ_MODELS.map((m) => m.id);
    const nextModel =
      u.model && avail.includes(u.model) ? u.model : avail[0] || DEFAULT_MODEL;
    setModel(nextModel);
    setNameDraft(u.name);
    setTempDraft(u.temperature ?? 0.7);
    setTokensDraft(u.maxTokens ?? 4096);
    setPromptDraft(u.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    setEnterDraft(u.sendWithEnter ?? true);
    setCanvasDraft(u.showCanvas ?? true);
    setThemeDraft((u.theme as "dark" | "light" | "system") || "light");
    applyTheme(u.theme || "light");
    setThemeCookie(u.theme || "light");
    // Sync agent models to available set
    setAgents((prev) =>
      prev.map((a, idx) => ({
        ...a,
        model: avail.includes(a.model)
          ? a.model
          : avail[idx % avail.length] || a.model,
      }))
    );
  }

  async function loadChat(id: string) {
    const res = await fetch(`/api/chats/${id}`);
    if (!res.ok) return;
    const { chat } = await res.json();
    setMessages(
      (chat.messages || []).map(
        (m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        })
      )
    );
    if (chat.mode) setMode(chat.mode as WorkModeId);
    setActiveCodeId(null);
    setError(null);
  }

  const bootstrap = useCallback(async () => {
    const startTime = Date.now();
    const me = await fetch("/api/auth/me");
    if (!me.ok) {
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      } else {
        router.replace("/login");
      }
      return;
    }
    const { user: u } = await me.json();
    applyUser(u);

    const listRes = await fetch("/api/chats");
    const listData = await listRes.json();
    const list: ChatItem[] = listData.chats || [];
    setChats(list);

    if (list.length === 0) {
      const created = await fetch("/api/chats", { method: "POST" });
      const { chat } = await created.json();
      setChats([chat]);
      setActiveId(chat.id);
      setMessages([]);
    } else {
      setActiveId(list[0].id);
      setMode((list[0].mode as WorkModeId) || "auto");
      await loadChat(list[0].id);
    }

    const elapsed = Date.now() - startTime;
    const minDelay = 1800;
    const delayRemaining = Math.max(0, minDelay - elapsed);
    setTimeout(() => {
      setReady(true);
    }, delayRemaining);
  }, [router]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Global drag-and-drop from outside the browser (desktop files)
  useEffect(() => {
    function hasFiles(e: DragEvent) {
      return Array.from(e.dataTransfer?.types || []).includes("Files");
    }
    function onDragEnter(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setGlobalDrag(true);
    }
    function onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    }
    function onDragLeave(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setGlobalDrag(false);
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      dragDepthRef.current = 0;
      setGlobalDrag(false);
      if (e.dataTransfer?.files?.length) {
        ingestFiles(e.dataTransfer.files);
      }
    }
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSheet((s) => (s === "command" ? "none" : "command"));
        setCmdQuery("");
      }
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        newChat();
      }
      if (e.key === "Escape") {
        setSheet("none");
        setEditingMsgId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function selectChat(id: string) {
    setActiveId(id);
    await loadChat(id);
    setSheet("none");
    setViewTab("collaborate");
    setAssistantOpen(true);
  }

  async function newChat(nextMode?: WorkModeId) {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode || mode }),
    });
    const { chat } = await res.json();
    // New chats prepend once; list otherwise stays stable by createdAt
    setChats((prev) => [chat, ...prev.filter((c) => c.id !== chat.id)]);
    setActiveId(chat.id);
    setMessages([]);
    setActiveCodeId(null);
    setError(null);
    setInput("");
    setFiles([]);
    if (nextMode) setMode(nextMode);
    setViewTab("collaborate");
    setAssistantOpen(true);
    inputRef.current?.focus();
  }

  async function deleteChat(id: string) {
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        fetch("/api/chats", { method: "POST" })
          .then((r) => r.json())
          .then(({ chat }) => {
            setChats([chat]);
            setActiveId(chat.id);
            setMessages([]);
          });
        return [];
      }
      if (activeId === id) {
        setActiveId(next[0].id);
        loadChat(next[0].id);
      }
      return next;
    });
    showToast(i.deleted);
  }

  async function togglePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/chats/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    const data = await res.json();
    if (res.ok) {
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned: data.chat.pinned } : c))
      );
    }
  }

  async function saveRename(id: string) {
    const title = renameText.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    const res = await fetch(`/api/chats/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    }
    setRenamingId(null);
  }

  async function changeMode(next: WorkModeId) {
    setMode(next);
    if (activeId) {
      await fetch(`/api/chats/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      setChats((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, mode: next } : c))
      );
    }
    showToast(`${modeById(next).label} ${i.modeSuffix}`);
  }

  function exportActive() {
    if (!activeChat || messages.length === 0) {
      showToast(i.nothingToExport);
      return;
    }
    const md = exportChatMarkdown(activeChat.title, messages);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeChat.title.replace(/[^\w\- ]+/g, "").trim() || "aura"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(i.exported);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function openSettings() {
    if (!user) return;
    setNameDraft(user.name);
    setTempDraft(user.temperature);
    setTokensDraft(user.maxTokens);
    setPromptDraft(user.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    setEnterDraft(user.sendWithEnter);
    setCanvasDraft(user.showCanvas);
    setThemeDraft((user.theme as "dark" | "light" | "system") || "light");
    applyTheme(user.theme || "light");
    if (typeof window !== "undefined") {
      const fontSize = (localStorage.getItem("aura-font-size") as "sm" | "base" | "lg" | "xl") || "base";
      const fontFamily = (localStorage.getItem("aura-font-family") as "sans" | "mono" | "serif") || "sans";
      const chatDensity = (localStorage.getItem("aura-chat-density") as "cozy" | "compact") || "cozy";
      setFontSize(fontSize);
      setFontFamily(fontFamily);
      setChatDensity(chatDensity);
      setTopP(Number(localStorage.getItem("aura-top-p") || "0.9"));
      setAutoRead(localStorage.getItem("aura-auto-read") === "true");
      setTtsVoice(localStorage.getItem("aura-tts-voice") || "");
      setWordWrap(localStorage.getItem("aura-word-wrap") !== "false");
      setCodeExecution(localStorage.getItem("aura-code-execution") !== "false");
      setFileCreation(localStorage.getItem("aura-file-creation") !== "false");
      setWebSearch(localStorage.getItem("aura-web-search") !== "false");
      setMemoryEnabled(localStorage.getItem("aura-memory-enabled") !== "false");
      setMemoryText(localStorage.getItem("aura-memory-text") || "");
      setShareData(localStorage.getItem("aura-share-data") === "true");
      setLocalCache(localStorage.getItem("aura-local-cache") !== "false");
    }
    setApiKeyDraft("");
    setProviderOverride("auto");
    setSettingsTab("general");
    setSheet("settings");
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("aura-font-size", fontSize);
        localStorage.setItem("aura-font-family", fontFamily);
        localStorage.setItem("aura-chat-density", chatDensity);
        localStorage.setItem("aura-top-p", String(topP));
        localStorage.setItem("aura-auto-read", String(autoRead));
        localStorage.setItem("aura-tts-voice", ttsVoice);
        localStorage.setItem("aura-word-wrap", String(wordWrap));
        localStorage.setItem("aura-code-execution", String(codeExecution));
        localStorage.setItem("aura-file-creation", String(fileCreation));
        localStorage.setItem("aura-web-search", String(webSearch));
        localStorage.setItem("aura-memory-enabled", String(memoryEnabled));
        localStorage.setItem("aura-memory-text", memoryText);
        localStorage.setItem("aura-share-data", String(shareData));
        localStorage.setItem("aura-local-cache", String(localCache));
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameDraft,
          model,
          theme: themeDraft,
          temperature: tempDraft,
          maxTokens: tokensDraft,
          systemPrompt: promptDraft,
          sendWithEnter: enterDraft,
          showCanvas: canvasDraft,
          ...(apiKeyDraft.trim()
            ? {
                apiKey: apiKeyDraft.trim(),
                providerOverride,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      applyUser(data.user);
      applyTheme(themeDraft);
      setApiKeyDraft("");
      setProviderOverride("auto");
      setSheet("none");
      showToast(i.saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function clearAllChats() {
    if (!confirm("Are you sure you want to delete all conversations? This cannot be undone.")) return;
    setSaving(true);
    try {
      await Promise.all(chats.map(c => fetch(`/api/chats/${c.id}`, { method: "DELETE" })));
      const res = await fetch("/api/chats", { method: "POST" });
      const { chat } = await res.json();
      setChats([chat]);
      setActiveId(chat.id);
      setMessages([]);
      showToast(i.allChatsCleared);
    } catch {
      showToast(i.failedClearChats);
    } finally {
      setSaving(false);
    }
  }

  function exportAllData() {
    if (messages.length === 0) {
      showToast(i.noMessagesToExport);
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chat-export-${activeId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(i.chatExported);
  }

  async function changeModel(next: string) {
    setModel(next);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: next }),
    });
    const data = await res.json();
    if (res.ok) applyUser(data.user);
    setSheet("none");
  }

  async function quickTheme(theme: "dark" | "light" | "system") {
    pickTheme(theme);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
    const data = await res.json();
    if (res.ok) applyUser(data.user);
    else applyTheme(theme);
  }

  const resolvedTheme = resolveThemeMode(user?.theme || themeDraft);

  function composeContent(text: string) {
    if (!files.length) return text;
    const attached = files
      .map(
        (f) =>
          `Attached file: ${f.name}\n\`\`\`${extOf(f.name).toLowerCase()}\n${f.text}\n\`\`\``
      )
      .join("\n\n");
    return `${text}\n\n${attached}`.trim();
  }

  function applyFocusOutcome(userText: string, assistantText: string) {
    if (viewTab !== "focus") return;
    const technical =
      detectTechnicalIntent(userText) ||
      extractCodeBlocks(assistantText).length > 0 ||
      assistantText.length > 900;
    if (technical) {
      const payload = extractCanvasPayload(assistantText);
      if (payload) {
        setFocusCanvasText(payload);
        setFocusCanvasOpen(true);
      }
      return;
    }
    const assets = extractKeyAssets(assistantText);
    if (assets.length) {
      setFocusAssets((prev) => {
        const merged = [...assets, ...prev];
        const seen = new Set<string>();
        return merged
          .filter((a) => {
            const k = a.text.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .slice(0, 12);
      });
    }
  }

  async function send(opts?: { text?: string; replaceFromId?: string }) {
    if (!activeId || loading) return;
    const raw = (opts?.text ?? input).trim();
    if (!raw && !files.length) return;

    if (!user?.hasApiKey) {
      openSettings();
      setSettingsTab("account");
      setError(i.addApiKeyError);
      return;
    }

    let finalRaw = raw;
    if (activeToolId) {
      const tool = CREATIVE_TOOLS.find((t) => t.id === activeToolId);
      if (tool) {
        finalRaw = `${tool.prompt}${raw}`;
      }
    }

    const content = composeContent(
      finalRaw || i.reviewAttached
    );
    const focusKind =
      viewTab === "focus" && detectTechnicalIntent(content)
        ? "technical"
        : "general";
    const activeAgents =
      viewTab === "collaborate" && multiAgentEnabled
        ? agents
            .filter((a) => a.enabled !== false)
            .slice(0, agentLimit)
            .map((a) => ({
              id: a.id,
              name: a.name,
              model: a.model,
              role: a.role,
              deliverable: a.deliverable,
              defaultTask: a.defaultTask,
              task: a.task || "",
            }))
        : [];

    setInput("");
    setFiles([]);
    setActiveToolId(null);
    setError(null);
    setComposerMenu("none");
    setLoading(true);
    setAssistantOpen(true);
    setActiveAgentLabel(
      activeAgents.length > 0 ? i.multiAgentRunning : null
    );

    const tmpUserId = `tmp_u_${Date.now()}`;
    const tmpAsstId = `tmp_a_${Date.now()}`;

    if (!opts?.replaceFromId) {
      setMessages((prev) => [
        ...prev,
        { id: tmpUserId, role: "user", content },
        { id: tmpAsstId, role: "assistant", content: "", streaming: true },
      ]);
    } else {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === opts.replaceFromId);
        if (idx < 0) return prev;
        return [
          ...prev.slice(0, idx),
          { id: opts.replaceFromId!, role: "user", content },
          { id: tmpAsstId, role: "assistant", content: "", streaming: true },
        ];
      });
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          chatId: activeId,
          content,
          model,
          mode,
          stream: true,
          replaceFromId: opts?.replaceFromId,
          uiLanguage: uiLang,
          viewTab: viewTab,
          focusKind,
          agents: activeAgents.length > 0 ? activeAgents : undefined,
          customMemory: localStorage.getItem("aura-memory-enabled") === "true"
            ? (localStorage.getItem("aura-memory-text") || "")
            : "",
        }),
      });

      const ctype = res.headers.get("content-type") || "";
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || i.requestFailed);
      }

      if (!ctype.includes("text/event-stream")) {
        const data = await res.json();
        await loadChat(activeId);
        if (data.title) {
          setChats((prev) =>
            prev.map((c) =>
              c.id === activeId ? { ...c, title: data.title } : c
            )
          );
        }
        const finalText = data.assistantMessage?.content || "";
        const codes = extractCodeBlocks(finalText);
        if (codes.length) setActiveCodeId(codes[codes.length - 1].id);
        applyFocusOutcome(content, finalText);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error(i.noStream);
      const decoder = new TextDecoder();
      let buffer = "";
      let streamed = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload);
              if (evt.type === "meta" && evt.title) {
                setChats((prev) =>
                  prev.map((c) =>
                    c.id === activeId ? { ...c, title: evt.title } : c
                  )
                );
              }
              if (evt.type === "agent_start" && evt.agent?.name) {
                const total = evt.agent.total || agents.length || 1;
                const idx =
                  typeof evt.agent.index === "number" ? evt.agent.index + 1 : 1;
                const role = evt.agent.role ? ` · ${evt.agent.role}` : "";
                setActiveAgentLabel(
                  `${evt.agent.name}${role} (${idx}/${total})`
                );
              }
              if (evt.type === "delta" && evt.content) {
                streamed += evt.content;
                const snap = streamed;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tmpAsstId
                      ? { ...m, content: snap, streaming: true }
                      : m
                  )
                );
              }
              if (evt.type === "done") {
                const finalContent =
                  evt.assistantMessage?.content || streamed;
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id === tmpAsstId) {
                      return {
                        id: evt.assistantMessage?.id || m.id,
                        role: "assistant",
                        content: finalContent,
                        streaming: false,
                      };
                    }
                    if (m.id === tmpUserId && evt.userMessage?.id) {
                      return { ...m, id: evt.userMessage.id };
                    }
                    return m;
                  })
                );
                if (localStorage.getItem("aura-auto-read") === "true") {
                  toggleSpeak(evt.assistantMessage?.id || tmpAsstId, finalContent);
                }
                const codes = extractCodeBlocks(finalContent);
                if (codes.length) setActiveCodeId(codes[codes.length - 1].id);
                applyFocusOutcome(content, finalContent);
                // Update title in place — do not move chat to top of history
                if (evt.title) {
                  setChats((prev) =>
                    prev.map((c) =>
                      c.id === activeId ? { ...c, title: evt.title } : c
                    )
                  );
                }
              }
              if (evt.type === "error") {
                throw new Error(evt.error || "Stream error");
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                (parseErr.message === "Stream error" ||
                  parseErr.message.includes("API"))
              ) {
                throw parseErr;
              }
            }
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Generation stopped.");
        setMessages((prev) =>
          prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
        );
      } else {
        setError(e instanceof Error ? e.message : "Failed");
        if (activeId) await loadChat(activeId);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      setEditingMsgId(null);
      setActiveAgentLabel(null);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function regenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    await send({ text: lastUser.content, replaceFromId: lastUser.id });
  }

  async function submitEdit(msgId: string) {
    const text = editText.trim();
    if (!text) return;
    await send({ text, replaceFromId: msgId });
  }

  async function ingestFiles(list: FileList | File[] | null) {
    if (!list || (Array.isArray(list) ? list.length === 0 : list.length === 0))
      return;
    const arr = Array.from(list as FileList);
    const next: AttachFile[] = [];
    let skipped = 0;
    for (const file of arr) {
      const isImage = file.type.startsWith("image/");
      const maxBytes = isImage ? 2_000_000 : 400_000;
      if (file.size > maxBytes) {
        skipped += 1;
        setError(
          i.fileTooLarge
            .replace("{name}", file.name)
            .replace("{max}", isImage ? "2MB" : "400KB")
        );
        continue;
      }
      let text = "";
      if (isImage) {
        // Images: attach as data-URL note so the model still sees context
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("read failed"));
          reader.readAsDataURL(file);
        }).catch(() => "");
        text = dataUrl
          ? `[Image attached: ${file.name} · ${formatBytes(file.size)}]\n${dataUrl.slice(0, 200)}…\n(Describe this image context for the assistant.)`
          : `[Image attached: ${file.name}]`;
      } else {
        text = await file.text();
      }
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        text,
        size: file.size,
        kind: isImage ? "other" : fileKind(file.name),
      });
    }
    if (next.length) {
      setFiles((prev) => [...prev, ...next]);
      showToast(
        next.length === 1
          ? i.fileAttachedOne.replace("{name}", next[0].name)
          : i.fileAttachedMany.replace("{n}", String(next.length))
      );
    } else if (!skipped) {
      showToast(i.noFilesAdded);
    }
    if (fileRef.current) fileRef.current.value = "";
    if (photoRef.current) photoRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function copyText(text: string, openCanvasOnFocus = false) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(i.copied);
    setTimeout(() => setCopied(false), 1200);
    if (openCanvasOnFocus && viewTab === "focus") {
      const payload = extractCanvasPayload(text) || text;
      setFocusCanvasText(payload);
      setFocusCanvasOpen(true);
    }
  }

  function injectToFocusCanvas(text: string) {
    const payload = extractCanvasPayload(text) || text;
    setFocusCanvasText(payload);
    setFocusCanvasOpen(true);
    if (viewTab !== "focus") setViewTab("focus");
    showToast(i.injectToCanvas);
  }

  function applyTemplate(t: ProblemTemplate) {
    setMode(t.mode);
    setSheet("none");
    setInput("");
    // Always open Focus canvas so user edits the real template (not chat send)
    const canvasBody =
      t.kind === "website"
        ? canvasFromHtml(t.scaffold)
        : t.kind === "code"
          ? `\`\`\`markdown\n${t.scaffold}\n\`\`\``
          : t.scaffold;
    setFocusCanvasText(canvasBody);
    setFocusCanvasOpen(true);
    setViewTab("focus");
    setAssistantOpen(false);
    setShowPreview(false);
    setActiveCodeId(null);
    showToast(i.templateOpenedCanvas);
  }

  function updateAgent(id: string, patch: Partial<AgentRoleDef>) {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  }

  function addAgent() {
    const limit = agentLimit;
    if (agents.length >= limit) {
      showToast(i.agentLimitReached.replace("{n}", String(limit)));
      return;
    }
    const slot = createAgentSlot(agents, {
      max: limit,
      availableModelIds: availableModelList.map((m) => m.id),
    });
    if (!slot) {
      showToast(i.agentLimitReached.replace("{n}", String(limit)));
      return;
    }
    setAgents((prev) => [...prev, slot]);
  }

  function removeAgent(id: string) {
    setAgents((prev) =>
      prev.length <= 1 ? prev : prev.filter((a) => a.id !== id)
    );
  }

  const cmdItems = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    const items = [
      {
        id: "new",
        label: i.newConversation,
        hint: "⌘N",
        run: () => {
          newChat();
          setSheet("none");
        },
      },
      {
        id: "templates",
        label: i.templates,
        hint: i.templatesSub,
        run: () => setSheet("templates"),
      },
      {
        id: "export",
        label: i.exportChat,
        hint: i.export,
        run: () => {
          exportActive();
          setSheet("none");
        },
      },
      {
        id: "settings",
        label: i.settings,
        hint: i.tabAccount,
        run: () => openSettings(),
      },
      {
        id: "model",
        label: i.modelTitle,
        hint: currentModel.label,
        run: () => setSheet("model"),
      },
      ...WORK_MODES.map((m) => ({
        id: `mode-${m.id}`,
        label: m.label,
        hint: m.short,
        run: () => {
          changeMode(m.id as WorkModeId);
          setSheet("none");
        },
      })),
    ];
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmdQuery, currentModel.label, i]);

  // Recompute greeting periodically (hour boundaries)
  useEffect(() => {
    setGreetingTick((t) => t + 1);
    const id = window.setInterval(() => {
      setGreetingTick((t) => t + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const getGreeting = () => {
    void greetingTick; // depend on tick so hour changes re-render
    const hrs = new Date().getHours();
    const displayName = user?.name ? `, ${user.name}` : "";
    // Natural day parts: afternoon until 18:00, then evening
    if (hrs >= 5 && hrs < 12) return `${i.goodMorning}${displayName}`;
    if (hrs >= 12 && hrs < 18) return `${i.goodAfternoon}${displayName}`;
    if (hrs >= 18 && hrs < 22) return `${i.goodEvening}${displayName}`;
    return `${i.goodNight}${displayName}`;
  };

  const keyClassify = apiKeyDraft.trim()
    ? classifyApiKey(apiKeyDraft)
    : null;

  const isFocus = viewTab === "focus";

  return (
    <div className="app-shell relative h-screen w-screen overflow-hidden">
      <AnimatePresence>
        {(!ready || !user) && (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]"
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                animate={{
                  scale: [0.96, 1.04, 0.96],
                  opacity: [0.88, 1, 0.88],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex items-center justify-center"
              >
                <ConstructIcon branded className="h-28 w-28 sm:h-36 sm:w-36" />
              </motion.div>
              <p className="text-[13px] font-semibold tracking-wide text-[var(--on-surface-variant)] animate-pulse">
                {i.constructingWorkspace}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {user && (
        <div className="relative flex h-full w-full flex-col">
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPTED_MEDIA}
        className="hidden"
        onChange={(e) => {
          ingestFiles(e.target.files);
          setComposerMenu("none");
        }}
      />
      <input
        ref={photoRef}
        type="file"
        multiple
        accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.svg"
        className="hidden"
        onChange={(e) => {
          ingestFiles(e.target.files);
          setComposerMenu("none");
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          ingestFiles(e.target.files);
          setComposerMenu("none");
        }}
      />

      {/* Left rail — desktop; hidden on portrait (use mobile bottom bar) */}
      <nav
        className={`glass-rail desktop-rail fixed bottom-4 left-4 top-[4.75rem] z-50 flex w-20 flex-col items-center gap-4 rounded-2xl py-7 transition-all duration-300 ${isFocus ? "-translate-x-28 opacity-0 pointer-events-none" : ""}`}
      >
        <button
          type="button"
          className={`rail-btn ${viewTab === "collaborate" && sheet === "none" ? "active" : ""}`}
          title={i.workspace}
          onClick={() => {
            setViewTab("collaborate");
            setSheet("none");
            setAssistantOpen(true);
          }}
        >
          <LayoutDashboard className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={`rail-btn ${sheet === "library" ? "active" : ""}`}
          title={i.history}
          onClick={() => setSheet(sheet === "library" ? "none" : "library")}
        >
          <FolderOpen className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={`rail-btn ${sheet === "templates" ? "active" : ""}`}
          title={i.templates}
          onClick={() =>
            setSheet(sheet === "templates" ? "none" : "templates")
          }
        >
          <Wand2 className="h-5 w-5" />
        </button>
        <div className="mt-auto" />
      </nav>

      {/* Portrait / mobile bottom navigation */}
      <nav
        className={`mobile-bottom-nav ${isFocus ? "is-hidden" : ""}`}
        aria-label="Mobile navigation"
      >
        <button
          type="button"
          className={`mobile-nav-item ${viewTab === "collaborate" && sheet === "none" ? "active" : ""}`}
          onClick={() => {
            setViewTab("collaborate");
            setSheet("none");
            setAssistantOpen(true);
          }}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>{i.collaborate}</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${viewTab === "focus" ? "active" : ""}`}
          onClick={() => {
            setViewTab("focus");
            setSheet("none");
          }}
        >
          <Target className="h-5 w-5" />
          <span>{i.focus}</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${sheet === "templates" ? "active" : ""}`}
          onClick={() =>
            setSheet(sheet === "templates" ? "none" : "templates")
          }
        >
          <Wand2 className="h-5 w-5" />
          <span>{i.templates}</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${sheet === "library" ? "active" : ""}`}
          onClick={() => setSheet(sheet === "library" ? "none" : "library")}
        >
          <FolderOpen className="h-5 w-5" />
          <span>{i.history}</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${sheet === "settings" ? "active" : ""}`}
          onClick={() => openSettings()}
        >
          <Settings className="h-5 w-5" />
          <span>{i.settings}</span>
        </button>
      </nav>

      {/* Full-width top navbar */}
      <header className={`glass-header fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-between gap-4 px-5 md:px-8 transition-all duration-300 ${isFocus ? "-translate-y-20 opacity-0 pointer-events-none" : ""}`}>
        <div className="flex min-w-0 flex-1 items-center gap-6 md:gap-8">
          <h1 className="shrink-0 text-[20px] font-semibold tracking-[-0.03em] text-[var(--on-surface)] md:text-[22px]">
            Construct
          </h1>
          <nav className="hidden items-center gap-5 sm:flex md:gap-6">
            <button
              type="button"
              className={`nav-tab ${viewTab === "collaborate" ? "active" : ""}`}
              onClick={() => {
                setViewTab("collaborate");
                setAssistantOpen(true);
              }}
            >
              {i.collaborate}
            </button>
            <button
              type="button"
              className={`nav-tab ${viewTab === "focus" ? "active" : ""}`}
              onClick={() => {
                setViewTab("focus");
                setAssistantOpen(true);
              }}
            >
              {i.focus}
            </button>
          </nav>
          {activeChat && (
            <p className="hidden min-w-0 max-w-[220px] truncate text-[13px] text-[var(--on-surface-variant)] xl:block">
              {activeChat.title}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="btn-ghost hidden sm:inline-flex"
            onClick={() => setSheet("model")}
            title={i.aiModel}
          >
            <Cpu className="h-3.5 w-3.5 opacity-60" />
            <span className="max-w-[140px] truncate">{currentModel.label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
          <button
            type="button"
            className="icon-btn"
            title={i.toggleTheme}
            onClick={() =>
              quickTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="icon-btn"
            title={i.exportChat}
            onClick={exportActive}
          >
            <Download className="h-4 w-4" />
          </button>
          <motion.button
            whileTap={{ scale: 0.88, rotate: 6 }}
            whileHover={{ scale: 1.06 }}
            type="button"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--outline-variant)] bg-[var(--surface-dim)] text-[11px] font-semibold hover:border-[var(--primary)] hover:bg-[var(--surface-container)] transition-colors focus:outline-none"
            title={`${user.name} (${user.email}) - ${i.settings}`}
            onClick={openSettings}
          >
            {user.name.slice(0, 1).toUpperCase()}
          </motion.button>
        </div>
      </header>

      {/* Centered chat — main conversation */}
      <main
        className={`chat-main absolute inset-0 flex flex-col pt-16 transition-all duration-300 ${
          isFocus ? "pl-3 pr-3 sm:pl-8 sm:pr-8 is-focus-main" : "pl-3 sm:pl-24"
        } ${isFocus && focusCanvasOpen ? "focus-has-canvas" : ""}`}
      >
        <div
          className={
            isFocus && focusCanvasOpen
              ? "focus-split"
              : "flex flex-1 min-h-0 flex-col"
          }
        >
        <div
          className={
            isFocus && focusCanvasOpen
              ? "focus-split-chat"
              : "flex flex-1 min-h-0 flex-col"
          }
        >
        <div
          ref={listRef}
          className={`chat-scroll scroll-thin flex-1 overflow-y-auto overflow-x-hidden ${chatDensity === "compact" ? "chat-dense" : ""}`}
        >
          <div className="chat-column">
            {messages.length === 0 && !loading ? (
              <div className="chat-empty fade-up">
                <div className="mb-6 flex items-center justify-center">
                  <ConstructIcon branded className="h-20 w-20 sm:h-24 sm:w-24" />
                </div>
                <h2 className="chat-empty-title">{getGreeting()}</h2>
                <p className="chat-empty-sub">{i.emptySubtitle}</p>
                {isFocus && (
                  <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                    {i.focusMode}
                  </p>
                )}
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {i.startChatting}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setSheet("templates")}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {i.templates}
                  </button>
                </div>
                <div className="empty-template-row">
                  {PROBLEM_TEMPLATES.filter((t) =>
                    ["website-landing", "analyze-metrics", "code-debug", "product-prd"].includes(
                      t.id
                    )
                  ).map((t) => {
                    const Icon = TEMPLATE_KIND_ICONS[t.kind] || FileText;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className="empty-template-chip"
                        onClick={() => applyTemplate(t)}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{t.title}</span>
                      </button>
                    );
                  })}
                </div>
                {!user.hasApiKey && (
                  <button
                    type="button"
                    className="mt-6 text-[13px] font-medium text-[var(--on-surface-variant)] underline-offset-4 hover:text-[var(--on-surface)] hover:underline"
                    onClick={openSettings}
                  >
                    {i.addApiKey}
                  </button>
                )}
              </div>
            ) : (
              <div className="chat-messages">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const body =
                    msg.role === "assistant"
                      ? stripCodeBlocks(msg.content) || msg.content
                      : msg.content;
                  const isEditing = editingMsgId === msg.id;
                  const codes =
                    msg.role === "assistant" ? extractCodeBlocks(msg.content) : [];

                  return (
                    <div
                      key={msg.id}
                      className={`chat-row group ${isUser ? "is-user" : "is-ai"}`}
                    >
                      {!isUser && (
                        <div className="chat-avatar" aria-hidden>
                          <ConstructIcon className="h-4 w-4" />
                        </div>
                      )}
                      <div className={`chat-bubble-wrap ${isUser ? "items-end" : "items-start"}`}>
                        <div className="chat-role flex items-center gap-1.5">
                          {isUser ? i.you : i.brand}
                          {!isUser && viewTab === "collaborate" && multiAgentEnabled && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tertiary-container)] px-2 py-0.5 text-[9px] font-semibold text-[var(--on-tertiary-container)] border border-[var(--on-tertiary-container)]/10 lowercase tracking-normal">
                              <UsersRound className="h-2.5 w-2.5 text-blue-500" />
                              {activeAgentLabel || i.multiAgentOn}
                            </span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="chat-edit">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-[88px] w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none"
                              autoFocus
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => setEditingMsgId(null)}
                              >
                                {i.cancel}
                              </button>
                              <button
                                type="button"
                                className="btn-primary !h-9"
                                onClick={() => submitEdit(msg.id)}
                              >
                                {i.saveAndSend}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-ai"} thread-fs-${fontSize} thread-ff-${fontFamily}`}
                          >
                            {body ? (
                              isUser ? (
                                <div className="user-msg-body">
                                  {formatUserMessage(body)
                                    .split(/\n\n+/)
                                    .map((para, idx) => (
                                      <p key={idx} className="user-msg-p">
                                        {para.split("\n").map((line, li, arr) => (
                                          <React.Fragment key={li}>
                                            {line}
                                            {li < arr.length - 1 ? <br /> : null}
                                          </React.Fragment>
                                        ))}
                                      </p>
                                    ))}
                                </div>
                              ) : (
                                <MarkdownBody text={body} />
                              )
                            ) : msg.streaming ? (
                              <div className="flex items-center gap-2.5 text-[var(--on-surface-variant)]">
                                <motion.div
                                  animate={{ rotate: 360, scale: [1, 1.12, 1] }}
                                  transition={{
                                    rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                                    scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                                  }}
                                  className="h-5 w-5 text-[var(--primary)]"
                                >
                                  <ConstructIcon className="h-full w-full" />
                                </motion.div>
                                <span className="text-[13.5px] font-medium animate-pulse">
                                  {i.constructingResponse}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {!isEditing && codes.length > 0 && (
                          <div className="mt-2 w-full space-y-2">
                            {codes.slice(0, 2).map((c) => (
                              <div key={c.id} className="node-code">
                                <div className="node-code-head">
                                  <div className="flex items-center gap-2 text-[12px] font-medium text-white/80">
                                    <Code2 className="h-3.5 w-3.5" />
                                    {c.lang}
                                  </div>
                                  <button
                                    type="button"
                                    className="icon-btn !h-8 !w-8 !text-white/70 hover:!text-white"
                                    title={i.copyCode}
                                    onClick={() => copyText(c.code, true)}
                                  >
                                    {copied ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-btn !h-8 !w-8 !text-white/70 hover:!text-white"
                                    title={i.injectToCanvas}
                                    onClick={() => injectToFocusCanvas(c.code)}
                                  >
                                    <Layers className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="scroll-thin max-h-52 overflow-auto">
                                  <SyntaxHighlighter
                                    language={c.lang === "text" ? "javascript" : c.lang}
                                    style={oneDark}
                                    customStyle={{
                                      margin: 0,
                                      padding: "14px 16px",
                                      background: "transparent",
                                      fontSize: "12px",
                                      lineHeight: 1.55,
                                    }}
                                  >
                                    {c.code.length > 900
                                      ? `${c.code.slice(0, 900)}\n…`
                                      : c.code}
                                  </SyntaxHighlighter>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!isEditing && (
                          <div className="chat-actions">
                            <button
                              type="button"
                              className="icon-btn !h-7 !w-7"
                              title={i.copy}
                              onClick={() => copyText(msg.content, true)}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            {!isUser && (
                              <button
                                type="button"
                                className="icon-btn !h-7 !w-7"
                                title={i.injectToCanvas}
                                onClick={() => injectToFocusCanvas(msg.content)}
                              >
                                <Layers className="h-3 w-3" />
                              </button>
                            )}
                            {isUser && (
                              <button
                                type="button"
                                className="icon-btn !h-7 !w-7"
                                title={i.editMessage}
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setEditText(msg.content);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                            {!isUser && (
                              <button
                                type="button"
                                className={`icon-btn !h-7 !w-7 ${speakingMsgId === msg.id ? "text-[var(--on-tertiary-container)] animate-pulse" : ""}`}
                                title={speakingMsgId === msg.id ? i.stopReading : i.readAloud}
                                onClick={() => toggleSpeak(msg.id, msg.content)}
                              >
                                {speakingMsgId === msg.id ? (
                                  <VolumeX className="h-3 w-3" />
                                ) : (
                                  <Volume2 className="h-3 w-3" />
                                )}
                              </button>
                            )}
                            {!isUser &&
                              messages[messages.length - 1]?.id === msg.id &&
                              !msg.streaming && (
                                <button
                                  type="button"
                                  className="icon-btn !h-7 !w-7"
                                  title={i.regenerate}
                                  onClick={regenerate}
                                  disabled={loading}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {followUps.length > 0 && !loading && (
                  <div className="flex flex-wrap gap-2 pt-1 pl-11">
                    {followUps.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => send({ text: f })}
                        className="rounded-full border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--on-surface-variant)] transition hover:border-[var(--primary)] hover:text-[var(--on-surface)]"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Centered composer */}
        <div className="chat-composer-bar">
          <div className="chat-column">
            {error && (
              <div className="mb-2 rounded-xl bg-[var(--error-container)] px-3 py-2 text-[12px] text-[var(--error)]">
                {error}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => setError(null)}
                >
                  {i.dismiss}
                </button>
              </div>
            )}

            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex max-w-full items-center gap-2 rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-2.5 py-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-[160px] truncate text-[12px] text-[var(--on-surface)]">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) => prev.filter((x) => x.id !== f.id))
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Multi-agent team — Collaborate only */}
            {!isFocus && (
              <div className="agent-team">
                <div className="agent-team-head">
                  <button
                    type="button"
                    className="flex items-center gap-2 min-w-0 text-left"
                    onClick={() => setAgentPanelOpen((v) => !v)}
                  >
                    <UsersRound className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
                    <div className="min-w-0">
                      <p className="agent-team-title flex items-center gap-1.5">
                        {i.agentTeam}
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            agentPanelOpen ? "rotate-180" : ""
                          }`}
                        />
                      </p>
                      <p className="text-[11px] text-[var(--on-surface-variant)] leading-snug">
                        {multiAgentEnabled
                          ? `${agents.filter((a) => a.enabled !== false).length}/${agentLimit} · ${i.multiAgentOn}`
                          : i.agentTeamHint}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className={`toggle ${multiAgentEnabled ? "on" : ""}`}
                      title={i.multiAgentOn}
                      onClick={() => setMultiAgentEnabled((v) => !v)}
                    />
                    {agentPanelOpen && (
                      <button
                        type="button"
                        className="btn-ghost !h-8 !px-2.5 text-[12px]"
                        onClick={addAgent}
                        disabled={
                          !multiAgentEnabled || agents.length >= agentLimit
                        }
                        title={
                          agents.length >= agentLimit
                            ? i.agentLimitReached.replace(
                                "{n}",
                                String(agentLimit)
                              )
                            : i.addAgent
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {i.addAgent}
                      </button>
                    )}
                  </div>
                </div>

                {agentPanelOpen && multiAgentEnabled && (
                  <p className="agent-pipeline-hint">
                    {i.agentPipelineHint.replace("{n}", String(agentLimit))}
                  </p>
                )}

                {agentPanelOpen &&
                  multiAgentEnabled &&
                  agents.map((agent, idx) => (
                    <div
                      key={agent.id}
                      className={`agent-row ${agent.enabled === false ? "disabled" : ""}`}
                    >
                      <div className="agent-step">
                        <span
                          className="agent-dot"
                          style={{
                            background: agent.color || "var(--primary)",
                          }}
                        />
                        <span className="agent-step-num">{idx + 1}</span>
                      </div>
                      <div className="agent-meta">
                        <div className="agent-name-row">
                          <Bot className="h-3.5 w-3.5 text-[var(--on-surface-variant)] shrink-0" />
                          <input
                            className="agent-name bg-transparent outline-none min-w-0 flex-1"
                            value={agent.name}
                            onChange={(e) =>
                              updateAgent(agent.id, { name: e.target.value })
                            }
                            placeholder={i.agentName}
                            aria-label={i.agentName}
                          />
                          <select
                            className="agent-model-select"
                            value={agent.model}
                            onChange={(e) =>
                              updateAgent(agent.id, { model: e.target.value })
                            }
                            aria-label={i.aiModel}
                          >
                            {(availableModelList.length
                              ? availableModelList
                              : ALL_MODELS
                            ).map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          className="agent-role-input"
                          value={agent.role}
                          onChange={(e) =>
                            updateAgent(agent.id, { role: e.target.value })
                          }
                          placeholder={i.agentRolePlaceholder}
                          aria-label={i.agentRolePlaceholder}
                        />
                        <textarea
                          className="agent-task-input"
                          rows={2}
                          placeholder={i.agentTaskPlaceholder}
                          value={agent.task || ""}
                          onChange={(e) =>
                            updateAgent(agent.id, { task: e.target.value })
                          }
                        />
                      </div>
                      <div className="agent-actions">
                        <button
                          type="button"
                          className="icon-btn !h-7 !w-7"
                          title={i.enableAgent}
                          onClick={() =>
                            updateAgent(agent.id, {
                              enabled: agent.enabled === false,
                            })
                          }
                        >
                          {agent.enabled === false ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="icon-btn !h-7 !w-7"
                          title={i.removeAgent}
                          onClick={() => removeAgent(agent.id)}
                          disabled={agents.length <= 1}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="composer-shell" ref={composerMenuRef}>
              <AnimatePresence>
                {composerMenu === "attach" && (
                  <motion.div
                    className="composer-popover"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                  >
                    <p className="composer-popover-title">{i.attachMenuTitle}</p>
                    <button
                      type="button"
                      className="composer-menu-item"
                      onClick={() => cameraRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                      <span>{i.attachCamera}</span>
                    </button>
                    <button
                      type="button"
                      className="composer-menu-item"
                      onClick={() => photoRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>{i.attachPhoto}</span>
                    </button>
                    <button
                      type="button"
                      className="composer-menu-item"
                      onClick={() => fileRef.current?.click()}
                    >
                      <FileText className="h-4 w-4" />
                      <span>{i.attachFile}</span>
                    </button>
                    <button
                      type="button"
                      className="composer-menu-item"
                      onClick={() => {
                        setComposerMenu("none");
                        showToast(i.pluginSoon);
                      }}
                    >
                      <Puzzle className="h-4 w-4" />
                      <span>{i.attachPlugin}</span>
                    </button>
                  </motion.div>
                )}

                {composerMenu === "tools" && (
                  <motion.div
                    className="composer-popover tools-popover"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                  >
                    <div className="flex items-start justify-between gap-3 px-1 pb-2">
                      <div>
                        <p className="composer-popover-title !mb-0.5 !px-0">{i.toolsTitle}</p>
                        <p className="text-[11px] leading-snug text-[var(--on-surface-variant)]">
                          {i.toolsPermissionHint}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`toggle ${toolsAllowed ? "on" : ""}`}
                        title={i.toolsPermission}
                        onClick={() => {
                          setToolsAllowed((v) => {
                            const next = !v;
                            localStorage.setItem("aura-tools-allowed", String(next));
                            return next;
                          });
                        }}
                      />
                    </div>
                    <div className="h-px bg-[var(--outline-variant)]/30 my-1" />
                    <div className="tools-grid">
                      {(
                        [
                          ["gen-image", i.toolGenImage, Paintbrush],
                          ["gen-video", i.toolGenVideo, Video],
                          ["canvas", i.toolCanvas, Layers],
                          ["convert-file", i.toolConvert, FileType2],
                          ["compress-file", i.toolCompress, Archive],
                          ["transcribe", i.toolTranscribe, Mic],
                          ["data-table", i.toolTable, Table2],
                          ["diagram", i.toolDiagram, Sparkles],
                        ] as const
                      ).map(([id, label, Icon]) => {
                        const tool = CREATIVE_TOOLS.find((t) => t.id === id);
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={!toolsAllowed}
                            className={`tool-chip ${activeToolId === id ? "active" : ""}`}
                            onClick={() => {
                              if (!toolsAllowed || !tool) return;
                              setActiveToolId(id === activeToolId ? null : id);
                              setComposerMenu("none");
                              setTimeout(() => inputRef.current?.focus(), 40);
                              showToast(label);
                            }}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="chat-composer">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    const el = e.target;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (!user.sendWithEnter) return;
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={i.messagePlaceholder}
                  className="chat-composer-input"
                />
                <div className="chat-composer-toolbar">
                  <div className="chat-composer-toolbar-left">
                    <button
                      type="button"
                      className={`icon-btn !h-8 !w-8 shrink-0 ${composerMenu === "attach" ? "text-[var(--primary)]" : ""}`}
                      title={i.attachFiles}
                      onClick={() =>
                        setComposerMenu((m) =>
                          m === "attach" ? "none" : "attach"
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={`icon-btn !h-8 !w-8 shrink-0 ${composerMenu === "tools" ? "text-[var(--primary)]" : ""} ${activeToolId ? "text-[var(--primary)]" : ""}`}
                      title={i.toolsTitle}
                      onClick={() =>
                        setComposerMenu((m) =>
                          m === "tools" ? "none" : "tools"
                        )
                      }
                    >
                      <Wrench className="h-4 w-4" />
                    </button>
                    {activeToolId &&
                      (() => {
                        const tool = CREATIVE_TOOLS.find(
                          (t) => t.id === activeToolId
                        );
                        if (!tool) return null;

                        let label: string = tool.id;
                        let ToolIcon = Sparkles;

                        if (tool.id === "gen-image") {
                          label = i.toolGenImage;
                          ToolIcon = Paintbrush;
                        } else if (tool.id === "gen-video") {
                          label = i.toolGenVideo;
                          ToolIcon = Video;
                        } else if (tool.id === "canvas") {
                          label = i.toolCanvas;
                          ToolIcon = Layers;
                        } else if (tool.id === "convert-file") {
                          label = i.toolConvert;
                          ToolIcon = FileType2;
                        } else if (tool.id === "compress-file") {
                          label = i.toolCompress;
                          ToolIcon = Archive;
                        } else if (tool.id === "transcribe") {
                          label = i.toolTranscribe;
                          ToolIcon = Mic;
                        } else if (tool.id === "data-table") {
                          label = i.toolTable;
                          ToolIcon = Table2;
                        } else if (tool.id === "diagram") {
                          label = i.toolDiagram;
                          ToolIcon = Sparkles;
                        }

                        return (
                          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--tertiary-container)] px-2 py-1 text-[11px] font-medium text-[var(--on-tertiary-container)] border border-[var(--on-tertiary-container)]/10 shrink-0 max-w-[9rem]">
                            <ToolIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{label}</span>
                            <button
                              type="button"
                              onClick={() => setActiveToolId(null)}
                              className="opacity-70 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })()}
                  </div>
                  <div className="chat-composer-toolbar-right">
                    <span className="hidden sm:inline text-[11px] text-[var(--on-surface-variant)] max-w-[10rem] truncate">
                      {currentModel.label}
                    </span>
                    {loading ? (
                      <button
                        type="button"
                        className="chat-send-btn"
                        title={i.stop}
                        onClick={stop}
                      >
                        <Square className="h-4 w-4 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="chat-send-btn"
                        onClick={() => send()}
                        disabled={!input.trim() && files.length === 0}
                      >
                        <Send className="h-4 w-4" fill="currentColor" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-[var(--on-surface-variant)]">
              {currentMode.label} · {currentModel.label}
              {!isFocus && multiAgentEnabled
                ? ` · ${i.multiAgentOn}`
                : ""}
              {activeToolId ? ` · ${i.toolsTitle}` : ""}
              {isFocus ? ` · ${i.focusMode}` : ""}
            </p>
          </div>
        </div>
        </div>{/* end focus-split-chat / chat column stack */}

        {/* Focus canvas — rounded panel, clear preview/code split, clear of navbar */}
        {isFocus && focusCanvasOpen && (
          <aside
            className={`focus-canvas-panel ${canvasIsHtml ? "has-visual" : ""}`}
          >
            <div className="focus-canvas-head">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[var(--on-surface)] flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  {i.focusCanvas}
                </p>
                <p className="text-[11px] text-[var(--on-surface-variant)]">
                  {canvasIsHtml ? i.visualEditorHint : i.focusCanvasHint}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="icon-btn !h-8 !w-8"
                  title={i.copyCanvas}
                  onClick={() => copyText(focusCanvasText)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="icon-btn !h-8 !w-8"
                  title={i.closeCanvas}
                  onClick={() => setFocusCanvasOpen(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {canvasIsHtml ? (
              <div className="focus-canvas-split">
                <div className="focus-visual-wrap">
                  <span className="focus-pane-label">{i.preview}</span>
                  <VisualPreview
                    html={htmlFromCanvas(focusCanvasText)}
                    onHtmlChange={(html) =>
                      setFocusCanvasText(canvasFromHtml(html))
                    }
                    className="focus-visual"
                  />
                </div>
                <div className="focus-canvas-divider" aria-hidden />
                <div className="focus-code-wrap">
                  <span className="focus-pane-label">{i.code}</span>
                  <textarea
                    className="focus-canvas-editor scroll-thin code-half"
                    value={focusCanvasText}
                    onChange={(e) => setFocusCanvasText(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : (
              <textarea
                className="focus-canvas-editor scroll-thin"
                value={focusCanvasText}
                onChange={(e) => setFocusCanvasText(e.target.value)}
                spellCheck={false}
              />
            )}
          </aside>
        )}
        </div>{/* end focus-split / outer flex */}
      </main>

      {isFocus && (
        <button
          type="button"
          onClick={() => setViewTab("collaborate")}
          className="exit-focus-chip fixed top-4 right-4 z-[70] flex items-center gap-2 rounded-full border border-[var(--outline-variant)]/40 bg-[var(--surface-container-lowest)]/80 backdrop-blur-md px-3.5 py-1.5 text-[12px] font-semibold text-[var(--on-surface-variant)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--on-surface)]"
        >
          <X className="h-3.5 w-3.5" />
          <span>{i.exitFocus}</span>
        </button>
      )}

      {/* Focus floating asset dock — normal chat takeaways */}
      {isFocus && !focusCanvasOpen && focusAssets.length > 0 && (
        <div className="focus-asset-dock">
          <div className="focus-asset-dock-head">
            <p className="focus-asset-dock-title flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              {i.assetDock}
            </p>
            <button
              type="button"
              className="text-[11px] font-semibold text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
              onClick={() => setFocusAssets([])}
            >
              {i.clearAssets}
            </button>
          </div>
          <div className="focus-asset-list scroll-thin">
            {focusAssets.map((a) => (
              <button
                key={a.id}
                type="button"
                className="focus-asset-item"
                onClick={() => copyText(a.text)}
                title={i.copy}
              >
                {a.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live Preview Panel */}
      <AnimatePresence>
        {showPreview && previewCodes.length > 0 && (() => {
          // Build combined HTML document from code blocks (+ canvas scaffolds)
          const htmlBlocks = previewCodes.filter((c) => c.lang === "html" || c.lang === "htm");
          const cssBlocks = previewCodes.filter((c) => c.lang === "css");
          const jsBlocks = previewCodes.filter(
            (c) => c.lang === "javascript" || c.lang === "js" || c.lang === "typescript" || c.lang === "ts" || c.lang === "jsx" || c.lang === "tsx"
          );

          const hasFullHtml = htmlBlocks.some((b) => b.code.includes("<!DOCTYPE") || b.code.includes("<html"));
          let previewDoc: string;

          if (hasFullHtml) {
            // Use the last full HTML doc, inject CSS/JS
            const fullHtml = htmlBlocks[htmlBlocks.length - 1].code;
            const extraCss = cssBlocks.map((c) => `<style>${c.code}</style>`).join("\n");
            const extraJs = jsBlocks.map((c) => `<script>${c.code}<\/script>`).join("\n");
            previewDoc = fullHtml.replace("</head>", `${extraCss}\n</head>`).replace("</body>", `${extraJs}\n</body>`);
          } else {
            const bodyHtml = htmlBlocks.map((c) => c.code).join("\n");
            const css = cssBlocks.map((c) => c.code).join("\n");
            const js = jsBlocks.map((c) => c.code).join("\n");
            previewDoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; }
${css}
</style>
</head>
<body>
${bodyHtml}
<script>${js}<\/script>
</body>
</html>`;
          }

          // Build nice filenames for each code block
          const tabs = previewCodes.map((c, idx) => {
            let name = "file";
            if (c.lang === "html" || c.lang === "htm") name = "index.html";
            else if (c.lang === "css") name = "style.css";
            else if (c.lang === "javascript" || c.lang === "js" || c.lang === "typescript" || c.lang === "ts") name = "script.js";
            else name = `code-${idx + 1}.${c.lang || "txt"}`;

            const count = previewCodes.filter((x, i) => i < idx && (x.lang === c.lang || (c.lang === "javascript" && x.lang === "js"))).length;
            if (count > 0) {
              const parts = name.split(".");
              name = `${parts[0]}-${count + 1}.${parts[1]}`;
            }
            return { id: c.id, name, block: c };
          });

          const currentActiveBlock = previewCodes.find((c) => c.id === activeCodeId) || previewCodes[0] || null;

          return (
            <motion.div
              key="preview-panel"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`fixed z-[55] flex flex-col overflow-hidden rounded-[18px] ${
                previewMaximized
                  ? "inset-4"
                  : "bottom-24 left-28 right-6 top-20"
              }`}
              style={{
                background: "var(--surface-container-lowest)",
                boxShadow:
                  "0 0 0 1px color-mix(in srgb, var(--on-surface) 10%, transparent), 0 24px 64px rgba(0,0,0,0.18)",
                ...(assistantOpen && !previewMaximized
                  ? { right: "min(24rem, 36vw)" }
                  : {}),
              }}
            >
              {/* Preview toolbar */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                  borderBottom:
                    "1px solid color-mix(in srgb, var(--on-surface) 8%, transparent)",
                  background: "var(--surface-container)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-[var(--on-surface-variant)]" />
                  <span className="text-[13px] font-semibold text-[var(--on-surface)]">
                    Code & Preview Sandbox
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="icon-btn !h-7 !w-7"
                    title={previewMaximized ? "Restore" : "Maximize"}
                    onClick={() => setPreviewMaximized((v) => !v)}
                  >
                    {previewMaximized ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="icon-btn !h-7 !w-7"
                    title="Close preview"
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewMaximized(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Side by side container */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left: Code display */}
                <div className="flex w-[38%] flex-col border-r border-[var(--outline-variant)]/20 bg-[#282c34] text-[#abb2bf]">
                  {/* File tabs inside Code display */}
                  <div className="flex items-center gap-1 overflow-x-auto border-b border-white/5 bg-[#21252b] px-3 py-1.5 scroll-thin">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCodeId(tab.id)}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                          currentActiveBlock?.id === tab.id
                            ? "bg-[#282c34] text-white shadow-sm"
                            : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold opacity-60">{tab.block.lang}</span>
                        <span className="truncate max-w-[120px]">{tab.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Code body */}
                  <div className="flex-1 overflow-auto p-4 scroll-thin">
                    {currentActiveBlock ? (
                      <SyntaxHighlighter
                        language={currentActiveBlock.lang === "text" ? "javascript" : currentActiveBlock.lang}
                        style={oneDark}
                        customStyle={{
                          margin: 0,
                          padding: 0,
                          background: "transparent",
                          fontSize: "12px",
                          lineHeight: 1.55,
                        }}
                      >
                        {currentActiveBlock.code}
                      </SyntaxHighlighter>
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/30 text-[12px]">
                        No code block active
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Iframe Preview */}
                <div className="flex flex-1 flex-col bg-white">
                  {/* Mock address bar */}
                  <div className="flex items-center justify-between border-b border-[var(--outline-variant)]/10 bg-[var(--surface-container-low)] px-4 py-2">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                      </div>
                      <div className="flex-1 rounded-md bg-white/80 dark:bg-black/10 px-3 py-1 text-[11px] text-[var(--on-surface-variant)] flex items-center gap-1.5 border border-[var(--outline-variant)]/10">
                        <span className="text-gray-400 select-none">https://</span>
                        <span className="font-mono">localhost:3000/preview</span>
                      </div>
                    </div>
                  </div>

                  {/* Sandbox iframe */}
                  <div className="relative flex-1 bg-white">
                    <iframe
                      title="Code Preview"
                      sandbox="allow-scripts allow-modals"
                      srcDoc={previewDoc}
                      className="h-full w-full border-0"
                      style={{ background: "#fff" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Bottom dock — unique actions only (attach/tools live on composer) */}
      <div
        className={`bottom-dock glass-bar ${isFocus ? "is-focus" : "with-rail"}`}
      >
        <button
          type="button"
          className="dock-item"
          title={i.newConversation}
          onClick={() => {
            newChat();
            setAssistantOpen(true);
            setActiveToolId(null);
            setComposerMenu("none");
            setFocusCanvasOpen(false);
            setFocusAssets([]);
            inputRef.current?.focus();
          }}
        >
          <div className="dock-icon">
            <MessageSquare className="h-4 w-4" />
          </div>
          <span className="dock-label">{i.new}</span>
        </button>

        <div className="dock-sep" />

        <button
          type="button"
          className={`dock-item ${
            allCodes.length > 0 || focusCanvasOpen ? "active" : ""
          }`}
          title={i.focusCodeOnCanvas}
          onClick={() => {
            if (isFocus) {
              if (focusCanvasOpen) {
                setFocusCanvasOpen(false);
                return;
              }
              const lastAsst = [...messages]
                .reverse()
                .find((m) => m.role === "assistant" && m.content.trim());
              if (allCodes.length) {
                setActiveCodeId(allCodes[allCodes.length - 1].id);
                injectToFocusCanvas(
                  allCodes.map((c) => `\`\`\`${c.lang}\n${c.code}\n\`\`\``).join("\n\n")
                );
                return;
              }
              if (lastAsst) {
                injectToFocusCanvas(lastAsst.content);
                return;
              }
              setFocusCanvasOpen(true);
              showToast(i.openCanvas);
              return;
            }
            if (!allCodes.length) {
              showToast(i.noCodeYet);
              return;
            }
            setActiveCodeId(allCodes[allCodes.length - 1].id);
            injectToFocusCanvas(
              allCodes.map((c) => `\`\`\`${c.lang}\n${c.code}\n\`\`\``).join("\n\n")
            );
          }}
        >
          <div className="dock-icon">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="dock-label">{i.code}</span>
        </button>
        <button
          type="button"
          className={`dock-item ${showPreview ? "active" : ""}`}
          title={i.previewWebsite}
          onClick={() => {
            if (!previewCodes.length) {
              showToast(i.noCodeYet);
              return;
            }
            setShowPreview((v) => !v);
          }}
        >
          <div className="dock-icon">
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </div>
          <span className="dock-label">{i.preview}</span>
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Library drawer */}
      <AnimatePresence>
        {sheet === "library" && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet("none")}
          >
            <motion.div
              className="sheet wide"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-header">
                <div>
                  <h2 className="sheet-title">{i.historyTitle}</h2>
                  <p className="sheet-sub">
                    {i.historySub}
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSheet("none")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="border-b border-[var(--outline-variant)]/40 px-5 py-3">
                <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--outline-variant)]/60 bg-[var(--surface-container-lowest)] px-3">
                  <Search className="h-4 w-4 text-[var(--outline)]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={i.searchChats}
                    className="w-full bg-transparent text-[14px]"
                  />
                </div>
              </div>
              <div className="sheet-body space-y-1 !pt-2">
                <button
                  type="button"
                  className="btn-primary mb-3 w-full"
                  onClick={() => {
                    newChat();
                    setSheet("none");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New conversation
                </button>
                {filteredChats.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                      c.id === activeId ? "bg-[var(--surface-container)]" : ""
                    }`}
                  >
                    {renamingId === c.id ? (
                      <form
                        className="w-full"
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveRename(c.id);
                        }}
                      >
                        <input
                          autoFocus
                          className="field h-9 text-[13px]"
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onBlur={() => saveRename(c.id)}
                        />
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate px-2 py-2 text-left text-[14px] font-medium"
                          onClick={() => selectChat(c.id)}
                        >
                          {c.pinned && (
                            <Pin className="mr-1.5 inline h-3 w-3 text-[var(--on-tertiary-container)]" />
                          )}
                          {c.title}
                        </button>
                        <button
                          type="button"
                          className="icon-btn !h-8 !w-8"
                          onClick={() => togglePin(c.id, !!c.pinned)}
                        >
                          {c.pinned ? (
                            <PinOff className="h-3.5 w-3.5" />
                          ) : (
                            <Pin className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="icon-btn !h-8 !w-8"
                          onClick={() => {
                            setRenamingId(c.id);
                            setRenameText(c.title);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn !h-8 !w-8"
                          onClick={() => deleteChat(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command palette — centered modal */}
      <AnimatePresence>
        {sheet === "command" && (
          <motion.div
            className="overlay center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet("none")}
          >
            <motion.div
              className="sheet modal"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b border-[var(--outline-variant)]/40 px-4 py-3">
                <Search className="h-4 w-4 text-[var(--outline)]" />
                <input
                  autoFocus
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder={i.searchCommands}
                  className="w-full bg-transparent text-[14px]"
                />
                <kbd className="kbd">Esc</kbd>
              </div>
              <div className="scroll-thin max-h-[45vh] overflow-y-auto p-2">
                {cmdItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.run}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-[var(--surface-container)]"
                  >
                    <span className="text-[14px]">{item.label}</span>
                    <span className="text-[11px] text-[var(--on-surface-variant)]">
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates — same sheet animation as others, lightweight tween (no spring jank) */}
      <AnimatePresence>
        {sheet === "templates" && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={() => setSheet("none")}
          >
            <motion.div
              className="sheet templates-sheet templates-sheet-lite"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-header">
                <div>
                  <h2 className="sheet-title">{i.templatesTitle}</h2>
                  <p className="sheet-sub">{i.templatesSub}</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSheet("none")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="border-b border-[var(--outline-variant)]/25 px-5 py-3">
                <div className="chip-row">
                  {templateCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTemplateCat(c.id)}
                      className={`cat-chip ${templateCat === c.id ? "active" : ""}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const selected =
                  visibleTemplates.find((t) => t.id === previewTemplateId) ||
                  visibleTemplates[0] ||
                  null;
                return (
                  <div className="templates-layout-lite">
                    <div className="templates-list scroll-thin">
                      {visibleTemplates.map((t) => {
                        const Icon = TEMPLATE_KIND_ICONS[t.kind] || FileText;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setPreviewTemplateId(t.id)}
                            onDoubleClick={() => applyTemplate(t)}
                            className={`template-card-lite ${
                              selected?.id === t.id ? "active" : ""
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0 opacity-70" />
                            <div className="min-w-0 text-left">
                              <span className="t-title block">{t.title}</span>
                              <span className="t-desc line-clamp-1 block">
                                {t.category} · {t.badge}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="template-detail-lite">
                      {selected ? (
                        <>
                          <h3 className="text-[16px] font-semibold tracking-tight">
                            {selected.title}
                          </h3>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--on-surface-variant)]">
                            {selected.description}
                          </p>
                          <p className="mt-3 text-[12px] text-[var(--on-surface-variant)]">
                            {selected.preview.input}
                          </p>
                          <button
                            type="button"
                            className="btn-primary mt-5 !h-10 !px-5 text-[13px]"
                            onClick={() => applyTemplate(selected)}
                          >
                            {i.useTemplate}
                          </button>
                          <p className="mt-2 text-[11px] text-[var(--on-surface-variant)]">
                            {i.templateOpensCanvas}
                          </p>
                        </>
                      ) : (
                        <p className="text-[13px] text-[var(--on-surface-variant)]">
                          {i.templatePreviewEmpty}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global file drop overlay */}
      <AnimatePresence>
        {globalDrag && (
          <motion.div
            className="drop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="drop-overlay-card">
              <Upload className="h-8 w-8 text-[var(--on-tertiary-container)]" />
              <p className="drop-overlay-title">{i.dropOverlayTitle}</p>
              <p className="drop-overlay-sub">{i.dropOverlaySub}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model drawer */}
      <AnimatePresence>
        {sheet === "model" && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet("none")}
          >
            <motion.div
              className="sheet wide"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-header">
                <div>
                  <h2 className="sheet-title">{i.modelTitle}</h2>
                  <p className="sheet-sub">{i.modelSub}</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSheet("none")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="sheet-body">
                <div className="settings-card">
                  <div className="model-unified">
                    {(availableModelList.length
                      ? availableModelList
                      : []
                    ).map((m, idx, arr) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => changeModel(m.id)}
                        className={`model-unified-row ${model === m.id ? "active" : ""} ${
                          idx === 0 ? "first" : ""
                        } ${idx === arr.length - 1 ? "last" : ""}`}
                      >
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold">{m.label}</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--on-surface-variant)]">
                              {m.provider}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-[var(--on-surface-variant)]">
                            {m.tagline} · {m.speed}
                          </p>
                        </div>
                        <span
                          className={`model-radio ${model === m.id ? "on" : ""}`}
                          aria-hidden
                        />
                      </button>
                    ))}
                    {!availableModelList.length && (
                      <p className="px-4 py-6 text-center text-[13px] text-[var(--on-surface-variant)]">
                        {i.modelNeedsKey}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attach drawer */}
      <AnimatePresence>
        {sheet === "attach" && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet("none")}
          >
            <motion.div
              className="sheet"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-header">
                <div>
                  <h2 className="sheet-title">{i.attachTitle}</h2>
                  <p className="sheet-sub">{i.attachSub}</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSheet("none")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="sheet-body space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    ingestFiles(e.dataTransfer.files);
                  }}
                  className={`flex flex-col items-center rounded-xl border border-dashed px-6 py-10 ${
                    dragOver
                      ? "border-[var(--primary)] bg-[var(--surface-container)]"
                      : "border-[var(--outline-variant)] bg-[var(--surface-container-low)]"
                  }`}
                >
                  <Upload className="mb-3 h-6 w-6 text-[var(--outline)]" />
                  <p className="text-[14px] font-medium">{i.dropFiles}</p>
                  <button
                    type="button"
                    className="btn-primary mt-4"
                    onClick={() => fileRef.current?.click()}
                  >
                    {i.browse}
                  </button>
                </div>
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--outline-variant)]/50 px-3 py-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {f.name}
                    </span>
                    <span className="text-[11px] text-[var(--on-surface-variant)]">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => setSheet("none")}
                >
                  {i.done}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcuts drawer */}
      <AnimatePresence>
        {sheet === "shortcuts" && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet("none")}
          >
            <motion.div
              className="sheet"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-header">
                <div>
                  <h2 className="sheet-title">{i.shortcutsTitle}</h2>
                  <p className="sheet-sub">{i.shortcutsSub}</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSheet("none")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="sheet-body space-y-2">
                {[
                  ["⌘ K", i.shortcutCommand],
                  ["⌘ N", i.shortcutNew],
                  ["Enter", i.enterToSend],
                  ["Esc", i.shortcutClose],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-lg border border-[var(--outline-variant)]/40 px-3 py-2.5"
                  >
                    <span className="text-[13px]">{v}</span>
                    <kbd className="kbd">{k}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings drawer */}
      <AnimatePresence>
        {sheet === "settings" && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet("none")}
          >
            <motion.div
              className="sheet wide"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-header">
                <div>
                  <h2 className="sheet-title">{i.settingsTitle}</h2>
                  <p className="sheet-sub">{i.settingsSub}</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSheet("none")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                <nav className="settings-nav">
                  {(
                    [
                      ["general", i.tabGeneral, Settings],
                      ["account", i.tabAccount, User],
                      ["model", i.tabModel, Cpu],
                      ["personalization", i.tabPersonalization, Brain],
                      ["capabilities", i.tabCapabilities, Terminal],
                      ["data", i.tabData, Shield],
                    ] as [SettingsTab, string, React.ComponentType<{ className?: string }>][]
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSettingsTab(id)}
                      className={`settings-nav-item ${settingsTab === id ? "active" : ""}`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {label}
                    </button>
                  ))}
                </nav>
                <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                  {settingsTab === "general" && (
                    <div className="space-y-3">
                      <p className="text-[11.5px] text-[var(--on-surface-variant)]">{i.generalHint}</p>

                      <div className="settings-row settings-row-stack">
                        <div>
                          <p className="settings-row-title">{i.themeSegment}</p>
                          <p className="settings-row-desc">{i.themeSystemDesc}</p>
                        </div>
                        <div className="segmented segmented-full" role="group" aria-label={i.themeSegment}>
                          {(
                            [
                              ["light", i.themeLight, Sun],
                              ["dark", i.themeDark, Moon],
                              ["system", i.themeSystem, Monitor],
                            ] as const
                          ).map(([id, title, Icon]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => pickTheme(id)}
                              className={`segmented-btn ${themeDraft === id ? "active" : ""}`}
                              title={title}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span>{title}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="settings-row">
                        <div>
                          <p className="settings-row-title">{i.language}</p>
                          <p className="settings-row-desc">{i.languageDesc}</p>
                        </div>
                        <div className="segmented">
                          {LANG_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setLanguage(opt.id)}
                              className={`segmented-btn ${uiLang === opt.id ? "active" : ""}`}
                            >
                              {opt.id === "en" ? "EN" : "ID"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="settings-row">
                        <div>
                          <p className="settings-row-title">{i.layoutDensity}</p>
                          <p className="settings-row-desc">
                            {chatDensity === "compact" ? i.densityCompactDesc : i.densityCozyDesc}
                          </p>
                        </div>
                        <div className="segmented">
                          {(
                            [
                              ["cozy", i.densityCozy],
                              ["compact", i.densityCompact],
                            ] as const
                          ).map(([id, title]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setChatDensity(id)}
                              className={`segmented-btn ${chatDensity === id ? "active" : ""}`}
                            >
                              {title}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="settings-row">
                        <div>
                          <p className="settings-row-title">{i.fontStyle}</p>
                          <p className="settings-row-desc">{i.fontSansDesc}</p>
                        </div>
                        <div className="segmented">
                          {(
                            [
                              ["sans", "Aa"],
                              ["mono", "<>"],
                              ["serif", "Ag"],
                            ] as const
                          ).map(([id, mark]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setFontFamily(id)}
                              className={`segmented-btn ${fontFamily === id ? "active" : ""} ${
                                id === "mono" ? "font-mono" : id === "serif" ? "font-serif" : ""
                              }`}
                            >
                              {mark}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setEnterDraft((v) => !v)}
                      >
                        <div>
                          <p className="settings-row-title">{i.enterToSend}</p>
                          <p className="settings-row-desc">{i.enterToSendDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${enterDraft ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnterDraft((v) => !v);
                          }}
                        />
                      </div>

                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setAutoRead((v) => !v)}
                      >
                        <div>
                          <p className="settings-row-title">{i.autoRead}</p>
                          <p className="settings-row-desc">{i.autoReadDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${autoRead ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAutoRead((v) => !v);
                          }}
                        />
                      </div>

                      {voices.length > 0 && autoRead && (
                        <div>
                          <label className="label">{i.ttsVoice}</label>
                          <select
                            value={ttsVoice}
                            onChange={(e) => setTtsVoice(e.target.value)}
                            className="field text-[13px] py-1.5"
                          >
                            <option value="">{i.defaultVoice}</option>
                            {voices.map((v) => (
                              <option key={v.name} value={v.name}>
                                {v.name} ({v.lang})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn-ghost w-full justify-start"
                        onClick={() => setSheet("shortcuts")}
                      >
                        <Keyboard className="h-4 w-4" />
                        {i.keyboardShortcuts}
                      </button>
                    </div>
                  )}

                  {settingsTab === "account" && (
                    <div className="space-y-4">
                      <div>
                        <label className="label">{i.displayName}</label>
                        <input
                          className="field"
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">{i.email}</label>
                        <input
                          className="field opacity-60"
                          value={user.email}
                          disabled
                        />
                      </div>
                      <div>
                        <label className="label flex items-center gap-2">
                          {i.universalApiKeys}
                          {user.hasApiKey && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--on-tertiary-container)]">
                              {i.connected}
                            </span>
                          )}
                        </label>
                        <p className="mb-2 text-[12px] text-[var(--on-surface-variant)]">
                          {i.universalApiKeysHint}
                        </p>
                        <input
                          className="field font-mono text-[13px]"
                          type="password"
                          value={apiKeyDraft}
                          onChange={(e) => setApiKeyDraft(e.target.value)}
                          placeholder={
                            user.hasApiKey
                              ? i.replaceKey
                              : "sk-… / gsk_… / AIza… / sk-ant-…"
                          }
                          autoComplete="off"
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-[var(--on-surface-variant)]">
                            {i.providerDetect}:{" "}
                            <strong className="text-[var(--on-surface)]">
                              {providerOverride !== "auto"
                                ? PROVIDERS.find((p) => p.id === providerOverride)
                                    ?.label
                                : keyClassify?.needsManualPick
                                  ? i.providerAmbiguousSk
                                  : keyClassify?.provider
                                    ? PROVIDERS.find(
                                        (p) => p.id === keyClassify.provider
                                      )?.label
                                    : apiKeyDraft.trim()
                                      ? i.providerUnknown
                                      : "—"}
                            </strong>
                          </span>
                          <select
                            className="agent-model-select !border !border-[var(--outline-variant)]/50 !px-2 !py-1"
                            value={providerOverride}
                            onChange={(e) =>
                              setProviderOverride(
                                e.target.value as ProviderId | "auto"
                              )
                            }
                          >
                            <option value="auto">{i.providerAuto}</option>
                            {PROVIDERS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {keyClassify?.needsManualPick &&
                          providerOverride === "auto" && (
                            <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--error)]">
                              {i.providerAmbiguousHint}
                            </p>
                          )}
                        {user.providers && (
                          <p className="mt-2 text-[11px] text-[var(--on-surface-variant)]">
                            {i.connectedProviders}:{" "}
                            {PROVIDERS.filter((p) => user.providers?.[p.id])
                              .map((p) => p.label)
                              .join(", ") || "—"}
                          </p>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--on-surface-variant)]">
                        {i.accountHint}
                      </p>
                      <div className="h-px bg-[var(--outline-variant)]/20" />
                      <button
                        type="button"
                        className="btn-ghost text-[var(--error)] w-full justify-center"
                        onClick={logout}
                      >
                        <LogOut className="h-4 w-4" />
                        {i.signOut}
                      </button>
                    </div>
                  )}

                  {settingsTab === "model" && (
                    <div className="space-y-4">
                      <p className="text-[11.5px] text-[var(--on-surface-variant)]">
                        {availableModelList.length
                          ? i.modelUnifiedHint
                          : i.modelNeedsKey}
                      </p>

                      <div className="settings-card">
                        <div className="settings-card-head">
                          <p className="settings-card-title">{i.defaultModel}</p>
                        </div>
                        <div className="model-unified">
                          {(availableModelList.length
                            ? availableModelList
                            : []
                          ).map((m, idx, arr) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setModel(m.id)}
                              className={`model-unified-row ${model === m.id ? "active" : ""} ${
                                idx === 0 ? "first" : ""
                              } ${idx === arr.length - 1 ? "last" : ""}`}
                            >
                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <p className="text-[13px] font-semibold">{m.label}</p>
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--on-surface-variant)]">
                                    {m.provider}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11.5px] text-[var(--on-surface-variant)]">
                                  {m.tagline} · {m.speed}
                                </p>
                              </div>
                              <span
                                className={`model-radio ${model === m.id ? "on" : ""}`}
                                aria-hidden
                              />
                            </button>
                          ))}
                          {!availableModelList.length && (
                            <p className="px-4 py-6 text-center text-[13px] text-[var(--on-surface-variant)]">
                              {i.modelNeedsKey}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="settings-card space-y-4 p-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="label">
                              {i.temperature} · {tempDraft.toFixed(1)}
                            </label>
                            <input
                              type="range"
                              className="range"
                              min={0}
                              max={1.5}
                              step={0.1}
                              value={tempDraft}
                              onChange={(e) => setTempDraft(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="label">
                              {i.topP} · {topP.toFixed(2)}
                            </label>
                            <input
                              type="range"
                              className="range"
                              min={0.1}
                              max={1.0}
                              step={0.05}
                              value={topP}
                              onChange={(e) => setTopP(Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="label">{i.maxTokens}</label>
                          <input
                            type="number"
                            className="field"
                            min={256}
                            max={8192}
                            step={256}
                            value={tokensDraft}
                            onChange={(e) =>
                              setTokensDraft(Number(e.target.value) || 4096)
                            }
                          />
                        </div>
                      </div>

                      <div className="settings-card overflow-hidden">
                        <div className="settings-card-head">
                          <div className="flex items-center justify-between gap-3">
                            <p className="settings-card-title">{i.customInstructions}</p>
                            <button
                              type="button"
                              className="settings-link-btn"
                              title={i.resetPromptFull}
                              onClick={() => setPromptDraft(DEFAULT_SYSTEM_PROMPT)}
                            >
                              {i.resetPrompt}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
                            {i.customInstructionsHint}
                          </p>
                        </div>
                        <textarea
                          className="system-prompt-area"
                          value={promptDraft}
                          onChange={(e) => setPromptDraft(e.target.value)}
                          rows={7}
                          placeholder={DEFAULT_SYSTEM_PROMPT}
                        />
                        <div className="flex items-center justify-between border-t border-[var(--outline-variant)]/30 px-3 py-2">
                          <p className="text-[11px] text-[var(--on-surface-variant)]">
                            {i.systemPromptHint}
                          </p>
                          <span className="text-[10px] tabular-nums text-[var(--on-surface-variant)]">
                            {promptDraft.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === "personalization" && (
                    <div className="space-y-4">
                      <p className="text-[11.5px] text-[var(--on-surface-variant)]">
                        {i.memoryHint}
                      </p>

                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setMemoryEnabled((v) => !v)}
                      >
                        <div>
                          <p className="settings-row-title flex items-center gap-1.5">
                            <Brain className="h-3.5 w-3.5 opacity-60" /> {i.enableMemory}
                          </p>
                          <p className="settings-row-desc">{i.enableMemoryDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${memoryEnabled ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemoryEnabled((v) => !v);
                          }}
                        />
                      </div>

                      {memoryEnabled && (
                        <div className="settings-card overflow-hidden">
                          <div className="settings-card-head">
                            <p className="settings-card-title">{i.memoryLabel}</p>
                          </div>
                          <textarea
                            className="system-prompt-area"
                            rows={6}
                            value={memoryText}
                            onChange={(e) => setMemoryText(e.target.value)}
                            placeholder={i.memoryPlaceholder}
                          />
                          <p className="border-t border-[var(--outline-variant)]/30 px-3 py-2 text-[11px] text-[var(--on-surface-variant)]">
                            {i.memoryFooter}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {settingsTab === "capabilities" && (
                    <div className="space-y-3">
                      <p className="text-[11.5px] text-[var(--on-surface-variant)]">
                        {i.capabilitiesHint}
                      </p>

                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setCodeExecution((v) => !v)}
                      >
                        <div>
                          <p className="settings-row-title flex items-center gap-1.5">
                            <Terminal className="h-3.5 w-3.5 opacity-60" /> {i.codeExecution}
                          </p>
                          <p className="settings-row-desc">{i.codeExecutionDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${codeExecution ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCodeExecution((v) => !v);
                          }}
                        />
                      </div>
                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setFileCreation((v) => !v)}
                      >
                        <div>
                          <p className="settings-row-title flex items-center gap-1.5">
                            <FilePlus2 className="h-3.5 w-3.5 opacity-60" /> {i.fileCreation}
                          </p>
                          <p className="settings-row-desc">{i.fileCreationDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${fileCreation ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileCreation((v) => !v);
                          }}
                        />
                      </div>
                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setWebSearch((v) => !v)}
                      >
                        <div>
                          <p className="settings-row-title flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 opacity-60" /> {i.webSearch}
                          </p>
                          <p className="settings-row-desc">{i.webSearchDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${webSearch ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setWebSearch((v) => !v);
                          }}
                        />
                      </div>
                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setCanvasDraft((v) => !v)}
                      >
                        <div>
                          <p className="settings-row-title">{i.showCanvas}</p>
                          <p className="settings-row-desc">{i.showCanvasDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${canvasDraft ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCanvasDraft((v) => !v);
                          }}
                        />
                      </div>
                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setWordWrap((v) => !v)}
                      >
                        <div>
                          <p className="settings-row-title">{i.wordWrap}</p>
                          <p className="settings-row-desc">{i.wordWrapDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${wordWrap ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setWordWrap((v) => !v);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {settingsTab === "data" && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[var(--on-surface)]">
                          {i.privacyTitle}
                        </h3>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--on-surface-variant)]">
                          {i.privacyIntro}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="rounded-xl border border-[var(--outline-variant)]/30 bg-[var(--surface-container-low)] p-3 text-[11.5px] leading-relaxed">
                          <p className="font-semibold text-[var(--on-surface)]">{i.howProtected}</p>
                          <p className="mt-1 text-[var(--on-surface-variant)]">
                            {i.howProtectedBody}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--outline-variant)]/30 bg-[var(--surface-container-low)] p-3 text-[11.5px] leading-relaxed">
                          <p className="font-semibold text-[var(--on-surface)]">{i.howUsed}</p>
                          <p className="mt-1 text-[var(--on-surface-variant)]">
                            {i.howUsedBody}
                          </p>
                        </div>
                      </div>

                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setShareData((v) => !v)}
                      >
                        <div className="pr-3">
                          <p className="settings-row-title">{i.locationMeta}</p>
                          <p className="settings-row-desc">{i.locationMetaDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${shareData ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareData((v) => !v);
                          }}
                        />
                      </div>

                      <div
                        className="settings-row cursor-pointer"
                        onClick={() => setLocalCache((v) => !v)}
                      >
                        <div className="pr-3">
                          <p className="settings-row-title">{i.localCache}</p>
                          <p className="settings-row-desc">{i.localCacheDesc}</p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${localCache ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalCache((v) => !v);
                          }}
                        />
                      </div>

                      <div className="h-px bg-[var(--outline-variant)]/20" />

                      <p className="text-[12px] font-semibold text-[var(--on-surface)]">{i.yourData}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-xl border border-[var(--outline-variant)]/30 p-3 bg-[var(--surface-container-lowest)]">
                          <div>
                            <p className="text-[12.5px] font-medium">{i.exportData}</p>
                            <p className="text-[10px] text-[var(--on-surface-variant)]">{i.exportDataDesc}</p>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost !py-1.5 !px-3 border border-[var(--outline-variant)]/40 rounded-lg"
                            onClick={exportAllData}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            {i.exportDataBtn}
                          </button>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-red-500/20 p-3 bg-[var(--surface-container-lowest)]">
                          <div>
                            <p className="text-[12.5px] font-medium text-red-500">{i.deleteChats}</p>
                            <p className="text-[10px] text-[var(--on-surface-variant)]">{i.deleteChatsDesc}</p>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost text-red-500 hover:bg-red-500/10 border border-red-500/20 !py-1.5 !px-3 rounded-lg"
                            onClick={clearAllChats}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {i.deleteAll}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="sheet-footer">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    if (user) {
                      setThemeDraft((user.theme as "dark" | "light" | "system") || "light");
                      applyTheme(user.theme || "light");
                    }
                    setSheet("none");
                  }}
                >
                  {i.cancel}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={saveSettings}
                  disabled={saving}
                >
                  {saving ? i.saving : i.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      )}
    </div>
  );
}
