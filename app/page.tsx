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
} from "lucide-react";
import {
  ACCEPTED_MEDIA,
  GROQ_MODELS,
  DEFAULT_SYSTEM_PROMPT,
  WORK_MODES,
  PROBLEM_TEMPLATES,
  QUICK_TOOLS,
  extractCodeBlocks,
  stripCodeBlocks,
  formatBytes,
  extOf,
  exportChatMarkdown,
  suggestFollowUps,
  modeById,
  type WorkModeId,
} from "./lib/models";
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
  const [apiKeyDraft, setApiKeyDraft] = useState("");
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

  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const composerMenuRef = useRef<HTMLDivElement>(null);

  const i = useMemo(() => i18n(uiLang), [uiLang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFontSize((localStorage.getItem("aura-font-size") as any) || "base");
    setFontFamily((localStorage.getItem("aura-font-family") as any) || "sans");
    setChatDensity((localStorage.getItem("aura-chat-density") as any) || "cozy");
    setTopP(Number(localStorage.getItem("aura-top-p") || "0.9"));
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
    setToolsAllowed(localStorage.getItem("aura-tools-allowed") !== "false");
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

  const activeCode =
    allCodes.find((c) => c.id === activeCodeId) || allCodes[0] || null;

  const followUps = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || last.streaming || loading) return [];
    return suggestFollowUps(last.content).slice(0, 3);
  }, [messages, loading]);

  const currentModel =
    GROQ_MODELS.find((m) => m.id === model) || GROQ_MODELS[0];
  const currentMode = modeById(mode);

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
    if (templateCat === "__all__") return PROBLEM_TEMPLATES;
    return PROBLEM_TEMPLATES.filter((t) => t.category === templateCat);
  }, [templateCat]);

  function setLanguage(next: Lang) {
    setUiLang(next);
    localStorage.setItem("aura-ui-lang", next);
    document.documentElement.lang = next;
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  function applyTheme(themeName: string) {
    const resolved = resolveThemeMode(themeName);
    document.documentElement.setAttribute("data-theme", resolved);
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
  }

  function applyUser(u: User) {
    setUser(u);
    setModel(u.model || GROQ_MODELS[0].id);
    setNameDraft(u.name);
    setTempDraft(u.temperature ?? 0.7);
    setTokensDraft(u.maxTokens ?? 4096);
    setPromptDraft(u.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    setEnterDraft(u.sendWithEnter ?? true);
    setCanvasDraft(u.showCanvas ?? true);
    setThemeDraft((u.theme as any) || "light");
    applyTheme(u.theme || "light");
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
      router.replace("/login");
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
    setThemeDraft((user.theme as any) || "light");
    applyTheme(user.theme || "light");
    if (typeof window !== "undefined") {
      setFontSize((localStorage.getItem("aura-font-size") as any) || "base");
      setFontFamily((localStorage.getItem("aura-font-family") as any) || "sans");
      setChatDensity((localStorage.getItem("aura-chat-density") as any) || "cozy");
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
          ...(apiKeyDraft.trim() ? { apiKey: apiKeyDraft.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      applyUser(data.user);
      applyTheme(themeDraft);
      setApiKeyDraft("");
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
    } catch (e) {
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

    const content = composeContent(
      raw || i.reviewAttached
    );
    setInput("");
    setFiles([]);
    setError(null);
    setComposerMenu("none");
    setLoading(true);
    setAssistantOpen(true);

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
        const codes = extractCodeBlocks(data.assistantMessage?.content || "");
        if (codes.length) setActiveCodeId(codes[codes.length - 1].id);
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
    for (const file of arr) {
      if (file.size > 400_000) {
        setError(`${file.name} is too large (max ~400KB text).`);
        continue;
      }
      const text = await file.text();
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        text,
        size: file.size,
        kind: fileKind(file.name),
      });
    }
    setFiles((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
    showToast(`${next.length} file attached`);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(i.copied);
    setTimeout(() => setCopied(false), 1200);
  }

  function applyTemplate(t: (typeof PROBLEM_TEMPLATES)[number]) {
    setMode(t.mode);
    setInput(t.prompt);
    setSheet("none");
    setAssistantOpen(true);
    inputRef.current?.focus();
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

  const getGreeting = () => {
    const hrs = new Date().getHours();
    const displayName = user?.name ? `, ${user.name}` : "";
    if (hrs < 12) return `${i.goodMorning}${displayName}`;
    if (hrs < 15) return `${i.goodAfternoon}${displayName}`;
    if (hrs < 18) return `${i.goodEvening}${displayName}`;
    return `${i.goodNight}${displayName}`;
  };

  const isFocus = viewTab === "focus";

  return (
    <div className="relative h-screen w-screen overflow-hidden">
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
                className="flex h-36 w-36 items-center justify-center rounded-[2rem] bg-[var(--surface-container-lowest)] shadow-[0_16px_48px_rgb(0,0,0,0.12)] border border-[var(--outline-variant)]/25 sm:h-44 sm:w-44"
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

      {/* Left rail — history + templates only (no duplicate chat/attach) */}
      <nav className="glass-rail fixed bottom-4 left-4 top-[4.75rem] z-50 flex w-20 flex-col items-center gap-4 rounded-2xl py-7">
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

      {/* Full-width top navbar */}
      <header className="glass-header fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-between gap-4 px-5 md:px-8">
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
      <main className={`chat-main absolute inset-0 flex flex-col pt-16 pl-20 sm:pl-24 ${isFocus ? "chat-main-focus" : ""}`}>
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
                        <div className="chat-role">
                          {isUser ? i.you : i.brand}
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
                                    onClick={() => copyText(c.code)}
                                  >
                                    {copied ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
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
                              onClick={() => copyText(msg.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
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
                              setActiveToolId(id);
                              setInput((prev) =>
                                prev.startsWith(tool.prompt) ? prev : `${tool.prompt}${prev}`
                              );
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
                <button
                  type="button"
                  className={`icon-btn !h-9 !w-9 shrink-0 ${composerMenu === "attach" ? "text-[var(--primary)]" : ""}`}
                  title={i.attachFiles}
                  onClick={() =>
                    setComposerMenu((m) => (m === "attach" ? "none" : "attach"))
                  }
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`icon-btn !h-9 !w-9 shrink-0 ${composerMenu === "tools" ? "text-[var(--primary)]" : ""} ${activeToolId ? "text-[var(--primary)]" : ""}`}
                  title={i.toolsTitle}
                  onClick={() =>
                    setComposerMenu((m) => (m === "tools" ? "none" : "tools"))
                  }
                >
                  <Wrench className="h-4 w-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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
            <p className="mt-2 text-center text-[11px] text-[var(--on-surface-variant)]">
              {currentMode.label} · {currentModel.label}
              {activeToolId ? ` · ${i.toolsTitle}` : ""}
            </p>
          </div>
        </div>
      </main>

      {/* Live Preview Panel */}
      <AnimatePresence>
        {showPreview && allCodes.length > 0 && (() => {
          // Build combined HTML document from code blocks
          const htmlBlocks = allCodes.filter((c) => c.lang === "html" || c.lang === "htm");
          const cssBlocks = allCodes.filter((c) => c.lang === "css");
          const jsBlocks = allCodes.filter(
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
          const tabs = allCodes.map((c, idx) => {
            let name = "file";
            if (c.lang === "html" || c.lang === "htm") name = "index.html";
            else if (c.lang === "css") name = "style.css";
            else if (c.lang === "javascript" || c.lang === "js" || c.lang === "typescript" || c.lang === "ts") name = "script.js";
            else name = `code-${idx + 1}.${c.lang || "txt"}`;

            const count = allCodes.filter((x, i) => i < idx && (x.lang === c.lang || (c.lang === "javascript" && x.lang === "js"))).length;
            if (count > 0) {
              const parts = name.split(".");
              name = `${parts[0]}-${count + 1}.${parts[1]}`;
            }
            return { id: c.id, name, block: c };
          });

          const currentActiveBlock = allCodes.find((c) => c.id === activeCodeId) || allCodes[0] || null;

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
      <div className="bottom-dock glass-bar">
        <button
          type="button"
          className="dock-item"
          title={i.newConversation}
          onClick={() => {
            newChat();
            setAssistantOpen(true);
            setActiveToolId(null);
            setComposerMenu("none");
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
          className={`dock-item ${allCodes.length > 0 ? "active" : ""}`}
          title={i.focusCodeOnCanvas}
          onClick={() => {
            if (!allCodes.length) {
              showToast(i.noCodeYet);
              return;
            }
            setActiveCodeId(allCodes[allCodes.length - 1].id);
            setViewTab("collaborate");
            showToast(i.codeOnCanvas);
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
            if (!allCodes.length) {
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
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
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
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
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

      {/* Templates drawer — slide from right */}
      <AnimatePresence>
        {sheet === "templates" && (
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
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
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

              <div className="border-b border-[var(--outline-variant)]/30 px-5 py-4">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                  {i.workMode}
                </p>
                <div className="chip-row">
                  {WORK_MODES.map((m) => {
                    const Icon = MODE_ICONS[m.icon] || Sparkles;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => changeMode(m.id as WorkModeId)}
                        className={`mode-chip ${mode === m.id ? "active" : ""}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-b border-[var(--outline-variant)]/30 px-5 py-3">
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

              <div className="sheet-body space-y-2">
                {visibleTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="template-card"
                  >
                    <span className="t-cat">{t.category}</span>
                    <span className="t-title block">{t.title}</span>
                    <span className="t-desc line-clamp-2 block">{t.prompt}</span>
                  </button>
                ))}
              </div>
            </motion.div>
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
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
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
                    {GROQ_MODELS.map((m, idx) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => changeModel(m.id)}
                        className={`model-unified-row ${model === m.id ? "active" : ""} ${
                          idx === 0 ? "first" : ""
                        } ${idx === GROQ_MODELS.length - 1 ? "last" : ""}`}
                      >
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold">{m.label}</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--on-surface-variant)]">
                              {m.tier}
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
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
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
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
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
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
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
                        <label className="label">
                          {i.groqApiKey}{" "}
                          {user.hasApiKey && (
                            <span className="text-[var(--on-tertiary-container)]">
                              {i.connected}
                            </span>
                          )}
                        </label>
                        <input
                          className="field font-mono text-[13px]"
                          type="password"
                          value={apiKeyDraft}
                          onChange={(e) => setApiKeyDraft(e.target.value)}
                          placeholder={
                            user.hasApiKey ? i.replaceKey : "gsk_…"
                          }
                        />
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
                        {i.modelUnifiedHint}
                      </p>

                      <div className="settings-card">
                        <div className="settings-card-head">
                          <p className="settings-card-title">{i.defaultModel}</p>
                        </div>
                        <div className="model-unified">
                          {GROQ_MODELS.map((m, idx) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setModel(m.id)}
                              className={`model-unified-row ${model === m.id ? "active" : ""} ${
                                idx === 0 ? "first" : ""
                              } ${idx === GROQ_MODELS.length - 1 ? "last" : ""}`}
                            >
                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <p className="text-[13px] font-semibold">{m.label}</p>
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--on-surface-variant)]">
                                    {m.tier}
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
                      setThemeDraft((user.theme as any) || "light");
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
