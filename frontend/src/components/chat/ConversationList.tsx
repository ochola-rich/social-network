// Left panel displaying the list of user conversations.
// Fetches real data from the backend and handles selection state.

"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface Conversation {
  user_id: number;
  first_name: string;
  last_name: string;
  avatar: string;
  nickname: string;
  last_message: string;
  last_time: string;
  unread_count: number;
}

interface ConversationListProps {
  activeUserId: number | null;
  onSelectUser: (userId: number) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ activeUserId, onSelectUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await apiClient.get("/api/messages");
        setConversations(data.conversations || []);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConversations();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full lg:w-[400px] bg-surface flex flex-col border-r border-outline-variant">
        <div className="p-6 border-b border-outline-variant space-y-4">
          <div className="h-6 bg-surface-container-high rounded w-1/3 animate-pulse" />
          <div className="h-10 bg-surface-container-high rounded-lg animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 border-b border-outline-variant flex gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-lg bg-surface-container-high" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-container-high rounded w-1/2" />
              <div className="h-3 bg-surface-container-high rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }
