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
  Plus,
  Settings,
  ArrowUp,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  X,
  LogOut,
  Square,
  Pencil,
  FileCode2,
  Moon,
  Sun,
  ChevronDown,
  Upload,
  FileText,
  Image as ImageIcon,
  Layers,
  Search,
  Sparkles,
  Pin,
  PinOff,
  Download,
  Command,
  Target,
  PenLine,
  Code2,
  BarChart3,
  Map,
  Languages,
  ListTree,
  Wand2,
  Keyboard,
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
  pinned?: boolean;
  mode?: string;
};
type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};
type CodeBlock = { id: string; lang: string; code: string };
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
  | "command";
type SettingsTab = "account" | "model" | "behavior" | "appearance";

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--tint)]"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
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
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("account");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [cmdQuery, setCmdQuery] = useState("");
  const [model, setModel] = useState<string>(GROQ_MODELS[0].id);
  const [mode, setMode] = useState<WorkModeId>("auto");
  const [activeCode, setActiveCode] = useState<CodeBlock | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [templateCat, setTemplateCat] = useState<string>("All");

  const [nameDraft, setNameDraft] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [tempDraft, setTempDraft] = useState(0.7);
  const [tokensDraft, setTokensDraft] = useState(4096);
  const [promptDraft, setPromptDraft] = useState(DEFAULT_SYSTEM_PROMPT);
  const [enterDraft, setEnterDraft] = useState(true);
  const [canvasDraft, setCanvasDraft] = useState(true);
  const [themeDraft, setThemeDraft] = useState<"dark" | "light">("dark");

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) || null,
    [chats, activeId]
  );

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? chats.filter((c) => c.title.toLowerCase().includes(q))
      : chats;
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }, [chats, query]);

  const allCodes = useMemo(
    () =>
      messages.flatMap((m) =>
        m.role === "assistant" ? extractCodeBlocks(m.content) : []
      ),
    [messages]
  );

  const followUps = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || last.streaming || loading) return [];
    return suggestFollowUps(last.content);
  }, [messages, loading]);

  const currentModel = GROQ_MODELS.find((m) => m.id === model) || GROQ_MODELS[0];
  const currentMode = modeById(mode);
  const showCanvas = user?.showCanvas ?? true;

  const templateCategories = useMemo(() => {
    const cats = Array.from(
      new Set(PROBLEM_TEMPLATES.map((t) => t.category))
    );
    return ["All", ...cats];
  }, []);

  const visibleTemplates = useMemo(() => {
    if (templateCat === "All") return PROBLEM_TEMPLATES;
    return PROBLEM_TEMPLATES.filter((t) => t.category === templateCat);
  }, [templateCat]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const bootstrap = useCallback(async () => {
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
      setMode((chat.mode as WorkModeId) || "auto");
      setMessages([]);
    } else {
      setActiveId(list[0].id);
      setMode((list[0].mode as WorkModeId) || "auto");
      await loadChat(list[0].id);
    }
    setReady(true);
  }, [router]);

  function applyUser(u: User) {
    setUser(u);
    setModel(u.model || GROQ_MODELS[0].id);
    setNameDraft(u.name);
    setTempDraft(u.temperature ?? 0.7);
    setTokensDraft(u.maxTokens ?? 4096);
    setPromptDraft(u.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    setEnterDraft(u.sendWithEnter ?? true);
    setCanvasDraft(u.showCanvas ?? true);
    setThemeDraft((u.theme as "dark" | "light") || "dark");
    document.documentElement.setAttribute("data-theme", u.theme || "dark");
  }

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
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Global shortcuts
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
      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setLibraryOpen((v) => !v);
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        exportActive();
      }
      if (e.key === "Escape") {
        setSheet("none");
        setEditingMsgId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages, activeChat]);

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
    setActiveCode(null);
    setError(null);
  }

  async function selectChat(id: string) {
    setActiveId(id);
    await loadChat(id);
  }

  async function newChat(nextMode?: WorkModeId) {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode || mode }),
    });
    const { chat } = await res.json();
    setChats((prev) => [chat, ...prev]);
    setActiveId(chat.id);
    setMessages([]);
    setActiveCode(null);
    setError(null);
    setInput("");
    setFiles([]);
    if (nextMode) setMode(nextMode);
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
    showToast("Conversation deleted");
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
        prev.map((c) =>
          c.id === id ? { ...c, pinned: data.chat.pinned } : c
        )
      );
      showToast(data.chat.pinned ? "Pinned" : "Unpinned");
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
  }

  function exportActive() {
    if (!activeChat || messages.length === 0) {
      showToast("Nothing to export");
      return;
    }
    const md = exportChatMarkdown(activeChat.title, messages);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeChat.title.replace(/[^\w\- ]+/g, "").trim() || "aura-chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported as Markdown");
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
    setThemeDraft(user.theme as "dark" | "light");
    setApiKeyDraft("");
    setSettingsTab("account");
    setSheet("settings");
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    try {
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
      setApiKeyDraft("");
      setSheet("none");
      showToast("Settings saved");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
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
    showToast("Model updated");
  }

  async function quickTheme(theme: "dark" | "light") {
    document.documentElement.setAttribute("data-theme", theme);
    setThemeDraft(theme);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
    const data = await res.json();
    if (res.ok) applyUser(data.user);
  }

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
      setError("Add your Groq API key in Settings to chat.");
      return;
    }

    const content = composeContent(
      raw || "Please review the attached file(s)."
    );
    setInput("");
    setFiles([]);
    setError(null);
    setLoading(true);

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
        }),
      });

      const ctype = res.headers.get("content-type") || "";
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      if (!ctype.includes("text/event-stream")) {
        const data = await res.json();
        await loadChat(activeId);
        if (data.title) {
          setChats((prev) =>
            prev.map((c) =>
              c.id === activeId
                ? {
                    ...c,
                    title: data.title,
                    updatedAt: new Date().toISOString(),
                  }
                : c
            )
          );
        }
        const codes = extractCodeBlocks(data.assistantMessage?.content || "");
        if (codes.length && showCanvas) setActiveCode(codes[codes.length - 1]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

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
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload);
              if (evt.type === "meta" && evt.title) {
                setChats((prev) =>
                  prev.map((c) =>
                    c.id === activeId
                      ? {
                          ...c,
                          title: evt.title,
                          updatedAt: new Date().toISOString(),
                        }
                      : c
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
                const codes = extractCodeBlocks(finalContent);
                if (codes.length && showCanvas) {
                  setActiveCode(codes[codes.length - 1]);
                }
                setChats((prev) => {
                  const current = prev.find((c) => c.id === activeId);
                  if (!current) return prev;
                  return [
                    {
                      ...current,
                      updatedAt: new Date().toISOString(),
                      title: evt.title || current.title,
                    },
                    ...prev.filter((c) => c.id !== activeId),
                  ];
                });
              }
              if (evt.type === "error") {
                throw new Error(evt.error || "Stream error");
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message !== "Stream error" &&
                !parseErr.message.includes("JSON")
              ) {
                // ignore JSON parse of partials
              } else if (
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
          prev.map((m) =>
            m.streaming ? { ...m, streaming: false } : m
          )
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
    showToast(`${next.length} file(s) attached`);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("Copied");
    setTimeout(() => setCopied(false), 1200);
  }

  function applyTemplate(t: (typeof PROBLEM_TEMPLATES)[number]) {
    setMode(t.mode);
    setInput(t.prompt);
    setSheet("none");
    inputRef.current?.focus();
    showToast(`${t.title} loaded`);
  }

  const cmdItems = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    const items: {
      id: string;
      label: string;
      hint: string;
      run: () => void;
    }[] = [
      {
        id: "new",
        label: "New conversation",
        hint: "⌘N",
        run: () => {
          newChat();
          setSheet("none");
        },
      },
      {
        id: "templates",
        label: "Browse problem templates",
        hint: "Solve faster",
        run: () => setSheet("templates"),
      },
      {
        id: "export",
        label: "Export chat as Markdown",
        hint: "⌘⇧E",
        run: () => {
          exportActive();
          setSheet("none");
        },
      },
      {
        id: "settings",
        label: "Open settings",
        hint: "Account & model",
        run: () => openSettings(),
      },
      {
        id: "model",
        label: "Switch model",
        hint: currentModel.label,
        run: () => setSheet("model"),
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        hint: "Reference",
        run: () => setSheet("shortcuts"),
      },
      ...WORK_MODES.map((m) => ({
        id: `mode-${m.id}`,
        label: `Mode · ${m.label}`,
        hint: m.short,
        run: () => {
          changeMode(m.id as WorkModeId);
          setSheet("none");
          showToast(`${m.label} mode`);
        },
      })),
      ...PROBLEM_TEMPLATES.map((t) => ({
        id: `tpl-${t.id}`,
        label: t.title,
        hint: t.category,
        run: () => applyTemplate(t),
      })),
    ];
    if (!q) return items.slice(0, 12);
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.hint.toLowerCase().includes(q)
    );
  }, [cmdQuery, currentModel.label]);

  if (!ready || !user) {
    return (
      <div className="relative flex h-screen items-center justify-center">
        <div className="aura-stage" />
        <motion.div
          className="relative z-10 flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm text-[var(--fg-muted)]">Opening workspace…</p>
        </motion.div>
      </div>
    );
  }

  const ModeIcon = MODE_ICONS[currentMode.icon] || Sparkles;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div className="aura-stage" />
      <div className="mesh-glow" />

      <div className="relative z-10 flex h-full">
        {/* ── Library ── */}
        <aside
          className={`${
            libraryOpen ? "w-[292px]" : "w-[72px]"
          } flex shrink-0 flex-col border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] transition-[width] duration-300 ease-out`}
        >
          <div className="flex h-[72px] items-center gap-3 px-4">
            <motion.div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)]"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
            {libraryOpen && (
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-tight">Aura</p>
                <p className="truncate text-[11px] text-[var(--fg-muted)]">
                  AI workspace
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 px-3">
            <motion.button
              type="button"
              onClick={() => newChat()}
              whileTap={{ scale: 0.98 }}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-[13px] font-medium text-[var(--accent-fg)] transition hover:opacity-90 ${
                libraryOpen ? "px-4" : ""
              }`}
            >
              <Plus className="h-4 w-4" />
              {libraryOpen && "New conversation"}
            </motion.button>
            {libraryOpen && (
              <button
                type="button"
                onClick={() => setSheet("templates")}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] text-[12px] font-medium text-[var(--fg-secondary)] transition hover:border-[var(--line-strong)] hover:text-[var(--fg)]"
              >
                <Wand2 className="h-3.5 w-3.5 text-[var(--tint)]" />
                Problem templates
              </button>
            )}
          </div>

          {libraryOpen && (
            <div className="mt-4 px-3">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3">
                <Search className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chats"
                  className="w-full bg-transparent text-[13px] placeholder:text-[var(--fg-muted)]"
                />
              </div>
            </div>
          )}

          <div className="scroll-quiet mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {libraryOpen && (
              <p className="px-2 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                Library
              </p>
            )}
            <AnimatePresence initial={false}>
              {filteredChats.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`group relative flex items-center rounded-xl transition ${
                    c.id === activeId
                      ? "bg-[var(--bg-elevated)] ring-1 ring-[var(--line)]"
                      : "hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  {renamingId === c.id && libraryOpen ? (
                    <form
                      className="flex w-full items-center gap-2 px-2 py-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveRename(c.id);
                      }}
                    >
                      <input
                        autoFocus
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={() => saveRename(c.id)}
                        className="field h-8 text-[12px]"
                      />
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => selectChat(c.id)}
                        className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left ${
                          libraryOpen ? "" : "justify-center"
                        }`}
                        title={c.title}
                      >
                        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--tint-soft)] text-[10px] font-semibold text-[var(--tint)]">
                          {c.title.slice(0, 1).toUpperCase()}
                          {c.pinned && (
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--tint)]" />
                          )}
                        </span>
                        {libraryOpen && (
                          <span className="truncate text-[13px]">{c.title}</span>
                        )}
                      </button>
                      {libraryOpen && (
                        <div className="mr-1 flex opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            className="icon-btn h-8 w-8"
                            title={c.pinned ? "Unpin" : "Pin"}
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
                            className="icon-btn h-8 w-8"
                            title="Rename"
                            onClick={() => {
                              setRenamingId(c.id);
                              setRenameText(c.title);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn h-8 w-8"
                            onClick={() => deleteChat(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-1 border-t border-[var(--line)] p-3">
            <button
              type="button"
              onClick={() => setSheet("command")}
              className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] text-[var(--fg-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)] ${
                libraryOpen ? "" : "justify-center"
              }`}
            >
              <Command className="h-4 w-4" />
              {libraryOpen && (
                <span className="flex flex-1 items-center justify-between">
                  Command
                  <kbd className="kbd">⌘K</kbd>
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={openSettings}
              className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] text-[var(--fg-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)] ${
                libraryOpen ? "" : "justify-center"
              }`}
            >
              <Settings className="h-4 w-4" />
              {libraryOpen && "Settings"}
            </button>
            <button
              type="button"
              onClick={() => setLibraryOpen((v) => !v)}
              className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-elevated)] ${
                libraryOpen ? "" : "justify-center"
              }`}
            >
              <Layers className="h-4 w-4" />
              {libraryOpen && "Collapse"}
            </button>
            {libraryOpen && (
              <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tint-soft)] text-[12px] font-semibold text-[var(--tint)]">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{user.name}</p>
                  <p className="truncate text-[10px] text-[var(--fg-muted)]">
                    {user.email}
                  </p>
                </div>
                <button type="button" className="icon-btn h-8 w-8" onClick={logout}>
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Stage ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 px-5 md:px-8">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium tracking-tight">
                {activeChat?.title || "New conversation"}
              </p>
              <p className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                <span>
                  {messages.filter((m) => !m.streaming || m.content).length}{" "}
                  messages
                </span>
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1">
                  <ModeIcon className="h-3 w-3 text-[var(--tint)]" />
                  {currentMode.label}
                </span>
                {!user.hasApiKey && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="text-[var(--danger)]">API key needed</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setSheet("templates")}
                className="pill hidden sm:inline-flex"
              >
                <Wand2 className="h-3.5 w-3.5 text-[var(--tint)]" />
                Templates
              </button>
              <button type="button" onClick={exportActive} className="icon-btn" title="Export">
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSheet("model")}
                className="pill"
              >
                <span className="hidden h-1.5 w-1.5 rounded-full bg-[var(--tint)] sm:inline-block" />
                <span className="max-w-[120px] truncate">{currentModel.label}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() =>
                  quickTheme(user.theme === "dark" ? "light" : "dark")
                }
                className="icon-btn"
              >
                {user.theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = !user.showCanvas;
                  const res = await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ showCanvas: next }),
                  });
                  const data = await res.json();
                  if (res.ok) applyUser(data.user);
                }}
                className={`pill ${showCanvas ? "active" : ""}`}
              >
                <FileCode2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Canvas</span>
              </button>
            </div>
          </header>

          {/* Mode strip */}
          <div className="scroll-quiet flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-2 md:px-8">
            {WORK_MODES.map((m) => {
              const Icon = MODE_ICONS[m.icon] || Sparkles;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => changeMode(m.id as WorkModeId)}
                  className={`mode-chip ${active ? "active" : ""}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="flex min-h-0 flex-1">
            <section className="relative flex min-w-0 flex-1 flex-col">
              <div
                ref={listRef}
                className="scroll-quiet flex-1 overflow-y-auto px-5 pb-52 md:px-10"
              >
                {messages.length === 0 && !loading ? (
                  <motion.div
                    className="mx-auto flex max-w-2xl flex-col pt-12 md:pt-20"
                    {...fadeUp}
                    transition={{ duration: 0.45 }}
                  >
                    <motion.p
                      className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--tint)]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 }}
                    >
                      Ready when you are
                    </motion.p>
                    <h1 className="display text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.05] text-[var(--fg)]">
                      Solve real problems.
                      <br />
                      <span className="italic text-[var(--fg-muted)]">
                        Not just chat.
                      </span>
                    </h1>
                    <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--fg-secondary)]">
                      Modes for writing, code, planning, and decisions. Templates
                      for the work people actually need done — plus a live code
                      canvas when you build.
                    </p>
                    {!user.hasApiKey && (
                      <motion.button
                        type="button"
                        onClick={openSettings}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-8 h-11 self-start rounded-full bg-[var(--accent)] px-6 text-[13px] font-medium text-[var(--accent-fg)]"
                      >
                        Connect API key
                      </motion.button>
                    )}

                    <div className="mt-10">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                          Start with a problem
                        </p>
                        <button
                          type="button"
                          className="text-[12px] text-[var(--tint)]"
                          onClick={() => setSheet("templates")}
                        >
                          View all
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {PROBLEM_TEMPLATES.slice(0, 6).map((t, i) => (
                          <motion.button
                            key={t.id}
                            type="button"
                            onClick={() => applyTemplate(t)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.06 * i, ...spring }}
                            whileHover={{ y: -2 }}
                            className="group rounded-[18px] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-left transition hover:border-[var(--line-strong)] hover:shadow-[var(--shadow)]"
                          >
                            <span className="mb-2 flex items-center justify-between">
                              <span className="rounded-full bg-[var(--tint-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--tint)]">
                                {t.category}
                              </span>
                              <span className="text-[10px] text-[var(--fg-muted)] opacity-0 transition group-hover:opacity-100">
                                {modeById(t.mode).label}
                              </span>
                            </span>
                            <span className="block text-[13px] font-medium leading-snug">
                              {t.title}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="mx-auto max-w-2xl space-y-9 py-6">
                    <AnimatePresence initial={false}>
                      {messages.map((msg, idx) => {
                        const codes =
                          msg.role === "assistant"
                            ? extractCodeBlocks(msg.content)
                            : [];
                        const body =
                          msg.role === "assistant"
                            ? stripCodeBlocks(msg.content) || msg.content
                            : msg.content;
                        const isUser = msg.role === "user";
                        const isEditing = editingMsgId === msg.id;

                        return (
                          <motion.article
                            key={msg.id}
                            layout
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...spring, delay: Math.min(idx * 0.02, 0.12) }}
                            className={isUser ? "ml-auto max-w-[90%]" : "max-w-full"}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <span className="font-mono text-[10px] tabular-nums text-[var(--fg-muted)]">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                                {isUser ? "You" : "Aura"}
                              </span>
                              {msg.streaming && <StreamingDots />}
                            </div>

                            {isEditing ? (
                              <div className="glass rounded-[20px] p-4">
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="min-h-[100px] w-full resize-y bg-transparent text-[15px] leading-relaxed"
                                  autoFocus
                                />
                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    className="pill"
                                    onClick={() => setEditingMsgId(null)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="pill active"
                                    onClick={() => submitEdit(msg.id)}
                                    disabled={loading}
                                  >
                                    Save & send
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group">
                                {isUser ? (
                                  <div className="rounded-[20px] rounded-tr-md border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-4">
                                    <MarkdownBody text={body} />
                                  </div>
                                ) : (
                                  <div className="text-[var(--fg)]">
                                    {body ? (
                                      <MarkdownBody text={body} />
                                    ) : msg.streaming ? (
                                      <p className="display text-lg italic text-[var(--fg-muted)]">
                                        Thinking…
                                      </p>
                                    ) : null}
                                    {msg.streaming && body && (
                                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--tint)] align-middle" />
                                    )}
                                  </div>
                                )}

                                {codes.length > 0 && (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {codes.map((c) => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                          setActiveCode(c);
                                          if (!user.showCanvas) {
                                            fetch("/api/settings", {
                                              method: "PATCH",
                                              headers: {
                                                "Content-Type": "application/json",
                                              },
                                              body: JSON.stringify({
                                                showCanvas: true,
                                              }),
                                            })
                                              .then((r) => r.json())
                                              .then((d) => {
                                                if (d.user) applyUser(d.user);
                                              });
                                          }
                                        }}
                                        className="pill"
                                      >
                                        <FileCode2 className="h-3.5 w-3.5 text-[var(--tint)]" />
                                        {c.lang} · Open canvas
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                                  <button
                                    type="button"
                                    className="icon-btn h-8 w-8"
                                    onClick={() => copyText(msg.content)}
                                    title="Copy"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  {isUser && (
                                    <button
                                      type="button"
                                      className="icon-btn h-8 w-8"
                                      onClick={() => {
                                        setEditingMsgId(msg.id);
                                        setEditText(msg.content);
                                      }}
                                      title="Edit"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {!isUser &&
                                    messages[messages.length - 1]?.id ===
                                      msg.id &&
                                    !msg.streaming && (
                                      <button
                                        type="button"
                                        className="icon-btn h-8 w-8"
                                        onClick={regenerate}
                                        disabled={loading}
                                        title="Regenerate"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                </div>
                              </div>
                            )}
                          </motion.article>
                        );
                      })}
                    </AnimatePresence>

                    {followUps.length > 0 && !loading && (
                      <motion.div
                        className="flex flex-wrap gap-2 pt-1"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {followUps.map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => send({ text: f })}
                            className="rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-1.5 text-[12px] text-[var(--fg-secondary)] transition hover:border-[var(--tint)] hover:text-[var(--fg)]"
                          >
                            {f}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-5 md:px-10 md:pb-7">
                <div className="pointer-events-auto mx-auto max-w-2xl">
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        {...fadeUp}
                        className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-[12px] text-[var(--danger)]"
                      >
                        <span>{error}</span>
                        <button type="button" onClick={() => setError(null)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {files.length > 0 && (
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                      {files.map((f) => (
                        <motion.div
                          key={f.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="glass flex min-w-[160px] items-center gap-3 rounded-2xl px-3 py-2.5"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--tint-soft)]">
                            {f.kind === "code" ? (
                              <FileCode2 className="h-4 w-4 text-[var(--tint)]" />
                            ) : (
                              <FileText className="h-4 w-4 text-[var(--tint)]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium">
                              {f.name}
                            </p>
                            <p className="text-[10px] text-[var(--fg-muted)]">
                              {extOf(f.name)} · {formatBytes(f.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="icon-btn h-7 w-7"
                            onClick={() =>
                              setFiles((prev) =>
                                prev.filter((x) => x.id !== f.id)
                              )
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Quick tools */}
                  {messages.length > 0 && !loading && (
                    <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                      {QUICK_TOOLS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (t.id === "improve") {
                              send({ text: t.prompt });
                            } else if (t.id === "actions" || t.id === "proscons") {
                              send({ text: t.prompt });
                            } else {
                              setInput(t.prompt);
                              inputRef.current?.focus();
                            }
                          }}
                          className="shrink-0 rounded-full border border-[var(--line)] bg-black/20 px-3 py-1 text-[11px] text-[var(--fg-muted)] backdrop-blur transition hover:border-[var(--line-strong)] hover:text-[var(--fg)]"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <motion.div
                    layout
                    className="glass rounded-[28px] p-2 shadow-[var(--shadow)]"
                  >
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
                      placeholder={`Ask Aura · ${currentMode.short}…`}
                      className="max-h-40 min-h-[48px] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed placeholder:text-[var(--fg-muted)]"
                    />
                    <div className="flex items-center justify-between px-1.5 pb-1">
                      <div className="flex items-center gap-1">
                        <input
                          ref={fileRef}
                          type="file"
                          multiple
                          accept={ACCEPTED_MEDIA}
                          className="hidden"
                          onChange={(e) => ingestFiles(e.target.files)}
                        />
                        <button
                          type="button"
                          onClick={() => setSheet("attach")}
                          className="pill"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Attach
                        </button>
                        <button
                          type="button"
                          onClick={() => setSheet("shortcuts")}
                          className="icon-btn h-9 w-9"
                          title="Shortcuts"
                        >
                          <Keyboard className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {loading ? (
                        <motion.button
                          type="button"
                          onClick={stop}
                          whileTap={{ scale: 0.94 }}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                        </motion.button>
                      ) : (
                        <motion.button
                          type="button"
                          onClick={() => send()}
                          disabled={!input.trim() && files.length === 0}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] transition disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Canvas */}
            <AnimatePresence>
              {showCanvas && (
                <motion.aside
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={spring}
                  className="hidden w-[44%] min-w-[320px] flex-col border-l border-[var(--line)] bg-black/15 lg:flex"
                >
                  <div className="flex h-[72px] items-center justify-between px-5">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                        Canvas
                      </p>
                      {activeCode && (
                        <p className="font-mono text-[12px] text-[var(--fg-secondary)]">
                          {activeCode.lang}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {allCodes.length > 1 && (
                        <select
                          className="field h-9 w-auto max-w-[120px] text-[11px]"
                          value={activeCode?.id || ""}
                          onChange={(e) => {
                            const found = allCodes.find(
                              (c) => c.id === e.target.value
                            );
                            if (found) setActiveCode(found);
                          }}
                        >
                          {allCodes.map((c, i) => (
                            <option key={c.id} value={c.id}>
                              {i + 1}. {c.lang}
                            </option>
                          ))}
                        </select>
                      )}
                      {activeCode && (
                        <button
                          type="button"
                          className="pill"
                          onClick={() => copyText(activeCode.code)}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="scroll-quiet min-h-0 flex-1 overflow-auto px-2 pb-6">
                    {activeCode ? (
                      <motion.div
                        key={activeCode.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-3 overflow-hidden rounded-[18px] border border-[var(--line)] bg-black/30"
                      >
                        <SyntaxHighlighter
                          language={
                            activeCode.lang === "text"
                              ? "javascript"
                              : activeCode.lang
                          }
                          style={oneDark}
                          customStyle={{
                            margin: 0,
                            padding: "18px 20px 32px",
                            background: "transparent",
                            fontSize: "12.5px",
                            lineHeight: 1.7,
                          }}
                          showLineNumbers
                          lineNumberStyle={{
                            minWidth: "2.4em",
                            paddingRight: "1em",
                            color: "rgba(255,255,255,0.2)",
                            userSelect: "none",
                          }}
                        >
                          {activeCode.code}
                        </SyntaxHighlighter>
                      </motion.div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center px-10 text-center">
                        <FileCode2 className="mb-3 h-8 w-8 text-[var(--fg-muted)] opacity-50" />
                        <p className="text-[14px] text-[var(--fg-secondary)]">
                          Code surfaces here
                        </p>
                        <p className="mt-1 max-w-xs text-[12px] text-[var(--fg-muted)]">
                          When Aura returns a code block, open it on this canvas.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-[var(--line)] bg-[var(--bg-glass)] px-4 py-2 text-[12px] font-medium shadow-[var(--shadow)] backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command palette */}
      <AnimatePresence>
        {sheet === "command" && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet("none")}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              transition={spring}
              className="sheet max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
                <Search className="h-4 w-4 text-[var(--fg-muted)]" />
                <input
                  autoFocus
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Search commands, modes, templates…"
                  className="w-full bg-transparent text-[15px] placeholder:text-[var(--fg-muted)]"
                />
                <kbd className="kbd">Esc</kbd>
              </div>
              <div className="scroll-quiet max-h-[50vh] overflow-y-auto p-2">
                {cmdItems.length === 0 ? (
                  <p className="px-3 py-8 text-center text-[13px] text-[var(--fg-muted)]">
                    No matches
                  </p>
                ) : (
                  cmdItems.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.run}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--bg-elevated)]"
                    >
                      <span className="text-[13px]">{item.label}</span>
                      <span className="text-[11px] text-[var(--fg-muted)]">
                        {item.hint}
                      </span>
                      {i === 0 && (
                        <span className="sr-only">first</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates */}
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
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              transition={spring}
              className="sheet wide"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[var(--line)] px-6 py-5">
                <div>
                  <h2 className="display text-3xl">Problem templates</h2>
                  <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
                    Ready-made starts for work people actually need done.
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
              <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--line)] px-5 py-3">
                {templateCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTemplateCat(c)}
                    className={`mode-chip ${templateCat === c ? "active" : ""}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="scroll-quiet grid gap-3 overflow-y-auto p-5 sm:grid-cols-2">
                {visibleTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-[18px] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-left transition hover:border-[var(--tint)] hover:bg-[var(--tint-soft)]"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--fg-muted)]">
                        {t.category}
                      </span>
                      <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--fg-muted)]">
                        {modeById(t.mode).label}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium">{t.title}</p>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--fg-secondary)]">
                      {t.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcuts */}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[var(--line)] px-6 py-5">
                <div>
                  <h2 className="display text-3xl">Shortcuts</h2>
                  <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
                    Move faster without the mouse.
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
              <div className="space-y-2 p-5">
                {[
                  ["⌘ K", "Command palette"],
                  ["⌘ N", "New conversation"],
                  ["⌘ B", "Toggle library"],
                  ["⌘ ⇧ E", "Export Markdown"],
                  ["Enter", "Send message"],
                  ["Shift + Enter", "New line"],
                  ["Esc", "Close panels"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3"
                  >
                    <span className="text-[13px] text-[var(--fg-secondary)]">
                      {v}
                    </span>
                    <kbd className="kbd">{k}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model picker */}
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
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              transition={spring}
              className="sheet wide"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[var(--line)] px-6 py-5">
                <div>
                  <h2 className="display text-3xl">Choose a model</h2>
                  <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
                    Each profile changes speed and depth of replies.
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
              <div className="scroll-quiet grid gap-3 overflow-y-auto p-5 sm:grid-cols-2">
                {GROQ_MODELS.map((m) => {
                  const active = m.id === model;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => changeModel(m.id)}
                      className={`rounded-[20px] border p-5 text-left transition ${
                        active
                          ? "border-[var(--tint)] bg-[var(--tint-soft)]"
                          : "border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--line-strong)]"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-full border border-[var(--line)] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
                          {m.tier}
                        </span>
                        <span className="text-[11px] text-[var(--fg-muted)]">
                          {m.speed}
                        </span>
                      </div>
                      <p className="text-[16px] font-semibold tracking-tight">
                        {m.label}
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
                        {m.tagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attach */}
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
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={spring}
              className="sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[var(--line)] px-6 py-5">
                <div>
                  <h2 className="display text-3xl">Attach media</h2>
                  <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
                    Drop source files into context — text & code up to ~400KB each.
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

              <div className="space-y-4 p-6">
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
                  className={`flex flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 py-12 transition ${
                    dragOver
                      ? "border-[var(--tint)] bg-[var(--tint-soft)]"
                      : "border-[var(--line)] bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tint-soft)]">
                    <Upload className="h-6 w-6 text-[var(--tint)]" />
                  </div>
                  <p className="text-[15px] font-medium">Drop files here</p>
                  <p className="mt-1 text-center text-[12px] text-[var(--fg-muted)]">
                    or browse from your library
                  </p>
                  <button
                    type="button"
                    className="mt-5 h-10 rounded-full bg-[var(--accent)] px-5 text-[13px] font-medium text-[var(--accent-fg)]"
                    onClick={() => fileRef.current?.click()}
                  >
                    Browse files
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: FileCode2, label: "Code", desc: "ts, js, py…" },
                    { icon: FileText, label: "Docs", desc: "md, txt, log" },
                    { icon: ImageIcon, label: "Data", desc: "json, csv…" },
                  ].map((x) => (
                    <button
                      key={x.label}
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-3 text-left transition hover:border-[var(--line-strong)]"
                    >
                      <x.icon className="mb-2 h-4 w-4 text-[var(--tint)]" />
                      <p className="text-[12px] font-medium">{x.label}</p>
                      <p className="text-[10px] text-[var(--fg-muted)]">{x.desc}</p>
                    </button>
                  ))}
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <p className="label mb-0">Queued ({files.length})</p>
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5"
                      >
                        <FileText className="h-4 w-4 text-[var(--fg-muted)]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px]">{f.name}</p>
                          <p className="text-[11px] text-[var(--fg-muted)]">
                            {formatBytes(f.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFiles((prev) =>
                              prev.filter((x) => x.id !== f.id)
                            )
                          }
                          className="icon-btn h-8 w-8"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="h-11 w-full rounded-full bg-[var(--accent)] text-[13px] font-medium text-[var(--accent-fg)]"
                  onClick={() => setSheet("none")}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings */}
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
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              transition={spring}
              className="sheet wide"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[var(--line)] px-6 py-5">
                <div>
                  <h2 className="display text-3xl">Settings</h2>
                  <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
                    Everything here is stored for your account and used by the app.
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

              <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                <nav className="flex gap-1 overflow-x-auto border-b border-[var(--line)] p-3 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r">
                  {(
                    [
                      ["account", "Account"],
                      ["model", "Model"],
                      ["behavior", "Behavior"],
                      ["appearance", "Appearance"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSettingsTab(id)}
                      className={`rounded-xl px-3 py-2.5 text-left text-[13px] transition ${
                        settingsTab === id
                          ? "bg-[var(--bg-elevated)] font-medium text-[var(--fg)]"
                          : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>

                <div className="scroll-quiet min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  {settingsTab === "account" && (
                    <>
                      <div>
                        <label className="label">Display name</label>
                        <input
                          className="field"
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">Email</label>
                        <input
                          className="field opacity-60"
                          value={user.email}
                          disabled
                        />
                      </div>
                      <div>
                        <label className="label">
                          Groq API key{" "}
                          {user.hasApiKey && (
                            <span className="text-[var(--success)]">
                              · connected
                            </span>
                          )}
                        </label>
                        <input
                          className="field font-mono text-[13px]"
                          type="password"
                          value={apiKeyDraft}
                          onChange={(e) => setApiKeyDraft(e.target.value)}
                          placeholder={
                            user.hasApiKey ? "••••••••  replace key" : "gsk_…"
                          }
                        />
                        <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                          Saved on your account. Sent only from the server to Groq
                          — never shown back in full.
                        </p>
                      </div>
                    </>
                  )}

                  {settingsTab === "model" && (
                    <>
                      <div>
                        <label className="label">Default model</label>
                        <div className="grid gap-2">
                          {GROQ_MODELS.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setModel(m.id)}
                              className={`rounded-2xl border px-4 py-3 text-left ${
                                model === m.id
                                  ? "border-[var(--tint)] bg-[var(--tint-soft)]"
                                  : "border-[var(--line)]"
                              }`}
                            >
                              <p className="text-[13px] font-medium">{m.label}</p>
                              <p className="text-[11px] text-[var(--fg-muted)]">
                                {m.tagline}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="label">
                          Temperature · {tempDraft.toFixed(1)}
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
                        <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
                          Lower = focused. Higher = more creative.
                        </p>
                      </div>
                      <div>
                        <label className="label">Max tokens</label>
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
                      <div>
                        <label className="label">System prompt</label>
                        <textarea
                          className="field-area"
                          value={promptDraft}
                          onChange={(e) => setPromptDraft(e.target.value)}
                        />
                        <button
                          type="button"
                          className="mt-2 text-[12px] text-[var(--tint)]"
                          onClick={() => setPromptDraft(DEFAULT_SYSTEM_PROMPT)}
                        >
                          Reset to default
                        </button>
                      </div>
                    </>
                  )}

                  {settingsTab === "behavior" && (
                    <>
                      <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] px-4 py-4">
                        <div>
                          <p className="text-[14px] font-medium">Enter to send</p>
                          <p className="text-[12px] text-[var(--fg-muted)]">
                            Shift+Enter inserts a new line
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${enterDraft ? "on" : ""}`}
                          onClick={() => setEnterDraft((v) => !v)}
                          aria-label="Toggle enter to send"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] px-4 py-4">
                        <div>
                          <p className="text-[14px] font-medium">Show Canvas</p>
                          <p className="text-[12px] text-[var(--fg-muted)]">
                            Open code panel by default
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${canvasDraft ? "on" : ""}`}
                          onClick={() => setCanvasDraft((v) => !v)}
                          aria-label="Toggle canvas"
                        />
                      </label>
                    </>
                  )}

                  {settingsTab === "appearance" && (
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          ["dark", "Dark", "Deep product stage"],
                          ["light", "Light", "Soft paper light"],
                        ] as const
                      ).map(([id, title, desc]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setThemeDraft(id)}
                          className={`rounded-[20px] border p-5 text-left ${
                            themeDraft === id
                              ? "border-[var(--tint)] bg-[var(--tint-soft)]"
                              : "border-[var(--line)]"
                          }`}
                        >
                          <p className="text-[14px] font-medium">{title}</p>
                          <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                            {desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-4">
                <button
                  type="button"
                  className="pill"
                  onClick={() => setSheet("none")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="h-10 rounded-full bg-[var(--accent)] px-5 text-[13px] font-medium text-[var(--accent-fg)] disabled:opacity-50"
                  onClick={saveSettings}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
