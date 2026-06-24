// The main Messages page. Orchestrates the ConversationList and ChatWindow.
// Initializes the WebSocket connection on mount.

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { wsClient } from "@/lib/websocket";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoading, fetchCurrentUser } = useAuthStore();
  const [activeUserId, setActiveUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    wsClient.connect(); // Initialize WebSocket

    return () => {
      wsClient.disconnect(); // Cleanup on unmount
    };
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

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
