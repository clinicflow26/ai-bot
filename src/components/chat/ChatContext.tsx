import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ChatSession, Message } from "../../types";

interface ChatContextProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  webSearchEnabled: boolean;
  isRecording: boolean;
  recordingUnsupported: boolean;
  createNewSession: () => string;
  selectSession: (id: string) => void;
  renameSession: (id: string, newTitle: string) => void;
  deleteSession: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  setWebSearchEnabled: (enabled: boolean) => void;
  setIsRecording: (recording: boolean) => void;
  setRecordingUnsupported: (unsupported: boolean) => void;
  clearAllHistory: () => void;
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

const LOCAL_STORAGE_KEY = "ai_chatbot_sessions";
const ACTIVE_SESSION_KEY = "ai_chatbot_active_id";
const SEARCH_PREF_KEY = "ai_chatbot_web_search_pref";

const INTRODUCTION_MESSAGE: Message = {
  id: "welcome-system",
  role: "assistant",
  content: `👋 **Welcome to your Custom Intelligent Chatbot!**

I am fully set up with a full-stack architecture powered by React, Tailwind CSS, Vite, Express, and your local Ollama runtime.

### ✨ Key Features Built-In:
1. **Interactive Chat Sidebar:** Easily manage separate chat threads, create new ones, clean histories, rename, or target threads for deletion.
2. **True Full-Stack AI Connection:** Uses your local **Ollama** server at \`http://localhost:11434\` for real model responses.
3. **Optional Web Search Toggle:** The UI still forwards this flag, but local Ollama does not include built-in web grounding in this setup.
4. **Adaptive Voice Dictation:** Click the microphone icon to utilize the live browser **Web Speech API** to seamlessly record and synthesize text.
5. **Thinking Indicator & Auto-Scroll:** Active layout cues respond exactly when queries process, locking views to the latest streams.

*Try asking me to write a Javascript function or write a poem to test it out!*`,
  timestamp: new Date().toISOString(),
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUnsupported, setRecordingUnsupported] = useState(false);

  // 1. Initial State Loading from Local Storage
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
      const storedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
      const storedSearchPref = localStorage.getItem(SEARCH_PREF_KEY);

      if (storedSearchPref) {
        setWebSearchEnabled(storedSearchPref === "true");
      }

      if (storedSessions) {
        const parsed = JSON.parse(storedSessions) as ChatSession[];
        setSessions(parsed);
        if (storedActiveId && parsed.some((s) => s.id === storedActiveId)) {
          setActiveSessionId(storedActiveId);
        } else if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          setupInitialSession();
        }
      } else {
        setupInitialSession();
      }
    } catch (e) {
      console.error("Local storage loading error, resetting context:", e);
      setupInitialSession();
    }
  }, []);

  // 2. Persist Sessions to Local Storage when they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [sessions]);

  // 3. Persist Active Session Id
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [activeSessionId]);

  // 4. Persist Search Preference
  useEffect(() => {
    localStorage.setItem(SEARCH_PREF_KEY, String(webSearchEnabled));
  }, [webSearchEnabled]);

  const setupInitialSession = () => {
    const defaultId = "initial-chat-thread";
    const initialSession: ChatSession = {
      id: defaultId,
      title: "Introducing AI Chatbot",
      messages: [{ ...INTRODUCTION_MESSAGE }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions([initialSession]);
    setActiveSessionId(defaultId);
  };

  const createNewSession = (): string => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Dialogue",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    return newId;
  };

  const selectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const renameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: new Date().toISOString() } : s))
    );
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      // Determine what the new active session should be
      if (activeSessionId === id) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        } else {
          // If no sessions left, create a fresh one
          const freshId = `session-${Date.now()}`;
          const freshSession: ChatSession = {
            id: freshId,
            title: "New Dialogue",
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setActiveSessionId(freshId);
          return [freshSession];
        }
      }
      return filtered;
    });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !activeSessionId) return;

    // Create user message
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setSessions((prev) => {
      return prev.map((s) => {
        if (s.id === activeSessionId) {
          const updatedMessages = [...s.messages, userMsg];
          // Simple title generator if it's the first non-system message
          const firstUserMsg = s.messages.filter((m) => m.role === "user").length === 0;
          const newTitle = firstUserMsg
            ? content.slice(0, 32) + (content.length > 32 ? "..." : "")
            : s.title;

          return {
            ...s,
            title: newTitle,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
    });

    setLoading(true);

    try {
      // Find updated dialogue tree for request
      const session = sessions.find((s) => s.id === activeSessionId);
      const currentHistory = session ? [...session.messages, userMsg] : [userMsg];

      // Call API
      const requestBody = {
        messages: currentHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        webSearch: webSearchEnabled,
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP network error: status ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: Message = {
        id: `msg-assistant-${Date.now()}`,
        role: "assistant",
        content: data.text || "No output returned.",
        timestamp: new Date().toISOString(),
        webSearchUsed: !!data.webSearchAttempted,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, assistantMsg], updatedAt: new Date().toISOString() }
            : s
        )
      );
    } catch (error: any) {
      console.error("[Chat System Error]:", error);

      const errorMsg: Message = {
        id: `msg-error-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Connection Failure:** Unable to fetch assistant reply.\n\n*Error details:* ${error?.message || "Internal network request failed. Please check that the local server and Ollama are running."}`,
        timestamp: new Date().toISOString(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, errorMsg], updatedAt: new Date().toISOString() }
            : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const clearAllHistory = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    setupInitialSession();
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        loading,
        webSearchEnabled,
        isRecording,
        recordingUnsupported,
        createNewSession,
        selectSession,
        renameSession,
        deleteSession,
        sendMessage,
        setWebSearchEnabled,
        setIsRecording,
        setRecordingUnsupported,
        clearAllHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be consumed within a ChatProvider");
  }
  return context;
};
