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

  return (
    <section className="w-full lg:w-[400px] bg-surface flex flex-col border-r border-outline-variant h-screen overflow-hidden">
      <div className="p-6 border-b border-outline-variant">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Messages</h2>
        <div className="relative">
          <input 
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 pl-4 pr-4 text-on-surface font-body-sm focus:outline-none focus:border-primary transition-colors" 
            placeholder="Search conversations..." 
            type="text" 
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant font-body-sm">
            No conversations yet. Start a chat from a user's profile!
          </div>
        ) : (
          conversations.map((conv) => (
            <div 
              key={conv.user_id}
              onClick={() => onSelectUser(conv.user_id)}
              className={cn(
                "p-6 border-b border-l-4 cursor-pointer transition-colors group",
                activeUserId === conv.user_id 
                  ? "border-l-primary bg-surface-container-high" 
                  : "border-l-transparent hover:bg-surface-container"
              )}
            >
              <div className="flex gap-4">
                <Avatar src={conv.avatar} alt={`${conv.first_name} ${conv.last_name}`} size="lg" className="!rounded-lg !w-12 !h-12" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-body-md font-bold text-on-surface truncate">
                      {conv.first_name} {conv.last_name}
                    </h3>
                    <span className="font-label-mono text-on-surface-variant text-[10px]">
                      {dayjs(conv.last_time).fromNow()}
                    </span>
                  </div>
                  <p className="font-body-sm text-on-surface-variant truncate">
                    {conv.last_message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
