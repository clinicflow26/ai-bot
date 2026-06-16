export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO string or human-readable format
  webSearchUsed?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  webSearchEnabled: boolean;
  isRecording: boolean;
  recordingUnsupported: boolean;
}
