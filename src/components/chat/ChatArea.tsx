import React, { useState, useEffect, useRef } from "react";
import { useChat } from "./ChatContext";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { renderMarkdown } from "../../lib/markdown";
import { formatTime } from "../../lib/utils";
import {
  Menu,
  Send,
  Globe,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Bot,
  User,
  Compass,
  AlertTriangle,
  ArrowDown,
} from "lucide-react";

interface ChatAreaProps {
  onMenuToggle: () => void;
}

const stripMarkdownForSpeech = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, " code omitted ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[*_#>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const ChatArea: React.FC<ChatAreaProps> = ({ onMenuToggle }) => {
  const {
    sessions,
    activeSessionId,
    loading,
    webSearchEnabled,
    setWebSearchEnabled,
    sendMessage,
  } = useChat();

  const [input, setInput] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  const {
    isListening,
    error: speechError,
    isSupported: speechSupported,
    startListening,
    stopListening,
  } = useSpeechToText();

  // 1. Auto-scroll to latest messages on list updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!voiceModeEnabled || loading || typeof window === "undefined") {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") {
      return;
    }

    if (lastMessage.id === "welcome-system") {
      lastSpokenMessageIdRef.current = lastMessage.id;
      return;
    }

    if (lastSpokenMessageIdRef.current === lastMessage.id) {
      return;
    }

    const synthesis = window.speechSynthesis;
    if (!synthesis) {
      return;
    }

    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      stripMarkdownForSpeech(lastMessage.content),
    );
    utterance.rate = 1;
    utterance.pitch = 1;
    lastSpokenMessageIdRef.current = lastMessage.id;
    synthesis.speak(utterance);
  }, [messages, loading, voiceModeEnabled]);

  useEffect(() => {
    if (voiceModeEnabled || typeof window === "undefined") {
      return;
    }

    window.speechSynthesis?.cancel();
  }, [voiceModeEnabled]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  // 2. Track screen scrolls to show/hide "Scroll to Bottom" button
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Show button if user scrolls up significantly (more than 300px from bottom)
    const isUp = scrollHeight - scrollTop - clientHeight > 300;
    setShowScrollBtn(isUp);
  };

  // In voice mode transcript is sent immediately; otherwise it is appended to the input.
  const handleMicClick = () => {
    if (!speechSupported) {
      setMicError(
        "Voice dictation is unsupported in this browser. Try Google Chrome or Safari!",
      );
      setTimeout(() => setMicError(null), 4000);
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      setMicError(null);
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
      startListening(
        (transcript) => {
          const cleanTranscript = transcript.trim();
          if (!cleanTranscript) return;

          if (voiceModeEnabled) {
            setInput("");
            void sendMessage(cleanTranscript);
            return;
          }

          setInput((prev) => prev + (prev ? " " : "") + cleanTranscript);
        },
        () => {
          // Finished handler
        },
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const messageText = input;
    setInput("");
    await sendMessage(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-[#0c0c0e] text-zinc-100 overflow-hidden relative">
      {/* Top Navigation Bar (Mobile / Responsive) */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-900 bg-zinc-950/60 px-4 md:px-6 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle"
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 md:hidden cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="font-semibold text-xs md:text-sm tracking-tight">
              {activeSession ? activeSession.title : "New Conversation"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] md:text-xs text-zinc-500 bg-zinc-900/60 border border-zinc-850 px-2.5 py-1 rounded-full select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Local Storage Active</span>
        </div>
      </header>

      {/* Main Messages Workspace */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-850"
      >
        {messages.length === 0 ? (
          // Landing Screen when dialogue is empty
          <div className="mx-auto max-w-2xl text-center py-16 px-4 flex flex-col items-center justify-center space-y-6 h-full select-none">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-850 text-emerald-500 shadow-xl shadow-emerald-500/5">
              <Bot className="h-8 w-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                How can I assist you today?
              </h1>
              <p className="text-xs md:text-sm text-zinc-450 max-w-md mx-auto leading-relaxed">
                Send a detailed prompt above to begin. You can write scripts,
                generate lists, practice languages, or chat with your local model.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-left pt-2">
              <button
                id="preset-btn-1"
                type="button"
                onClick={() =>
                  setInput(
                    "Write a highly secure Express.js template in typescript.",
                  )
                }
                className="p-3.5 rounded-xl border border-zinc-900 hover:border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40 text-xs text-zinc-300 transition duration-150 cursor-pointer flex items-start gap-2.5"
              >
                <Compass className="h-4 w-4 shrink-0 text-emerald-500 pt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-200">
                    Generate Express template
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    Generates clean typescript starter files.
                  </div>
                </div>
              </button>

              <button
                id="preset-btn-2"
                type="button"
                onClick={() =>
                  setInput("Explain quantum entanglement in 2 paragraphs.")
                }
                className="p-3.5 rounded-xl border border-zinc-900 hover:border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40 text-xs text-zinc-300 transition duration-150 cursor-pointer flex items-start gap-2.5"
              >
                <Compass className="h-4 w-4 shrink-0 text-amber-500 pt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-200">
                    Explain Quantum Entanglement
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    Breaks down complex physics details simply.
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-500 shadow-md">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  {/* Message Bubble container */}
                  <div
                    className={`flex flex-col max-w-[85%] space-y-1.5 ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed select-text ${
                        isUser
                          ? "bg-emerald-600/10 border border-emerald-500/20 text-zinc-100 select-text font-normal"
                          : "bg-zinc-900/70 border border-zinc-850 text-zinc-250 select-text font-normal"
                      }`}
                    >
                      {/* Search indicator inside the bubble */}
                      {msg.webSearchUsed && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded bg-zinc-950/80 border border-emerald-500/10 text-[10px] font-semibold text-emerald-400 w-fit select-none font-mono uppercase tracking-wider">
                          <Globe className="h-3 w-3 inline" />
                          <span>Web Search Used</span>
                        </div>
                      )}

                      <div className="select-text prose prose-invert prose-emerald max-w-none text-sm leading-relaxed">
                        {isUser ? msg.content : renderMarkdown(msg.content)}
                      </div>
                    </div>

                    {/* Timestamp & Identity */}
                    <span className="px-1 text-[10px] text-zinc-650 tracking-tight select-none">
                      {isUser ? "You" : "Assistant"} •{" "}
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-500/10">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking / Loader Indicator */}
            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-500">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex flex-col space-y-1.5 items-start">
                  <div className="rounded-2xl px-5 py-3.5 bg-zinc-900/70 border border-zinc-850 flex items-center gap-2">
                    <span className="text-zinc-400 text-xs font-mono animate-pulse font-medium">
                      Thinking
                    </span>
                    <span className="flex gap-1 items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll-to-Bottom shortcut */}
      {showScrollBtn && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-32 right-6 md:right-10 z-30 p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-850 text-emerald-500 border border-zinc-800 shadow-xl cursor-pointer hover:scale-105 duration-100 flex items-center justify-center"
          title="Scroll To Bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Fixed Bottom Input Drawer */}
      <footer className="p-4 border-t border-zinc-900 bg-zinc-950/35 backdrop-blur-md shrink-0">
        <div className="mx-auto max-w-3xl">
          {/* Notifications and warnings */}
          {(micError || speechError) && (
            <div className="mb-2 mx-1 p-2 bg-rose-955/20 border border-rose-900/30 rounded-lg text-[11px] text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span>{micError || speechError}</span>
            </div>
          )}

          {isListening && (
            <div className="mb-2 mx-1 p-2 bg-emerald-950/30 border border-emerald-900/30 rounded-lg text-xs text-emerald-300 flex items-center justify-between animate-pulse">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>
                  {voiceModeEnabled
                    ? "Voice mode active... speak to send directly"
                    : "Dictation active... speak cleanly into microphone"}
                </span>
              </span>
              <button
                type="button"
                onClick={stopListening}
                className="text-[10px] font-semibold uppercase bg-emerald-800/40 hover:bg-emerald-800 px-2 py-0.5 rounded-md cursor-pointer"
              >
                Stop
              </button>
            </div>
          )}

          {/* Form console */}
          <form onSubmit={handleSend} className="relative">
            <div className="overflow-hidden rounded-2xl border border-zinc-850 bg-[#121215] focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700 transition shadow-inner">
              <textarea
                id="chat-textarea"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening ? "Listening..." : "Message AI Core..."
                }
                disabled={loading}
                className="w-full resize-none bg-transparent px-4 py-3.5 pr-20 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none min-h-[58px]"
              />

              {/* Console Action Bar */}
              <div className="flex items-center justify-between border-t border-zinc-900 bg-[#0f0f12] px-4 py-2.5">
                {/* Left controls: Voice mode and optional Web Search toggle */}
                <div className="flex items-center gap-4 select-none">
                  <div className="flex items-center gap-2 group">
                    <button
                      id="voice-mode-toggle"
                      type="button"
                      onClick={() => setVoiceModeEnabled((prev) => !prev)}
                      className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition duration-200 cursor-pointer ${
                        voiceModeEnabled ? "bg-emerald-500" : "bg-zinc-800"
                      }`}
                      title="Toggle Voice Mode"
                    >
                      <span
                        className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition duration-200 ${
                          voiceModeEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-450 font-medium group-hover:text-zinc-200 transition-colors">
                      <Volume2
                        className={`h-3.5 w-3.5 ${voiceModeEnabled ? "text-emerald-500" : "text-zinc-500"}`}
                      />
                      Voice Mode
                    </span>
                  </div>

                  <div className="flex items-center gap-2 group">
                    <button
                      id="web-search-toggle"
                      type="button"
                      onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                      className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition duration-200 cursor-pointer ${
                        webSearchEnabled ? "bg-emerald-500" : "bg-zinc-800"
                      }`}
                      title="Toggle Web Search"
                    >
                      <span
                        className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition duration-200 ${
                          webSearchEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-450 font-medium group-hover:text-zinc-200 transition-colors">
                      <Globe
                        className={`h-3.5 w-3.5 ${webSearchEnabled ? "text-emerald-500" : "text-zinc-500"}`}
                      />
                      Web Search
                    </span>
                  </div>
                </div>

                {/* Right controls: Recording & Sending */}
                <div className="flex items-center gap-2">
                  <button
                    id="mic-listen-btn"
                    type="button"
                    onClick={handleMicClick}
                    className={`rounded-xl p-2.5 transition duration-150 cursor-pointer ${
                      isListening
                        ? "bg-rose-600 text-white animate-pulse"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                    title="Dictate with Web Speech API"
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    id="submit-message-btn"
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:bg-zinc-900 disabled:text-zinc-650 border border-transparent disabled:border-zinc-850 duration-150 cursor-pointer"
                    title="Send Message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="mt-2 text-[10px] text-zinc-600 text-center select-none font-sans">
            AI Core can make mistakes. Verify important answers before using them.
          </div>
        </div>
      </footer>
    </div>
  );
};
