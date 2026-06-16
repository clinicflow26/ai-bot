import React, { useState } from "react";
import { useChat } from "../chat/ChatContext";
import { cn } from "../../lib/utils";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  MessageCircle, 
  AlertTriangle,
  Github
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    sessions,
    activeSessionId,
    createNewSession,
    selectSession,
    renameSession,
    deleteSession,
    clearAllHistory
  } = useChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      renameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(id);
  };

  const handleNewChat = () => {
    const freshId = createNewSession();
    // Auto-close on mobile screens when a new session begins
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleSelectSession = (id: string) => {
    selectSession(id);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile background overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-zinc-950 border-r border-zinc-900 transition-transform duration-300 md:static md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Top Header & New Chat Button */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white shadow-md shadow-emerald-500/20">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-sm text-zinc-100 block tracking-tight">AI Chat Core</span>
              <span className="text-[10px] text-zinc-500 block -mt-1">Local Ollama Runtime</span>
            </div>
          </div>

          <button
            id="new-chat-btn"
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 px-4 py-3 text-sm font-medium text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition duration-150 shadow-sm cursor-pointer select-none group"
          >
            <Plus className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            New Dialogue
          </button>
        </div>

        {/* Chat List Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest select-none">
            Recent Conversations
          </div>

          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-600 select-none">
              No threads recorded
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = session.id === editingId;

              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={cn(
                    "flex group items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer select-none relative",
                    isActive 
                      ? "bg-zinc-900 text-zinc-100 font-medium border border-zinc-850" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent"
                  )}
                >
                  <MessageSquare className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-emerald-500" : "text-zinc-500 group-hover:text-zinc-400"
                  )} />

                  {isEditing ? (
                    <form 
                      onSubmit={(e) => handleSaveRename(session.id, e)} 
                      className="flex-1 flex items-center gap-1 min-w-0"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-zinc-950 text-xs text-zinc-100 rounded border border-emerald-500 px-1.5 py-0.5 focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        type="submit"
                        onClick={(e) => handleSaveRename(session.id, e)}
                        className="p-1 rounded text-emerald-500 hover:bg-zinc-800 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        className="p-1 rounded text-zinc-500 hover:bg-zinc-800 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  ) : (
                    <span className="flex-1 truncate text-xs pr-8">
                      {session.title || "Empty Chat"}
                    </span>
                  )}

                  {/* Actions overlay */}
                  {!isEditing && (
                    <div className={cn(
                      "absolute right-2 items-center gap-1",
                      isActive ? "flex" : "hidden group-hover:flex"
                    )}>
                      <button
                        id={`rename-btn-${session.id}`}
                        type="button"
                        onClick={(e) => handleStartRename(session.id, session.title, e)}
                        className="p-1 text-zinc-500 hover:text-zinc-350 hover:bg-zinc-800 rounded transition duration-100 cursor-pointer"
                        title="Rename Thread"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        id={`delete-btn-${session.id}`}
                        type="button"
                        onClick={(e) => handleDelete(session.id, e)}
                        className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition duration-100 cursor-pointer"
                        title="Delete Thread"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Panel Actions */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/60 flex flex-col gap-2">
          {showConfirmClear ? (
            <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-xl space-y-2">
              <div className="flex gap-1.5 text-xs text-rose-300 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>Delete all chat logs?</span>
              </div>
              <div className="flex gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-medium text-zinc-300 rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllHistory();
                    setShowConfirmClear(false);
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-[10px] font-medium text-white rounded-md transition cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <button
              id="clear-all-btn"
              type="button"
              onClick={() => setShowConfirmClear(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg hover:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-rose-400 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Thread Storage
            </button>
          )}

          <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-zinc-650 font-mono select-none">
            <span>v1.0 (PROD)</span>
            <span className="flex items-center gap-1 hover:text-zinc-550 duration-100">
              <Github className="h-3 w-3" />
              github-ready
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
