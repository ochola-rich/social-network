"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { FeedPosts } from "@/components/feed/FeedPosts";
import { CreatePostModal } from "@/components/feed/CreatePostModal";
import { PenSquare } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, fetchCurrentUser } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MainLayout>
      <div className="pb-20">
        {/* Create Post Prompt */}
        <div className="p-6 border-b border-surface-container-high bg-surface-container-lowest">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-outline-variant bg-surface-container-low hover:border-primary/50 transition-colors group"
          >
            <PenSquare size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            <span className="text-on-surface-variant text-left">What's on your mind?</span>
          </button>
        </div>

        {/* Feed */}
        <FeedPosts />
      </div>

      <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </MainLayout>
  );
}