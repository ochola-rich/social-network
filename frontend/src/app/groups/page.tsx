// src/app/groups/page.tsx
// Groups hub — discover and create editorial collectives
// Zero hardcoded data. All content fetched from backend.

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Plus, Users, Hash, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/api";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";

interface Group {
  id: number;
  title: string;
  description: string;
  member_count: number;
  is_member: boolean;
  created_at?: string;
  post_count?: number;
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, isLoading, fetchCurrentUser } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  const fetchGroups = async () => {
    setIsFetching(true);
    try {
      const { data } = await apiClient.get("/api/groups");
      setGroups(data.groups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  if (isLoading || !user) return null;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-6 py-8 pb-24">
          {/* Page Header */}
          <header className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">
                Groups
              </h1>
              <p className="text-sm text-on-surface-variant font-medium">
                Editorial collectives and creative circles
              </p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl bg-primary hover:bg-primary/90 text-on-primary px-5 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create Group
            </Button>
          </header>

          {/* Content States */}
          {isFetching ? (
            /* Skeleton Loading */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-surface-container-lowest rounded-2xl border border-outline-variant animate-pulse p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-surface-container-high rounded-xl" />
                    <div className="w-16 h-6 bg-surface-container-high rounded-full" />
                  </div>
                  <div className="w-3/4 h-5 bg-surface-container-high rounded-lg mb-3" />
                  <div className="w-full h-3 bg-surface-container-high rounded-lg mb-2" />
                  <div className="w-2/3 h-3 bg-surface-container-high rounded-lg mt-3" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-5">
                <Hash className="text-primary/40" size={28} />
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">
                No groups yet
              </h3>
              <p className="text-on-surface-variant text-sm text-center max-w-sm mb-6 leading-relaxed">
                Start the first editorial collective. Groups are where ideas
                converge and creative voices gather.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="rounded-xl bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 text-sm font-semibold transition-all duration-200"
              >
                Create the First Group
              </Button>
            </div>
          ) : (
            /* Groups Grid — FIXED CARD LAYOUT */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => router.push(`/groups/${group.id}`)}
                  className="group bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-200"
                >
                  {/* Top Row: Icon + Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Hash
                        className="text-primary"
                        size={18}
                        strokeWidth={2.5}
                      />
                    </div>
                    {group.is_member && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                        Joined
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="flex-1 min-w-0 mb-3">
                    <h3 className="text-base font-bold text-on-surface mb-2 truncate group-hover:text-primary transition-colors">
                      {group.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant line-clamp-2 leading-snug">
                      {group.description || "No description provided."}
                    </p>
                  </div>

                  {/* Footer: Members + Arrow */}
                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant mt-auto">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <Users size={14} strokeWidth={2} />
                        <span className="text-xs font-semibold text-on-surface-variant">
                          {group.member_count}
                        </span>
                      </div>
                      {group.post_count !== undefined && (
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                          <span className="text-xs font-semibold text-on-surface-variant">
                            {group.post_count} posts
                          </span>
                        </div>
                      )}
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={fetchGroups}
      />
    </MainLayout>
  );
}
