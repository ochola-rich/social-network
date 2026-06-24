// The active chat panel. Handles message history, real-time updates via WebSocket, and auto-scrolling.

"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/authStore";

interface ChatMessage {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}

interface ChatWindowProps {
  userId: number | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ userId }) => {
  const { user: currentUser } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatUser, setChatUser] = useState<{ first_name: string; last_name: string; avatar: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const { data } = await apiClient.get(`/api/messages/${userId}`);
        setMessages(data.messages || []);
        // Extract user info from the first message or API response if available
        // For now, we'll rely on the backend returning user details or we fetch profile
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  useEffect(() => {
    const handleNewMessage = (data: any) => {
      if (data.sender_id === userId || (data.receiver_id && data.receiver_id === currentUser?.id && data.sender_id === userId)) {
        setMessages((prev) => [...prev, {
          id: data.payload?.message_id || Date.now(),
          sender_id: data.sender_id,
          content: data.body,
          created_at: new Date().toISOString(),
        }]);
      }
    };

    wsClient.on("chat_message", handleNewMessage);
    return () => wsClient.off("chat_message", handleNewMessage);
  }, [userId, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!userId) {
    return (
      <section className="hidden lg:flex flex-1 flex-col bg-surface-container-lowest items-center justify-center">
        <p className="text-on-surface-variant font-body-md">Select a conversation to start messaging.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="hidden lg:flex flex-1 flex-col bg-surface-container-lowest items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </section>
    );
  }

  return (
    <section className="hidden lg:flex flex-1 flex-col bg-surface-container-lowest h-screen overflow-hidden">
      {/* Header */}
      <div className="h-20 px-8 flex items-center justify-between border-b border-outline-variant glass-effect sticky top-0 z-10 bg-surface-container-lowest/80">
        <div className="flex items-center gap-4">
          <Avatar src={chatUser?.avatar} alt={chatUser?.first_name || "User"} size="md" className="!rounded-lg" />
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {chatUser?.first_name} {chatUser?.last_name}
            </h3>
            <span className="font-label-mono text-primary text-[10px] font-bold uppercase tracking-widest">Online Now</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar">
        <div className="flex justify-center">
          <span className="font-label-mono bg-surface-container py-1 px-4 rounded-full text-on-surface-variant text-[10px]">
            RECENT CONVERSATION
          </span>
        </div>
        
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isOwn={msg.sender_id === currentUser?.id} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <ChatInput 
        receiverId={userId} 
        onMessageSent={(content) => {
          setMessages((prev) => [...prev, {
            id: Date.now(),
            sender_id: currentUser!.id,
            content,
            created_at: new Date().toISOString(),
          }]);
          wsClient.send("private_message", { receiver_id: userId, body: content });
        }} 
      />
    </section>
  );
};
