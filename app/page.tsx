'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp, Key, Sparkles, Code2, PanelRightClose, PanelRight,
  SlidersHorizontal, Bot, User, Copy, Check, Terminal,
  Cpu, Zap, RefreshCw, Layers
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  codeSnippet?: string;
  timestamp: string;
}

export default function Home() {
  // Config States
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('You are an elite AI system designed with precision.');
  
  // UI Controls
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!overridePrompt) setInput('');
    setIsLoading(true);

    try {
      // Format messages with system prompt
      const payloadMessages = [
        { role: 'system', content: systemPrompt },
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

      setMessages([...updatedMessages, aiMsg]);
      if (code) setActiveArtifact(code);
    } catch (err: any) {
      setMessages([
        ...updatedMessages,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-[#070709] text-[#e4e4e7] font-sans overflow-hidden antialiased selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* LEFT CANVAS: COMMAND & CHAT THREAD */}
      <div className="flex-1 flex flex-col h-full relative border-r border-zinc-800/40">
        
        {/* Awwwards Dynamic Header */}
        <header className="h-16 border-b border-zinc-800/40 px-6 flex items-center justify-between bg-[#070709]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-zinc-800 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-medium tracking-tight text-zinc-100 flex items-center gap-2">
                AURA <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Pro Studio</span>
              </h1>
            </div>
          </div>

          {/* Controls Dock Header */}
          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer font-mono"
            >
              <option value="llama-3.3-70b-versatile">llama-3.3-70b</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b (Ultra Fast)</option>
              <option value="mixtral-8x7b-32768">mixtral-8x7b</option>
            </select>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg border text-xs transition-all ${
                showSettings 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowApiModal(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-all flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{apiKey ? 'Key Saved' : 'Set Key'}</span>
            </button>
          </div>
        </header>

        {/* SYSTEM PROMPT & TUNING DRAWER */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900/40 border-b border-zinc-800/60 p-4 px-6 space-y-3 backdrop-blur-xl overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-amber-400"/> System Persona</span>
                <span>Temp: {temperature}</span>
              </div>
              <input
                type="text"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
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

        {/* MESSAGES THREAD */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/10">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-normal text-zinc-100 tracking-tight">Next-Gen Workspace</h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Dual-panel intelligence engine. Codes, artifacts, and outputs automatically render in the workspace inspector.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full text-left">
                {[
                  "Write a React component for modern glassmorphism UI",
                  "Design an algorithm for async task queue with priority",
                  "Draft a system architecture summary"
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-3 text-xs rounded-xl bg-zinc-900/30 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <ArrowUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 rotate-45" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 max-w-2xl"
              >
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                  {msg.role === 'user' ? (
                    <User className="w-3 h-3 text-zinc-400" />
                  ) : (
                    <Bot className="w-3 h-3 text-amber-400" />
                  )}
                  <span className="uppercase">{msg.role}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className={`text-sm leading-relaxed whitespace-pre-wrap p-4 rounded-2xl border ${
                  msg.role === 'user' 
                    ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-200' 
                    : 'bg-zinc-950/40 border-zinc-800/40 text-zinc-100'
                }`}>
                  {msg.content}

                  {msg.codeSnippet && (
                    <button
                      onClick={() => setActiveArtifact(msg.codeSnippet || null)}
                      className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Inspect Code Artifact</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono animate-pulse">
              <Cpu className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Engine thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* FLOATING FLOATING COMMAND DOCK */}
        <div className="p-4 bg-[#070709]">
          <div className="max-w-2xl mx-auto relative flex items-center bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-2 shadow-2xl focus-within:border-zinc-700 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Command AI or ask code architecture..."
              rows={1}
              className="w-full bg-transparent px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-32"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-20 transition-all"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT CANVAS: LIVE ARTIFACT / CODE INSPECTOR */}
      {activeArtifact && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '45%', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="h-full bg-zinc-950 border-l border-zinc-800/60 flex flex-col hidden lg:flex"
        >
          {/* Artifact Header */}
          <div className="h-16 border-b border-zinc-800/60 px-4 flex items-center justify-between bg-zinc-950/80">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Artifact Inspector</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(activeArtifact)}
                className="p-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center gap-1"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => setActiveArtifact(null)}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-900"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Artifact Code Workspace */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-amber-200/90 bg-[#040406]">
            <pre className="whitespace-pre-wrap leading-relaxed">
              <code>{activeArtifact}</code>
            </pre>
          </div>
        </motion.div>
      )}

      {/* API KEY MODAL */}
      <AnimatePresence>
        {showApiModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Enter Groq API Key
                </h3>
                <p className="text-xs text-zinc-400">Key disimpan lokal di session browser kamu.</p>
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