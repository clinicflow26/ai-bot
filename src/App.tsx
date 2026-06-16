import { useState } from "react";
import { ChatProvider } from "./components/chat/ChatContext";
import { Sidebar } from "./components/sidebar/Sidebar";
import { ChatArea } from "./components/chat/ChatArea";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ChatProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0c] font-sans antialiased">
        {/* Navigation Sidebar Panel */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main Workspace Frame */}
        <div className="flex flex-1 flex-col h-full overflow-hidden relative">
          <ChatArea 
            onMenuToggle={() => setSidebarOpen((prev) => !prev)} 
          />
        </div>
      </div>
    </ChatProvider>
  );
}
