// The Explore page. Acts as a real-time user discovery hub using the backend search API.
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Search, Users } from "lucide-react";
import { apiClient } from "@/lib/api";

// Interface matching the backend User model
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

  // Fetch current user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  // Debounced search function to prevent spamming the API
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    try {
      // Call the real backend search endpoint
      const { data } = await apiClient.get(
        `/api/users/search?q=${encodeURIComponent(query)}`,
      );
      setSearchResults(data.users || []);
      setHasSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Trigger search when query changes (with 300ms debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Loading state
  if (isLoading || !user) return null;

  return (
    <MainLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto w-full pb-20">
        {/* Header & Search Bar */}
        <div className="mb-10">
          <h1 className="font-display-lg text-headline-xl lg:text-display-lg font-bold text-on-surface mb-6">
            Explore
          </h1>
          <div className="relative group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-4 pl-14 pr-6 text-on-surface font-body-lg placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all editorial-shadow"
              placeholder="Search for users by name or email..."
            />
          </div>
        </div>

        {/* Results Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Users className="text-primary" size={24} />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              {hasSearched
                ? `Search Results (${searchResults.length})`
                : "Discover People"}
            </h2>
          </div>

          {/* Empty States */}
          {!hasSearched ? (
            <div className="p-12 text-center border border-outline-variant rounded-xl bg-surface-container-lowest">
              <p className="text-on-surface-variant font-body-lg">
                Start typing to discover other members of the network.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-12 text-center border border-outline-variant rounded-xl bg-surface-container-lowest">
              <p className="text-on-surface-variant font-body-lg">
                No users found matching "{searchQuery}".
              </p>
            </div>
          ) : (
            // User Results List
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="p-6 flex items-center justify-between hover:bg-surface-container-low/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={u.avatar}
                      alt={`${u.first_name} ${u.last_name}`}
                      size="lg"
                      className="!w-12 !h-12 !rounded-xl"
                    />
                    <div>
                      <p className="font-body-md font-bold text-on-surface">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="font-label-mono text-on-surface-variant text-[10px]">
                        @{u.nickname || u.first_name.toLowerCase()} • {u.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/profile/${u.id}`)}
                  >
                    View Profile
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
