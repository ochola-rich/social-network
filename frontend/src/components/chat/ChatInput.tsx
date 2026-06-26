// src/components/chat/ChatInput.tsx
// Functional emoji picker grid with real message sending.

"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api";
import { Image, Send, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  receiverId: number;
  onMessageSent: (content: string) => void;
}

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "😎",
  "🤔",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "🎉",
  "👀",
  "🙏",
];

export const ChatInput: React.FC<ChatInputProps> = ({
  receiverId,
  onMessageSent,
}) => {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
      setShowEmojiPicker(false);
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

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  return (
    <div className="p-4 border-t border-outline-variant bg-surface-container-lowest relative">
      {/* Emoji Picker Dropdown */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 right-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-3 shadow-lg grid grid-cols-6 gap-2 z-10">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="hover:bg-surface-container-high rounded-lg p-1.5 text-xl transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-2.5 focus-within:border-primary transition-all">
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
          <Image size={20} />
        </button>

        <input
          className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-md py-2 px-2 outline-none placeholder:text-on-surface-variant/50"
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />

        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={cn(
            "p-2 transition-colors",
            showEmojiPicker
              ? "text-primary"
              : "text-on-surface-variant hover:text-primary",
          )}
        >
          <Smile size={20} />
        </button>

        <button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className="bg-primary text-on-primary w-10 h-10 rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
