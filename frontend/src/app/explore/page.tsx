// The Explore page. Acts as the discovery hub for trending topics, 
// suggested users, and popular groups. Strictly follows the Editorial Pulse design system.

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Search, TrendingUp, Users, Hash } from "lucide-react";

// Mock data representing what would eventually come from an /api/explore endpoint
const TRENDING_TOPICS = [
  { id: 1, category: "FASHION", tag: "#CrimsonRevival", posts: "12.4K" },
  { id: 2, category: "DESIGN", tag: "Bento Layouts", posts: "8.2K" },
  { id: 3, category: "EDITORIAL", tag: "Modern Typography", posts: "15.1K" },
  { id: 4, category: "ARCHITECTURE", tag: "#BrutalistChic", posts: "9.7K" },
  { id: 5, category: "CULTURE", tag: "Digital Minimalism", posts: "5.3K" },
  { id: 6, category: "TECH", tag: "AI in Design", posts: "22.1K" },
];

const SUGGESTED_USERS = [
  { id: 1, name: "Marcus Vane", handle: "@mv_snaps", role: "Visual Storyteller" },
  { id: 2, name: "Sienna Grey", handle: "@grey_aesthetic", role: "Cultural Critic" },
  { id: 3, name: "Leo Sterling", handle: "@leo_sterling", role: "Creative Strategist" },
  { id: 4, name: "Anais Dupont", handle: "@anais_d", role: "Fashion Archivist" },
];

export default function ExplorePage() {
  const router = useRouter();
  const { user, isLoading, fetchCurrentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <MainLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto w-full pb-20">
        {/* Header & Search */}
        <div className="mb-10">
          <h1 className="font-display-lg text-headline-xl lg:text-display-lg font-bold text-on-surface mb-6">
            Explore
          </h1>
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-4 pl-14 pr-6 text-on-surface font-body-lg placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all editorial-shadow" 
              placeholder="Search topics, users, or groups..." 
            />
          </div>
        </div>

        {/* Trending Topics Grid */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-primary" size={24} />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Trending Now</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRENDING_TOPICS.map((topic) => (
              <div 
                key={topic.id} 
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 pulse-hover transition-all cursor-pointer group"
              >
                <p className="font-label-mono text-primary text-[10px] mb-2 uppercase tracking-widest font-bold">
                  {topic.category} • TRENDING
                </p>
                <p className="font-headline-sm text-on-surface group-hover:text-primary transition-colors mb-2 truncate">
                  {topic.tag}
                </p>
                <p className="font-label-mono text-on-surface-variant text-[10px]">
                  {topic.posts} Posts
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Suggested Users / Curated Voices */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Users className="text-primary" size={24} />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Curated Voices</h2>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
            {SUGGESTED_USERS.map((user) => (
              <div key={user.id} className="p-6 flex items-center justify-between hover:bg-surface-container-low/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar alt={user.name} size="lg" className="!w-12 !h-12 !rounded-xl" />
                  <div>
                    <p className="font-body-md font-bold text-on-surface">{user.name}</p>
                    <p className="font-label-mono text-on-surface-variant text-[10px]">
                      {user.handle} • {user.role}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}