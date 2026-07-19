export type Lang = "en" | "id";

export const LANG_OPTIONS: { id: Lang; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "id", label: "Indonesian", native: "Bahasa Indonesia" },
];

const en = {
  // Meta / loading
  constructingWorkspace: "Constructing Workspace…",
  brand: "Construct",

  // Nav
  collaborate: "Collaborate",
  focus: "Focus",
  workspace: "Workspace",
  history: "History",
  templates: "Templates",
  assistant: "Assistant",
  settings: "Settings",
  model: "Model",

  // Greeting
  goodMorning: "Good morning",
  goodAfternoon: "Good afternoon",
  goodEvening: "Good evening",
  goodNight: "Good night",
  emptySubtitle:
    "Start a new conversation or use a template to get going.",
  startChatting: "Start chatting",
  addApiKey: "Add API key",
  messagePlaceholder: "Message Construct…",
  thinking: "Thinking…",
  constructingResponse: "Constructing response…",
  readyWhenYouAre: "Ready when you are. Type a message to begin.",

  // Roles
  you: "You",
  message: "Message",

  // Actions
  new: "New",
  attach: "Attach",
  code: "Code",
  preview: "Preview",
  chat: "Chat",
  copy: "Copy",
  edit: "Edit",
  regenerate: "Regenerate",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  saveAndSend: "Save & send",
  done: "Done",
  dismiss: "dismiss",
  signOut: "Sign out of account",
  search: "Search",
  export: "Export",
  delete: "Delete",
  pin: "Pin",
  unpin: "Unpin",
  rename: "Rename",
  close: "Close",
  stop: "Stop",
  readAloud: "Read aloud",
  stopReading: "Stop reading",
  newConversation: "New conversation",
  attachFiles: "Attach files",
  attachMenuTitle: "Add to message",
  attachCamera: "Camera",
  attachPhoto: "Photos",
  attachFile: "Files",
  attachPlugin: "Plugins",
  pluginSoon: "Plugins coming soon",
  toolsTitle: "Tools",
  toolsShort: "Tools",
  toolsPermission: "Allow tools",
  toolsPermissionHint:
    "When enabled, Construct may use creative tools you pick below.",
  toolGenImage: "Generate image",
  toolGenVideo: "Generate video",
  toolCanvas: "Canvas",
  toolConvert: "Convert file",
  toolCompress: "Compress file",
  toolTranscribe: "Transcribe",
  toolTable: "Data table",
  toolDiagram: "Diagram",
  templatesModes: "Templates & modes",
  focusCodeOnCanvas: "Focus code on canvas",
  previewWebsite: "Preview website",
  showHideAssistant: "Show or hide chat",
  toggleTheme: "Toggle theme",
  exportChat: "Export chat",
  editMessage: "Edit message",
  copyCode: "Copy code",
  aiModel: "AI model",

  // Toasts / errors
  deleted: "Deleted",
  saved: "Saved",
  exported: "Exported",
  nothingToExport: "Nothing to export",
  noMessagesToExport: "No messages to export",
  chatExported: "Chat exported",
  allChatsCleared: "All chats cleared",
  failedClearChats: "Failed to clear chats",
  noCodeYet: "No code yet — ask for code first",
  codeOnCanvas: "Code on canvas",
  copied: "Copied",
  modeSuffix: "mode",
  addApiKeyError: "Add your Groq API key in Settings to chat.",
  requestFailed: "Request failed",
  noStream: "No stream",
  reviewAttached: "Please review the attached file(s).",

  // Focus
  focusMode: "Focus mode",
  conversation: "Conversation",
  focusHint: "A quieter view for reading and writing.",

  // History
  historyTitle: "History",
  historySub: "Ordered by when you started each chat — stays stable.",
  searchChats: "Search chats",
  noChats: "No conversations yet",

  // Templates
  templatesTitle: "Templates",
  templatesSub: "Modes and ready-made starts.",
  workMode: "Work mode",
  all: "All",

  // Model sheet
  modelTitle: "Model",
  modelSub: "Choose speed and depth.",

  // Command
  searchCommands: "Search commands…",

  // Dock / shortcuts labels
  shortcuts: "Keyboard shortcuts",

  // Settings tabs (ChatGPT / Claude / Gemini style)
  tabGeneral: "General",
  tabAccount: "Account",
  tabModel: "Model",
  tabCapabilities: "Capabilities",
  tabPersonalization: "Personalization",
  tabMemory: "Memory",
  tabAppearance: "Appearance",
  tabData: "Data controls",
  tabPrivacy: "Privacy",
  settingsTitle: "Settings",
  settingsSub: "Manage your Construct preferences",
  generalHint: "Theme, language, and everyday chat behavior.",
  modelUnifiedHint: "Pick a default model and tune generation in one place.",
  customInstructions: "Custom instructions",
  customInstructionsHint:
    "How Construct should respond by default — tone, format, and priorities.",
  resetPrompt: "Reset",
  resetPromptFull: "Reset to default",
  themeSegment: "Theme",

  // Account
  displayName: "Display name",
  email: "Email",
  groqApiKey: "Groq API key",
  connected: "· connected",
  replaceKey: "••••••••  replace",
  accountHint: "Manage your profile details and API keys.",

  // Model settings
  defaultModel: "Default model",
  temperature: "Temperature",
  topP: "Top P",
  maxTokens: "Max output tokens",
  systemPrompt: "System Instructions / Custom Prompt",
  systemPromptHint: "Instructions injected to guide agent behavior globally.",

  // Capabilities
  capabilitiesHint:
    "Control which tools and features the AI assistant can use during conversations.",
  codeExecution: "Code Execution",
  codeExecutionDesc: "Allow the assistant to run and execute code blocks",
  fileCreation: "File Creation",
  fileCreationDesc: "Allow the assistant to create and modify files",
  webSearch: "Web Search",
  webSearchDesc: "Allow the assistant to browse the internet for information",
  enterToSend: "Enter to send",
  enterToSendDesc: "Press Enter key to instantly dispatch message",
  showCanvas: "Show spatial canvas",
  showCanvasDesc: "Enable canvas sandbox visualization layout",
  wordWrap: "Word Wrap in code editor",
  wordWrapDesc: "Wrap long lines of code in side-by-side view",
  keyboardShortcuts: "Keyboard shortcuts",

  // Memory
  memoryHint:
    "Memory allows the assistant to remember important details about you across conversations.",
  enableMemory: "Enable Memory",
  enableMemoryDesc: "Remember context and preferences across chats",
  memoryLabel: "What should the assistant remember?",
  memoryPlaceholder:
    "e.g.\n• I am a full-stack developer using Next.js\n• Prefer concise answers with code examples\n• My project uses Prisma with SQLite",
  memoryFooter:
    "These details are injected into the system prompt so the AI can personalize responses.",

  // Appearance
  themeMode: "Theme Mode",
  themeLight: "Light",
  themeLightDesc: "Bright canvas",
  themeDark: "Dark",
  themeDarkDesc: "Deep slate night",
  themeSystem: "System",
  themeSystemDesc: "OS Preference",
  fontStyle: "Font Style",
  fontSans: "Sans Serif",
  fontSansDesc: "Clean & modern",
  fontMono: "Monospace",
  fontMonoDesc: "Code-like look",
  fontSerif: "Serif",
  fontSerifDesc: "Classic readability",
  layoutDensity: "Layout Spacing Density",
  densityCozy: "Cozy",
  densityCozyDesc: "Classic spacing",
  densityCompact: "Compact",
  densityCompactDesc: "Dense feed view",
  autoRead: "Auto-read response aloud",
  autoReadDesc: "Automatically read text using text-to-speech engine",
  ttsVoice: "TTS Voice Engine",
  defaultVoice: "Default System Voice",
  language: "Interface language",
  languageDesc: "All UI text and AI replies follow this language.",
  languageEn: "English",
  languageId: "Bahasa Indonesia",

  // Privacy
  privacyTitle: "Privacy",
  privacyIntro:
    "Construct values transparent data practices. All conversations are processed locally in your browser and local SQLite database. Your API key is stored securely and sent directly to the Groq API with no intermediary.",
  howProtected: "How is your data protected?",
  howProtectedBody:
    "Construct uses standard browser storage encryption practices to secure API keys. Conversation data stays private in your local SQLite backend.",
  howUsed: "How do we use your data?",
  howUsedBody:
    "Construct does not send your conversations or coding sessions to external servers other than the official Groq API endpoint needed to complete the prompts you send.",
  preferences: "Preferences",
  locationMeta: "Location metadata",
  locationMetaDesc:
    "Allow use of general location (city/region) to improve web search relevance",
  localCache: "Local cache & assets",
  localCacheDesc:
    "Cache assets locally to speed up rendering and reduce quota usage",
  yourData: "Your data",
  exportData: "Export data",
  exportDataDesc: "Download your full chat history (JSON)",
  exportDataBtn: "Export data",
  deleteChats: "Delete conversation data",
  deleteChatsDesc: "Permanently clear all chat history",
  deleteAll: "Delete all",

  // Attach
  attachTitle: "Attach files",
  attachSub: "Add context for the assistant.",
  dropFiles: "Drop files here or browse",
  browse: "Browse files",

  // Shortcuts sheet
  shortcutsTitle: "Keyboard shortcuts",
  shortcutsSub: "Work faster with the keyboard.",
  shortcutCommand: "Command palette",
  shortcutNew: "New chat",
  shortcutClose: "Close panel",

  // Follow-ups / misc
  followUp: "Suggested",
  noCode: "No code blocks yet",
  previewTitle: "Live preview",
  maximize: "Maximize",
  minimize: "Minimize",
} as const;

export type Dict = { [K in keyof typeof en]: string };

const id: Dict = {
  constructingWorkspace: "Menyiapkan Workspace…",
  brand: "Construct",

  collaborate: "Kolaborasi",
  focus: "Fokus",
  workspace: "Workspace",
  history: "Riwayat",
  templates: "Template",
  assistant: "Asisten",
  settings: "Pengaturan",
  model: "Model",

  goodMorning: "Selamat pagi",
  goodAfternoon: "Selamat siang",
  goodEvening: "Selamat sore",
  goodNight: "Selamat malam",
  emptySubtitle:
    "Mulai percakapan baru atau gunakan template untuk membantu Anda memulai.",
  startChatting: "Mulai mengobrol",
  addApiKey: "Tambah API key",
  messagePlaceholder: "Pesan ke Construct…",
  thinking: "Berpikir…",
  constructingResponse: "Menyusun respons…",
  readyWhenYouAre: "Siap kapan saja. Ketik pesan untuk mulai.",

  you: "Anda",
  message: "Pesan",

  new: "Baru",
  attach: "Lampirkan",
  code: "Kode",
  preview: "Pratinjau",
  chat: "Chat",
  copy: "Salin",
  edit: "Edit",
  regenerate: "Buat ulang",
  cancel: "Batal",
  save: "Simpan",
  saving: "Menyimpan…",
  saveAndSend: "Simpan & kirim",
  done: "Selesai",
  dismiss: "tutup",
  signOut: "Keluar dari akun",
  search: "Cari",
  export: "Ekspor",
  delete: "Hapus",
  pin: "Sematkan",
  unpin: "Lepas sematan",
  rename: "Ubah nama",
  close: "Tutup",
  stop: "Berhenti",
  readAloud: "Baca nyaring",
  stopReading: "Hentikan bacaan",
  newConversation: "Percakapan baru",
  attachFiles: "Lampirkan file",
  attachMenuTitle: "Tambah ke pesan",
  attachCamera: "Kamera",
  attachPhoto: "Foto",
  attachFile: "File",
  attachPlugin: "Plugin",
  pluginSoon: "Plugin segera hadir",
  toolsTitle: "Tools",
  toolsShort: "Tools",
  toolsPermission: "Izinkan tools",
  toolsPermissionHint:
    "Jika aktif, Construct dapat memakai tools kreatif yang Anda pilih di bawah.",
  toolGenImage: "Generate gambar",
  toolGenVideo: "Generate video",
  toolCanvas: "Canvas",
  toolConvert: "Konversi file",
  toolCompress: "Kompres file",
  toolTranscribe: "Transkrip",
  toolTable: "Tabel data",
  toolDiagram: "Diagram",
  templatesModes: "Template & mode",
  focusCodeOnCanvas: "Fokuskan kode di kanvas",
  previewWebsite: "Pratinjau website",
  showHideAssistant: "Tampilkan atau sembunyikan chat",
  toggleTheme: "Ganti tema",
  exportChat: "Ekspor chat",
  editMessage: "Edit pesan",
  copyCode: "Salin kode",
  aiModel: "Model AI",

  deleted: "Dihapus",
  saved: "Disimpan",
  exported: "Diekspor",
  nothingToExport: "Tidak ada yang diekspor",
  noMessagesToExport: "Tidak ada pesan untuk diekspor",
  chatExported: "Chat diekspor",
  allChatsCleared: "Semua chat dihapus",
  failedClearChats: "Gagal menghapus chat",
  noCodeYet: "Belum ada kode — minta kode dulu",
  codeOnCanvas: "Kode di kanvas",
  copied: "Disalin",
  modeSuffix: "mode",
  addApiKeyError: "Tambahkan Groq API key di Pengaturan untuk mengobrol.",
  requestFailed: "Permintaan gagal",
  noStream: "Tidak ada stream",
  reviewAttached: "Mohon tinjau file terlampir.",

  focusMode: "Mode fokus",
  conversation: "Percakapan",
  focusHint: "Tampilan lebih tenang untuk membaca dan menulis.",

  historyTitle: "Riwayat",
  historySub: "Diurutkan berdasarkan kapan chat dimulai — tetap stabil.",
  searchChats: "Cari chat",
  noChats: "Belum ada percakapan",

  templatesTitle: "Template",
  templatesSub: "Mode dan awal siap pakai.",
  workMode: "Mode kerja",
  all: "Semua",

  modelTitle: "Model",
  modelSub: "Pilih kecepatan dan kedalaman.",

  searchCommands: "Cari perintah…",

  shortcuts: "Pintasan keyboard",

  tabGeneral: "Umum",
  tabAccount: "Akun",
  tabModel: "Model",
  tabCapabilities: "Kapabilitas",
  tabPersonalization: "Personalisasi",
  tabMemory: "Memori",
  tabAppearance: "Tampilan",
  tabData: "Kontrol data",
  tabPrivacy: "Privasi",
  settingsTitle: "Pengaturan",
  settingsSub: "Kelola preferensi Construct Anda",
  generalHint: "Tema, bahasa, dan perilaku chat sehari-hari.",
  modelUnifiedHint: "Pilih model default dan atur generasi di satu tempat.",
  customInstructions: "Instruksi kustom",
  customInstructionsHint:
    "Bagaimana Construct harus merespons secara default — nada, format, dan prioritas.",
  resetPrompt: "Reset",
  resetPromptFull: "Kembalikan ke default",
  themeSegment: "Tema",

  displayName: "Nama tampilan",
  email: "Email",
  groqApiKey: "Groq API key",
  connected: "· terhubung",
  replaceKey: "••••••••  ganti",
  accountHint: "Kelola detail profil dan API key Anda.",

  defaultModel: "Model default",
  temperature: "Temperature",
  topP: "Top P",
  maxTokens: "Maks token keluaran",
  systemPrompt: "Instruksi sistem / prompt kustom",
  systemPromptHint:
    "Instruksi yang disisipkan untuk memandu perilaku asisten secara global.",

  capabilitiesHint:
    "Kontrol tool dan fitur yang dapat digunakan asisten AI selama percakapan.",
  codeExecution: "Eksekusi kode",
  codeExecutionDesc: "Izinkan asisten menjalankan blok kode",
  fileCreation: "Pembuatan file",
  fileCreationDesc: "Izinkan asisten membuat dan mengubah file",
  webSearch: "Pencarian web",
  webSearchDesc: "Izinkan asisten menelusuri internet untuk informasi",
  enterToSend: "Enter untuk kirim",
  enterToSendDesc: "Tekan Enter untuk langsung mengirim pesan",
  showCanvas: "Tampilkan kanvas spasial",
  showCanvasDesc: "Aktifkan layout visualisasi sandbox kanvas",
  wordWrap: "Word wrap di editor kode",
  wordWrapDesc: "Bungkus baris panjang di tampilan berdampingan",
  keyboardShortcuts: "Pintasan keyboard",

  memoryHint:
    "Memori memungkinkan asisten mengingat detail penting tentang Anda di seluruh percakapan.",
  enableMemory: "Aktifkan memori",
  enableMemoryDesc: "Ingat konteks dan preferensi antar chat",
  memoryLabel: "Apa yang harus diingat asisten?",
  memoryPlaceholder:
    "contoh:\n• Saya full-stack developer yang memakai Next.js\n• Jawab ringkas dengan contoh kode\n• Proyek saya memakai Prisma dengan SQLite",
  memoryFooter:
    "Detail ini disisipkan ke system prompt agar AI dapat mempersonalisasi respons.",

  themeMode: "Mode tema",
  themeLight: "Terang",
  themeLightDesc: "Kanvas cerah",
  themeDark: "Gelap",
  themeDarkDesc: "Malam slate dalam",
  themeSystem: "Sistem",
  themeSystemDesc: "Preferensi OS",
  fontStyle: "Gaya font",
  fontSans: "Sans Serif",
  fontSansDesc: "Bersih & modern",
  fontMono: "Monospace",
  fontMonoDesc: "Tampilan seperti kode",
  fontSerif: "Serif",
  fontSerifDesc: "Keterbacaan klasik",
  layoutDensity: "Kepadatan layout",
  densityCozy: "Nyaman",
  densityCozyDesc: "Jarak klasik",
  densityCompact: "Padat",
  densityCompactDesc: "Feed lebih rapat",
  autoRead: "Baca respons otomatis",
  autoReadDesc: "Baca teks otomatis dengan text-to-speech",
  ttsVoice: "Mesin suara TTS",
  defaultVoice: "Suara sistem default",
  language: "Bahasa antarmuka",
  languageDesc: "Semua teks UI dan balasan AI mengikuti bahasa ini.",
  languageEn: "English",
  languageId: "Bahasa Indonesia",

  privacyTitle: "Privasi",
  privacyIntro:
    "Construct menjunjung tinggi praktik pengelolaan data yang transparan. Seluruh percakapan Anda diproses secara lokal di browser dan basis data SQLite lokal Anda. Kunci API Anda disimpan aman dan dikirim langsung ke Groq API tanpa perantara.",
  howProtected: "Bagaimana data Anda dilindungi?",
  howProtectedBody:
    "Construct menggunakan praktik enkripsi penyimpanan browser standar untuk mengamankan API keys. Database percakapan sepenuhnya disimpan secara privat di dalam backend SQLite lokal Anda.",
  howUsed: "Bagaimana kami menggunakan data Anda?",
  howUsedBody:
    "Construct tidak mengirimkan percakapan atau sesi coding Anda ke server eksternal selain endpoint Groq API resmi untuk melengkapi prompt yang Anda kirimkan.",
  preferences: "Preferensi",
  locationMeta: "Metadata lokasi",
  locationMetaDesc:
    "Izinkan penggunaan lokasi umum (kota/wilayah) untuk meningkatkan relevansi pencarian web",
  localCache: "Local cache & aset",
  localCacheDesc:
    "Cache aset secara lokal untuk mempercepat rendering dan mengurangi pemakaian kuota",
  yourData: "Data Anda",
  exportData: "Ekspor data",
  exportDataDesc: "Unduh seluruh riwayat obrolan Anda (JSON)",
  exportDataBtn: "Ekspor data",
  deleteChats: "Hapus data percakapan",
  deleteChatsDesc: "Kosongkan semua riwayat chat secara permanen",
  deleteAll: "Hapus semua",

  attachTitle: "Lampirkan file",
  attachSub: "Tambahkan konteks untuk asisten.",
  dropFiles: "Lepas file di sini atau telusuri",
  browse: "Telusuri file",

  shortcutsTitle: "Pintasan keyboard",
  shortcutsSub: "Bekerja lebih cepat dengan keyboard.",
  shortcutCommand: "Palet perintah",
  shortcutNew: "Chat baru",
  shortcutClose: "Tutup panel",

  followUp: "Saran",
  noCode: "Belum ada blok kode",
  previewTitle: "Pratinjau langsung",
  maximize: "Perbesar",
  minimize: "Perkecil",
};

const DICTS: Record<Lang, Dict> = { en, id };

export function t(lang: Lang): Dict {
  return DICTS[lang] || DICTS.en;
}

export function languageInstruction(lang: Lang): string {
  if (lang === "id") {
    return "Always respond in Bahasa Indonesia unless the user explicitly asks for another language. Keep technical terms clear; code and identifiers stay in their original form.";
  }
  return "Always respond in English unless the user explicitly asks for another language. Keep technical terms clear; code and identifiers stay in their original form.";
}

export function detectDefaultLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("id") ? "id" : "en";
}
