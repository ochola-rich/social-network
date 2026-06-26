// src/app/messages/page.tsx
// The main Messages page. Orchestrates the ConversationList and ChatWindow.
// Initializes the WebSocket connection on mount and handles deep-linking to specific users.

"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { wsClient } from "@/lib/websocket";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { MobileNav } from "@/components/layout/MobileNav";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get("userId");

  const { user, isLoading, fetchCurrentUser } = useAuthStore();

  // Initialize activeUserId from URL if present
  const [activeUserId, setActiveUserId] = useState<number | null>(
    urlUserId ? Number(urlUserId) : null,
  );

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  // FIX: Empty dependency array prevents the WebSocket from disconnecting/reconnecting on every render
  useEffect(() => {
    wsClient.connect();
  }, []);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <LeftSidebar />
      <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">
        <ConversationList
          activeUserId={activeUserId}
          onSelectUser={setActiveUserId}
        />
        <ChatWindow userId={activeUserId} />
      </div>
      <MobileNav />
    </div>
  );
}

export default function MessagesPage() {
  return (
    // Next.js requires a Suspense boundary for useSearchParams
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          Loading Messages...
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
