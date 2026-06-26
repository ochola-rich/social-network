// src/components/chat/ChatWindow.tsx
// The active chat panel. Handles message history, real-time updates via WebSocket,
// auto-scrolling, and fetching user profile for the header.

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
  const [chatUser, setChatUser] = useState<{
    first_name: string;
    last_name: string;
    avatar: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat history
  useEffect(() => {
    if (!userId) {
      setMessages([]);
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const { data } = await apiClient.get(`/api/messages/${userId}`);
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  // Fetch user profile for the header
  useEffect(() => {
    if (!userId) {
      setChatUser(null);
      return;
    }

    const fetchUser = async () => {
      try {
        const { data } = await apiClient.get(`/api/profile/${userId}`);
        if (data.user) {
          setChatUser({
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            avatar: data.user.avatar,
          });
        }
      } catch (err) {
        console.error("Failed to fetch chat user profile:", err);
      }
    };

    fetchUser();
  }, [userId]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      if (
        data.sender_id === userId ||
        (data.receiver_id &&
          data.receiver_id === currentUser?.id &&
          data.sender_id === userId)
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.payload?.message_id || Date.now(),
            sender_id: data.sender_id,
            content: data.body,
            created_at: data.payload?.created_at || new Date().toISOString(),
          },
        ]);
      }
    };

    wsClient.on("chat_message", handleNewMessage);
    return () => wsClient.off("chat_message", handleNewMessage);
  }, [userId, currentUser?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!userId) {
    return (
      <section className="hidden lg:flex flex-1 flex-col bg-surface-container-lowest items-center justify-center">
        <p className="text-sm text-on-surface-variant">
          Select a conversation to start messaging.
        </p>
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
      <div className="h-20 px-6 flex items-center justify-between border-b border-outline-variant sticky top-0 z-10 bg-surface-container-lowest/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Avatar
            src={chatUser?.avatar}
            alt={chatUser?.first_name || "User"}
            size="md"
            className="rounded-xl"
          />
          <div>
            <h3 className="text-base font-bold text-on-surface">
              {chatUser?.first_name} {chatUser?.last_name}
            </h3>
            <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
              Online Now
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex justify-center">
          <span className="font-mono bg-surface-container py-1 px-4 rounded-full text-on-surface-variant text-[10px]">
            RECENT CONVERSATION
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-on-surface-variant">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUser?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <ChatInput
        receiverId={userId}
        onMessageSent={(content) => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              sender_id: currentUser!.id,
              content,
              created_at: new Date().toISOString(),
            },
          ]);
          wsClient.send("private_message", {
            receiver_id: userId,
            body: content,
          });
        }}
      />
    </section>
  );
};
