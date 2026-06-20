// Protected Home Feed page.
// Redirects to login if not authenticated. Fetches and displays the feed.

"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, fetchCurrentUser } = useAuthStore();

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
      <div className="p-6">
        <h1 className="text-2xl font-bold text-on-surface mb-6">Your Feed</h1>
        {/* Feed content will be implemented in Branch 2 */}
        <div className="p-8 border border-outline-variant rounded-xl bg-surface-container-lowest text-center text-on-surface-variant">
          Feed implementation begins in Branch 2.
        </div>
      </div>
    </MainLayout>
  );
}
