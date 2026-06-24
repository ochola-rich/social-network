"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export const StoryStrip: React.FC = () => {
  // TODO: Fetch users that current user follows
  // For now, showing empty state or placeholder
  return (
    <section className="py-6 border-b border-surface-container-high">
      <div className="flex gap-6 overflow-x-auto px-6 hide-scrollbar">
        {/* My Story */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group">
          <div className="relative p-1 rounded-full border-2 border-dashed border-outline-variant group-hover:border-primary transition-colors">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container flex items-center justify-center">
              <Plus className="text-on-surface-variant" size={24} />
            </div>
          </div>
          <span className="font-label-mono text-label-sm text-on-surface-variant">
            Add Story
          </span>
        </div>

        {/* Empty state message */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center px-4">
          <span className="font-label-sm text-on-surface-variant text-center">
            Follow users to see their stories
          </span>
        </div>
      </div>
    </section>
  );
};