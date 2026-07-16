'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp, Key, Sparkles, Code2, PanelLeft, PanelRight,
  SlidersHorizontal, Bot, User, Copy, Check, Terminal,
  Cpu, Zap, Plus, MessageSquare, Trash2, Globe, FileCode2,
  Download, Search, ShieldCheck, ChevronRight, Layers, LayoutGrid
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  codeSnippet?: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

export default function Home() {
  // Config States
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('You are AURA, an elite AI engineering assistant.');
  const [webSearch, setWebSearch] = useState(false);
  const [reasoningMode, setReasoningMode] = useState(false);
  
  // Workspace & Chat Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: '1', title: 'New Workspace Chat', messages: [], updatedAt: 'Just now' }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('1');

  // UI Panels
  const [showSidebar, setShowSidebar] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession.messages, isLoading]);

  // Extract code block if AI response contains markdown code
  const processAIResponse = (text: string) => {
    const codeBlockMatch = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return {
      cleanText: text,
      code: codeBlockMatch ? codeBlockMatch[1] : undefined
    };
  };

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || input;
    if (!textToSend.trim() || isLoading) return;

    if (!apiKey) {
      setShowApiModal(true);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...currentSession.messages, userMsg];
    
    // Update active session with user message
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: s.messages.length === 0 ? textToSend.slice(0, 24) + '...' : s.title,
          messages: updatedMessages
        };
      }
      return s;
    }));

    if (!overridePrompt) setInput('');
    setIsLoading(true);

    try {
      const payloadMessages = [
        { role: 'system', content: `${systemPrompt} ${reasoningMode ? 'Provide deep step-by-step reasoning before answering.' : ''}` },
        ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, apiKey }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request error');

      const { cleanText, code } = processAIResponse(data.message);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanText,
        codeSnippet: code,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...updatedMessages, aiMsg] };
        }
        return s;
      }));

      if (code) setActiveArtifact(code);
    } catch (err: any) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [
              ...updatedMessages,
              {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `⚠️ System Error: ${err.message}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSess: ChatSession = {
      id: newId,
      title: 'New Chat Session',
      messages: [],
      updatedAt: 'Just now'
    };
    setSessions([newSess, ...sessions]);
    setActiveSessionId(newId);
    setActiveArtifact(null);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) return;
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) setActiveSessionId(filtered[0].id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-[#08080a] text-[#e4e4e7] font-sans overflow-hidden antialiased selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* 1. LEFT SIDEBAR: WORKSPACE & HISTORY */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-[#0c0c0e] border-r border-zinc-800/60 flex flex-col justify-between shrink-0 z-20"
          >
            {/* Sidebar Top */}
            <div className="p-4 space-y-4">
              {/* Workspace Selector */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="font-semibold text-xs tracking-wide text-zinc-100">AURA WORKSPACE</span>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              </div>

              {/* New Chat Button */}
              <button
                onClick={createNewSession}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 flex items-center justify-between transition-all group"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>New Session</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">⌘N</span>
              </button>

              {/* Preset Persona Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold px-1">
                  Engine Modes
                </span>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {[
                    { label: 'Code Architect', prompt: 'You are a Senior Software Architect.' },
                    { label: 'UI/UX Expert', prompt: 'You are a World-Class Frontend Engineer.' },
                    { label: 'Deep Analysis', prompt: 'Provide rigorous critical analysis.' },
                    { label: 'Creative Tech', prompt: 'Innovate with out-of-the-box thinking.' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSystemPrompt(preset.prompt)}
                      className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/50 hover:border-amber-500/40 text-[11px] text-zinc-400 hover:text-zinc-200 text-left truncate transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* History List */}
              <div className="space-y-1 pt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold px-1">
                  Recent Sessions
                </span>
                <div className="max-h-64 overflow-y-auto space-y-1 pt-1 pr-1">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setActiveSessionId(s.id);
                        const codeMsg = s.messages.find(m => m.codeSnippet);
                        if (codeMsg) setActiveArtifact(codeMsg.codeSnippet || null);
                      }}
                      className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                        s.id === activeSessionId
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 font-medium'
                          : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{s.title}</span>
                      </div>
                      {sessions.length > 1 && (
                        <button
                          onClick={(e) => deleteSession(s.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Bottom Status */}
            <div className="p-4 border-t border-zinc-800/60 space-y-2 bg-[#0a0a0c]">
              <button
                onClick={() => setShowApiModal(true)}
                className="w-full p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/60 flex items-center justify-between text-xs text-zinc-300"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Groq API Key</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">
                  {apiKey ? 'CONNECTED' : 'REQUIRED'}
                </span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. MAIN CANVAS AREA */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* HEADER CONTROL BAR */}
        <header className="h-14 border-b border-zinc-800/60 px-4 md:px-6 flex items-center justify-between bg-[#08080a]/90 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-200">{currentSession.title}</span>
              <span className="text-[10px] font-mono bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-800">
                {currentSession.messages.length} msgs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model Selector */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50 cursor-pointer font-mono"
            >
              <option value="llama-3.3-70b-versatile">llama-3.3-70b (Pro)</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b (Instant)</option>
              <option value="mixtral-8x7b-32768">mixtral-8x7b</option>
            </select>

            {/* Tuning Drawer Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg border text-xs transition-all ${
                showSettings 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Hyperparameters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* SYSTEM TUNER DRAWER */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900/60 border-b border-zinc-800 p-4 px-6 space-y-3 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-amber-400"/> System Prompt Override</span>
                <span>Temperature: {temperature}</span>
              </div>
              <input
                type="text"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50 font-mono"
              />
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CHAT MESSAGES STREAM */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-6">
          {currentSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-8 py-12">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Aura Intelligence Engine Live</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-100">
                  What are we building today?
                </h1>
              </div>

              {/* Feature Grid Pills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-left">
                {[
                  { title: "React Glassmorphism UI", desc: "Build sleek Next.js components", icon: Code2 },
                  { title: "System Architecture", desc: "Design scalable backend models", icon: Layers },
                  { title: "Data Queue Pipeline", desc: "Write async TypeScript algorithms", icon: Terminal },
                  { title: "API Endpoint Spec", desc: "Structure REST/GraphQL schemas", icon: Globe },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(`${item.title}: ${item.desc}`)}
                    className="p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60 hover:border-amber-500/40 transition-all group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-amber-400" />
                        <p className="text-xs font-medium text-zinc-200">{item.title}</p>
                      </div>
                      <p className="text-[11px] text-zinc-500">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            currentSession.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 max-w-3xl mx-auto"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <div className="flex items-center gap-2">
                    {msg.role === 'user' ? (
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className="uppercase tracking-wider">{msg.role}</span>
                  </div>
                  <span>{msg.timestamp}</span>
                </div>

                <div className={`text-sm leading-relaxed whitespace-pre-wrap p-5 rounded-2xl border ${
                  msg.role === 'user' 
                    ? 'bg-zinc-900/80 border-zinc-800/80 text-zinc-100 shadow-lg' 
                    : 'bg-zinc-950/60 border-zinc-800/50 text-zinc-200'
                }`}>
                  {msg.content}

                  {msg.codeSnippet && (
                    <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-amber-400" /> Generated Code Artifact
                      </span>
                      <button
                        onClick={() => setActiveArtifact(msg.codeSnippet || null)}
                        className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Open Inspector</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono animate-pulse max-w-3xl mx-auto">
              <Cpu className="w-4 h-4 animate-spin" />
              <span>Aura Neural Processing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. COMMERCIAL POWER INPUT BAR */}
        <div className="p-4 bg-[#08080a] border-t border-zinc-800/40">
          <div className="max-w-3xl mx-auto space-y-2">
            
            {/* Quick Feature Toggles */}
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={() => setReasoningMode(!reasoningMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
                  reasoningMode 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Deep Reasoning</span>
              </button>

              <button
                onClick={() => setWebSearch(!webSearch)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
                  webSearch 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Web Context</span>
              </button>
            </div>

            {/* Input Field Capsule */}
            <div className="relative flex items-center bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800 rounded-2xl p-2 shadow-2xl focus-within:border-amber-500/50 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask, refactor code, or command AI..."
                rows={1}
                className="w-full bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-32"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-20 transition-all shrink-0"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 4. RIGHT ARTIFACT & CODE INSPECTOR PANEL */}
      <AnimatePresence>
        {activeArtifact && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '45%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-[#0a0a0d] border-l border-zinc-800/80 flex flex-col hidden lg:flex shrink-0 z-20"
          >
            {/* Inspector Header */}
            <div className="h-14 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-[#0c0c0e]">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Artifact Workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(activeArtifact)}
                  className="p-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 rounded-lg border border-zinc-800 flex items-center gap-1.5 transition-all"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setActiveArtifact(null)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-900"
                >
                  <PanelRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Workspace Display */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-amber-100/90 bg-[#050507]">
              <pre className="whitespace-pre-wrap leading-relaxed">
                <code>{activeArtifact}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API KEY MODAL */}
      <AnimatePresence>
        {showApiModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Connect Groq API Key
                </h3>
                <p className="text-xs text-zinc-400">Masukkan API Key kamu untuk mengaktifkan seluruh fitur suite.</p>
              </div>

              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-500/50"
              />

              <button
                onClick={() => setShowApiModal(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-medium hover:bg-amber-400 transition-colors"
              >
                Save & Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}