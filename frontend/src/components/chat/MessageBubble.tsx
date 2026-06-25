// Renders individual chat messages with distinct styles for sent and received messages.

"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import dayjs from "dayjs";

interface MessageBubbleProps {
  message: {
    content: string;
    created_at: string;
    avatar?: string;
    first_name?: string;
  };
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  return (
    <div className={`flex gap-3 max-w-[80%] ${isOwn ? "ml-auto flex-row-reverse" : ""}`}>
      {!isOwn && (
        <Avatar src={message.avatar} alt={message.first_name || "User"} size="sm" className="!rounded-full self-end mb-1 !w-8 !h-8" />
      )}
      <div className={`flex flex-col gap-1 ${isOwn ? "items-end" : ""}`}>
        <div className={`px-5 py-3 font-body-md leading-relaxed ${
          isOwn 
            ? "bg-primary-container text-on-primary rounded-2xl rounded-br-none shadow-lg shadow-primary-container/10" 
            : "bg-surface-container text-on-surface border border-outline-variant rounded-2xl rounded-bl-none"
        }`}>
          {message.content}
        </div>
        <span className="font-label-mono text-[10px] text-on-surface-variant px-1">
          {dayjs(message.created_at).format("h:mm A")}
        </span>
      </div>
    </div>
  );
};
