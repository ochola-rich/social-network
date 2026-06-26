"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Search, Users, ArrowRight, Sparkles, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/api";

// Interface matching the backend User model
interface SearchedUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string;
  nickname: string;
  bio?: string;
  followers_count?: number;
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

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
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
      setSearchResults(data.users || []);
      setHasSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce: 300ms
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
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Main Content Wrapper */}
        <div className="max-w-5xl mx-auto px-6 py-8 pb-24">
          {/* Page Header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="text-[#8B1538]" size={24} strokeWidth={2} />
              <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">
                Explore
              </h1>
            </div>
            <p className="text-[#6B6B6B] text-sm font-medium ml-[2.25rem]">
              Discover creators, editors, and voices across the network
            </p>
          </header>

          {/* Search Bar */}
          <div className="relative mb-10 group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search
                className={`h-5 w-5 transition-colors duration-200 ${
                  searchQuery ? "text-[#8B1538]" : "text-[#A3A3A3]"
                }`}
              />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-14 pr-5 py-4 bg-white border border-[#E5E5E5] rounded-2xl text-[#1A1A1A] placeholder-[#A3A3A3] text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#8B1538]/20 focus:border-[#8B1538] transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="Search by name, handle, or email..."
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                <div className="h-4 w-4 border-2 border-[#8B1538] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Results Section */}
          <section>
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="text-[#8B1538]" size={20} strokeWidth={2.5} />
                <h2 className="text-lg font-bold text-[#1A1A1A] tracking-tight">
                  {hasSearched
                    ? `Results (${searchResults.length})`
                    : "Discover People"}
                </h2>
              </div>
              {hasSearched && searchResults.length > 0 && (
                <span className="text-xs font-semibold text-[#8B1538] uppercase tracking-wider">
                  {searchResults.length} found
                </span>
              )}
            </div>

            {/* Content States */}
            {!hasSearched ? (
              /* Initial Empty State */
              <div className="flex flex-col items-center justify-center py-20 px-6 bg-white border border-[#E5E5E5] rounded-2xl">
                <div className="w-16 h-16 bg-[#8B1538]/5 rounded-2xl flex items-center justify-center mb-5">
                  <Search className="text-[#8B1538]/40" size={28} />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                  Start Exploring
                </h3>
                <p className="text-[#6B6B6B] text-sm text-center max-w-sm leading-relaxed">
                  Type a name, handle, or email to discover other members of the
                  editorial network.
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              /* No Results State */
              <div className="flex flex-col items-center justify-center py-20 px-6 bg-white border border-[#E5E5E5] rounded-2xl">
                <div className="w-16 h-16 bg-[#8B1538]/5 rounded-2xl flex items-center justify-center mb-5">
                  <Users className="text-[#8B1538]/40" size={28} />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">
                  No matches found
                </h3>
                <p className="text-[#6B6B6B] text-sm text-center max-w-sm leading-relaxed">
                  We couldn&apos;t find anyone matching &ldquo;{searchQuery}
                  &rdquo;. Try a different name or email.
                </p>
              </div>
            ) : (
              /* Results Grid */
              <div className="space-y-3">
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="group bg-white border border-[#E5E5E5] rounded-2xl p-5 flex items-center gap-5 hover:border-[#8B1538]/30 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => router.push(`/profile/${u.id}`)}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar
                        src={u.avatar}
                        alt={`${u.first_name} ${u.last_name}`}
                        size="lg"
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-[#1A1A1A] truncate">
                          {u.first_name} {u.last_name}
                        </h3>
                        {u.followers_count !== undefined &&
                          u.followers_count > 1000 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#8B1538]/10 text-[#8B1538] text-[10px] font-bold uppercase tracking-wider">
                              Editor
                            </span>
                          )}
                      </div>
                      <p className="text-xs font-mono text-[#8B1538] font-semibold mb-1">
                        @
                        {u.nickname ||
                          `${u.first_name.toLowerCase()}${u.last_name.toLowerCase().charAt(0)}`}
                      </p>
                      {u.bio && (
                        <p className="text-sm text-[#6B6B6B] truncate leading-relaxed">
                          {u.bio}
                        </p>
                      )}
                      {!u.bio && (
                        <p className="text-sm text-[#A3A3A3] truncate">
                          {u.email}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538] hover:text-white transition-all duration-200 font-semibold text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/profile/${u.id}`);
                        }}
                      >
                        <ArrowRight size={14} className="mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
