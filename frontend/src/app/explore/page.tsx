// src/app/explore/page.tsx
// Real-time user discovery hub with ACTUAL backend relationship status
// Zero hardcoded data. All content fetched from backend.

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Search, Users } from "lucide-react";
import { apiClient } from "@/lib/api";

interface SearchedUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string;
  nickname: string;
}

export default function ExplorePage() {
  const router = useRouter();
  const { user, isLoading, fetchCurrentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ACTUAL RELATIONSHIP STATE from backend
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  // UI bridge for outgoing pending requests (backend lacks GET endpoint)
  const [pendingOutgoingIds, setPendingOutgoingIds] = useState<Set<number>>(
    new Set(),
  );

  // Unfollow Confirmation State
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [targetUnfollowUser, setTargetUnfollowUser] =
    useState<SearchedUser | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  // Fetch actual following list from backend
  useEffect(() => {
    if (!user) return;
    const fetchRelationships = async () => {
      try {
        const { data } = await apiClient.get("/api/follow/following");
        const ids = new Set<number>(
          (data.following || []).map((u: any) => u.id),
        );
        setFollowingIds(ids);
      } catch (err) {
        console.error("Failed to fetch following list", err);
      }
    };
    fetchRelationships();
  }, [user]);

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }
      setIsSearching(true);
      try {
        const { data } = await apiClient.get(
          `/api/users/search?q=${encodeURIComponent(query)}`,
        );
        const filtered = (data.users || []).filter(
          (u: any) => u.id !== user?.id,
        );
        setSearchResults(filtered);
        setHasSearched(true);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleFollowAction = async (targetUser: SearchedUser) => {
    if (followingIds.has(targetUser.id)) {
      setTargetUnfollowUser(targetUser);
      setShowUnfollowModal(true);
      return;
    }

    try {
      await apiClient.post(`/api/follow/request/${targetUser.id}`);
      setPendingOutgoingIds((prev) => new Set(prev).add(targetUser.id));
    } catch (err) {
      console.error("Follow action failed", err);
    }
  };

  const confirmUnfollow = async () => {
    if (!targetUnfollowUser) return;
    try {
      await apiClient.post(`/api/follow/unfollow/${targetUnfollowUser.id}`);
      setFollowingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(targetUnfollowUser.id);
        return newSet;
      });
    } catch (err) {
      console.error("Unfollow failed", err);
    } finally {
      setShowUnfollowModal(false);
      setTargetUnfollowUser(null);
    }
  };

  const getButtonState = (targetUserId: number) => {
    if (followingIds.has(targetUserId)) return "following";
    if (pendingOutgoingIds.has(targetUserId)) return "pending";
    return "none";
  };

  if (isLoading || !user) return null;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
          {/* Header */}
          <header className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">
              Explore
            </h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Discover creators, editors, and voices across the network
            </p>
          </header>

          {/* Search Bar */}
          <div className="relative mb-10 group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search
                className={`h-5 w-5 transition-colors duration-200 ${
                  searchQuery ? "text-primary" : "text-on-surface-variant"
                }`}
              />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-14 pr-5 py-4 bg-surface-container-lowest border border-outline-variant rounded-2xl text-on-surface placeholder-on-surface-variant/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="Search by name, handle, or email..."
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Results Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="text-primary" size={20} strokeWidth={2.5} />
                <h2 className="text-lg font-bold text-on-surface tracking-tight">
                  {hasSearched
                    ? `Results (${searchResults.length})`
                    : "Discover People"}
                </h2>
              </div>
              {hasSearched && searchResults.length > 0 && (
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {searchResults.length} found
                </span>
              )}
            </div>

            {/* Empty States */}
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-5">
                  <Search className="text-primary/40" size={28} />
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">
                  Start Exploring
                </h3>
                <p className="text-on-surface-variant text-sm text-center max-w-sm leading-relaxed">
                  Type a name, handle, or email to discover other members of the
                  network.
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-5">
                  <Users className="text-primary/40" size={28} />
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">
                  No matches found
                </h3>
                <p className="text-on-surface-variant text-sm text-center max-w-sm leading-relaxed">
                  We couldn&apos;t find anyone matching &ldquo;{searchQuery}
                  &rdquo;. Try a different name or email.
                </p>
              </div>
            ) : (
              /* Results List */
              <div className="space-y-3">
                {searchResults.map((u) => {
                  const state = getButtonState(u.id);
                  return (
                    <div
                      key={u.id}
                      className="group bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex items-center gap-5 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                    >
                      {/* Avatar */}
                      <div
                        className="flex-shrink-0 cursor-pointer"
                        onClick={() => router.push(`/profile/${u.id}`)}
                      >
                        <Avatar
                          src={u.avatar}
                          alt={`${u.first_name} ${u.last_name}`}
                          size="lg"
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      </div>

                      {/* User Info */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/profile/${u.id}`)}
                      >
                        <h3 className="text-base font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {u.first_name} {u.last_name}
                        </h3>
                        <p className="text-xs font-mono text-primary font-semibold mt-0.5">
                          @{u.nickname || u.first_name.toLowerCase()}
                        </p>
                        <p className="text-sm text-on-surface-variant truncate mt-0.5">
                          {u.email}
                        </p>
                      </div>

                      {/* Follow Action */}
                      <Button
                        variant={state === "following" ? "outline" : "primary"}
                        size="sm"
                        className={`rounded-xl text-xs font-bold transition-all duration-200 ${
                          state === "following"
                            ? "border-primary text-primary hover:bg-primary hover:text-on-primary"
                            : state === "pending"
                              ? "bg-surface-container-high text-on-surface-variant cursor-default"
                              : "bg-primary text-on-primary hover:bg-primary/90"
                        }`}
                        onClick={() => handleFollowAction(u)}
                        disabled={state === "pending"}
                      >
                        {state === "following"
                          ? "Following"
                          : state === "pending"
                            ? "Pending"
                            : "Follow"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Unfollow Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUnfollowModal}
        title="Unfollow User?"
        message={`Are you sure you want to unfollow ${targetUnfollowUser?.first_name}? You will no longer see their private posts.`}
        confirmLabel="Unfollow"
        onConfirm={confirmUnfollow}
        onCancel={() => setShowUnfollowModal(false)}
        isDestructive={true}
      />
    </MainLayout>
  );
}
