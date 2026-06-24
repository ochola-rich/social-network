"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  avatar: string;
  nickname: string;
  about_me: string;
  is_public: boolean;
  created_at: string;
}

interface ProfileData {
  user: UserProfile;
  follower_count: number;
  following_count: number;
  followers: UserProfile[];
  following: UserProfile[];
  posts: Array<{
    id: number;
    user_id: number;
    title: string;
    content: string;
    image: string;
    privacy: string;
    created_at: string;
    comment_count: number;
  }>;
}

const TABS = ["POSTS", "MEDIA", "GROUPS", "LIKES"];

export default function ProfilePage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading, fetchCurrentUser } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("POSTS");

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/api/profile/${currentUser.id}`);
        setProfileData(response.data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!currentUser || !profileData) {
    return null;
  }

  return (
    <MainLayout>
      <div className="pb-20">
        {/* Cover Photo */}
        <section className="relative h-64 md:h-80 w-full overflow-hidden bg-surface-container-high">
          <img 
            src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop" 
            alt="Cover" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        </section>

        {/* Profile Header */}
        <div className="px-6 -mt-16 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="border-4 border-background rounded-full overflow-hidden shadow-xl bg-surface-container">
              <Avatar 
                src={profileData.user.avatar} 
                alt={`${profileData.user.first_name} ${profileData.user.last_name}`} 
                size="xl" 
                className="!w-32 !h-32 md:!w-40 md:!h-40" 
              />
            </div>
            <div className="pb-2">
              <h2 className="font-display-lg text-display-lg-mobile md:text-headline-xl font-bold leading-tight text-on-surface">
                {profileData.user.first_name} {profileData.user.last_name}
              </h2>
              <p className="font-label-mono text-primary text-body-md tracking-wider">
                @{profileData.user.nickname || profileData.user.first_name.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pb-2">
            <Button className="px-6 py-2 bg-primary-container text-on-primary font-bold rounded-lg shadow-sm">
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Bio & Stats */}
        <div className="px-6 mb-8">
          <p className="font-body-lg max-w-2xl text-on-surface-variant">
            {profileData.user.about_me || "No bio yet."}
          </p>
          <div className="flex gap-8 mt-6 py-4 border-y border-outline-variant">
            <div>
              <span className="font-bold text-on-surface text-body-lg">{profileData.posts.length}</span>
              <span className="font-label-mono text-on-surface-variant ml-1 uppercase text-[10px]">Posts</span>
            </div>
            <div>
              <span className="font-bold text-on-surface text-body-lg">{profileData.follower_count}</span>
              <span className="font-label-mono text-on-surface-variant ml-1 uppercase text-[10px]">Followers</span>
            </div>
            <div>
              <span className="font-bold text-on-surface text-body-lg">{profileData.following_count}</span>
              <span className="font-label-mono text-on-surface-variant ml-1 uppercase text-[10px]">Following</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-outline-variant flex px-6">
          {TABS.map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-4 font-label-mono transition-all",
                activeTab === tab 
                  ? "text-primary border-b-2 border-primary font-bold" 
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Posts Grid */}
        <div className="p-6">
          {activeTab === "POSTS" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileData.posts.length === 0 ? (
                <div className="col-span-full p-12 text-center">
                  <p className="text-on-surface-variant font-body-lg mb-2">No posts yet</p>
                  <p className="text-on-surface-variant font-body-sm">
                    Start sharing your thoughts with the community.
                  </p>
                </div>
              ) : (
                profileData.posts.map((post) => (
                  <article 
                    key={post.id} 
                    className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 pulse-hover transition-all group shadow-sm"
                  >
                    <div className="flex justify-between mb-4">
                      <span className="font-label-mono text-on-surface-variant text-[10px]">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {post.title && (
                      <h4 className="font-headline-sm text-headline-sm mb-2 text-on-surface">
                        {post.title}
                      </h4>
                    )}
                    <p className="font-body-md text-on-surface-variant mb-4">
                      {post.content}
                    </p>
                    {post.image && (
                      <div className="rounded-lg overflow-hidden h-48 mb-4 border border-outline-variant">
                        <img 
                          src={post.image} 
                          alt={post.title || "Post image"} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-on-surface-variant pt-4 border-t border-outline-variant">
                      <span className="font-label-mono">{post.comment_count} comments</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {activeTab === "MEDIA" && (
            <div className="p-12 text-center">
              <p className="text-on-surface-variant font-body-md">No media to display</p>
            </div>
          )}

          {activeTab === "GROUPS" && (
            <div className="p-12 text-center">
              <p className="text-on-surface-variant font-body-md">No groups yet</p>
            </div>
          )}

          {activeTab === "LIKES" && (
            <div className="p-12 text-center">
              <p className="text-on-surface-variant font-body-md">No likes to display</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}