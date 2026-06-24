// Input area for typing messages and uploading images.

"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api";
import { Image, Send } from "lucide-react";

interface ChatInputProps {
  receiverId: number;
  onMessageSent: (content: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ receiverId, onMessageSent }) => {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;
    setIsSending(true);
    
    try {
      await apiClient.post("/api/messages", {
        receiver_id: receiverId,
        content: content.trim(),
      });
      onMessageSent(content.trim());
      setContent("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-8 border-t border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center gap-4 bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-2 focus-within:border-primary transition-all">
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
          <Image size={20} />
        </button>
        <input 
          className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-md py-2 px-2 outline-none" 
          placeholder="Type a message..." 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
        <button 
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className="bg-primary-container text-on-primary w-10 h-10 rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
