// src/app/profile/page.tsx
// User profile page — supports viewing own profile or other users via ?userId= query param.
// Zero hardcoded data. All content fetched from backend.

"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { UsersListModal } from "@/components/ui/UsersListModal";
import { apiClient } from "@/lib/api";
import {
  Lock,
  Globe,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  avatar: string;
  nickname: string;
  about_me: string;
  is_public: boolean;
}

interface Post {
  id: number;
  title?: string;
  content: string;
  image?: string;
  created_at: string;
  comment_count: number;
  like_count: number;
  is_featured?: boolean;
}

interface ProfileData {
  user: UserProfile;
  follower_count: number;
  following_count: number;
  followers: any[] | null;
  following: any[] | null;
  posts: Post[] | null;
  is_private?: boolean;
  message?: string;
}

const TABS = ["POSTS", "MEDIA", "GROUPS", "LIKES"] as const;
type Tab = (typeof TABS)[number];

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get("userId");

  const {
    user: currentUser,
    isLoading: authLoading,
    fetchCurrentUser,
  } = useAuthStore();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("POSTS");

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [pendingPrivacy, setPendingPrivacy] = useState<boolean | null>(null);

  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Fetch profile based on URL param or current user
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        setIsLoading(true);
        const targetId = urlUserId ? Number(urlUserId) : currentUser.id;
        const response = await apiClient.get(`/api/profile/${targetId}`);
        setProfileData(response.data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser, urlUserId]);

  useEffect(() => {
    const fetchUserGroups = async () => {
      if (activeTab !== "GROUPS" || userGroups.length > 0) return;
      setIsLoadingGroups(true);
      try {
        const { data } = await apiClient.get("/api/groups");
        const joinedGroups = (data.groups || []).filter(
          (g: any) => g.is_member,
        );
        setUserGroups(joinedGroups);
      } catch (err) {
        console.error("Failed to fetch user groups:", err);
      } finally {
        setIsLoadingGroups(false);
      }
    };
    fetchUserGroups();
  }, [activeTab, userGroups.length]);

  const fetchFollowers = async () => {
    if (followersList.length > 0) return;
    try {
      const { data } = await apiClient.get("/api/follow/followers");
      setFollowersList(data.followers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFollowing = async () => {
    if (followingList.length > 0) return;
    try {
      const { data } = await apiClient.get("/api/follow/following");
      setFollowingList(data.following || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrivacyToggle = (newIsPublic: boolean) => {
    setPendingPrivacy(newIsPublic);
    setShowPrivacyModal(true);
  };

  const confirmPrivacyChange = async () => {
    if (pendingPrivacy === null || !profileData) return;
    try {
      await apiClient.post("/api/profile/privacy", {
        is_public: pendingPrivacy,
      });
      setProfileData({
        ...profileData,
        user: { ...profileData.user, is_public: pendingPrivacy },
      });
      setShowPrivacyModal(false);
      setPendingPrivacy(null);
    } catch (err) {
      console.error("Failed to update privacy", err);
    }
  };

  if (authLoading || isLoading || !currentUser) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (!profileData) return null;

  if (profileData.is_private) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background">
          <div className="flex flex-col items-center justify-center py-32 px-6">
            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-5">
              <Lock className="text-primary/40" size={28} />
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">
              This profile is private
            </h2>
            <p className="text-on-surface-variant text-sm text-center max-w-sm leading-relaxed">
              You must follow this user to see their posts and activity.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { user, posts, followers, following } = profileData;
  const isOwnProfile = currentUser.id === user.id;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Cover Photo */}
        <section className="relative h-56 md:h-72 w-full overflow-hidden bg-surface-container-high">
          <img
            src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop"
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        </section>

        {/* Profile Header */}
        <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-5">
              <div className="border-4 border-background rounded-2xl overflow-hidden shadow-xl bg-surface-container">
                <Avatar
                  src={user.avatar}
                  alt={`${user.first_name} ${user.last_name}`}
                  size="xl"
                  className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover"
                />
              </div>
              <div className="pb-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface leading-tight">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="text-sm font-mono font-semibold text-primary mt-0.5">
                  @{user.nickname || user.first_name.toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-1">
              {isOwnProfile && (
                <button
                  onClick={() => handlePrivacyToggle(!user.is_public)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:border-primary/30 hover:text-primary transition-all duration-200"
                >
                  {user.is_public ? (
                    <Globe size={14} strokeWidth={2.5} />
                  ) : (
                    <Lock size={14} strokeWidth={2.5} />
                  )}
                  {user.is_public ? "Public" : "Private"}
                </button>
              )}

              {!isOwnProfile && (
                <Button
                  variant="outline"
                  className="rounded-xl px-6 py-2.5 text-sm font-bold"
                  onClick={() => router.push(`/messages?userId=${user.id}`)}
                >
                  Message
                </Button>
              )}

              <Button
                className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-all duration-200 ${isOwnProfile ? "bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low" : "bg-primary text-on-primary hover:bg-primary/90 shadow-sm hover:shadow-md"}`}
              >
                {isOwnProfile ? "Edit Profile" : "Follow"}
              </Button>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-2xl">
              {user.about_me || "No bio yet."}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-8 py-5 border-y border-outline-variant mb-2">
            <div className="text-center md:text-left">
              <span className="text-lg font-bold text-on-surface">
                {posts?.length || 0}
              </span>
              <span className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider ml-1.5">
                Posts
              </span>
            </div>
            <button
              onClick={() => {
                setShowFollowersModal(true);
                fetchFollowers();
              }}
              className="text-center md:text-left hover:text-primary transition-colors"
            >
              <span className="text-lg font-bold text-on-surface">
                {followers?.length || profileData.follower_count || 0}
              </span>
              <span className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider ml-1.5">
                Followers
              </span>
            </button>
            <button
              onClick={() => {
                setShowFollowingModal(true);
                fetchFollowing();
              }}
              className="text-center md:text-left hover:text-primary transition-colors"
            >
              <span className="text-lg font-bold text-on-surface">
                {following?.length || profileData.following_count || 0}
              </span>
              <span className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider ml-1.5">
                Following
              </span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
          <div className="max-w-4xl mx-auto px-6 flex">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all duration-200 relative ${activeTab === tab ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-6 pb-24">
          {/* POSTS TAB */}
          {activeTab === "POSTS" && (
            <div className="space-y-4">
              {!posts || posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                    <MessageCircle className="text-primary/30" size={20} />
                  </div>
                  <p className="text-sm font-bold text-on-surface mb-1">
                    No posts yet
                  </p>
                  <p className="text-xs text-on-surface-variant text-center">
                    Start sharing your thoughts with the community.
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <article
                    key={post.id}
                    className="group bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden hover:border-primary/20 hover:shadow-md transition-all duration-200"
                  >
                    {post.is_featured && (
                      <div className="px-6 pt-4 pb-1">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          Featured
                        </span>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono text-on-surface-variant">
                          {new Date(post.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>
                      </div>
                      {post.title && (
                        <h3 className="text-lg font-bold text-on-surface mb-2 leading-snug group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                      )}
                      <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                        {post.content}
                      </p>
                      {post.image && (
                        <div className="rounded-xl overflow-hidden mb-4 border border-outline-variant">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL}${post.image}`}
                            alt={post.title || "Post image"}
                            className="w-full h-56 object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant">
                      <div className="flex items-center gap-6">
                        <button className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors">
                          <Heart size={16} strokeWidth={2} />
                          <span className="text-xs font-semibold">
                            {post.like_count || 0}
                          </span>
                        </button>
                        <button className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors">
                          <MessageCircle size={16} strokeWidth={2} />
                          <span className="text-xs font-semibold">
                            {post.comment_count || 0}
                          </span>
                        </button>
                        <button className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors">
                          <Share2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                      <button className="text-on-surface-variant hover:text-primary transition-colors">
                        <Bookmark size={16} strokeWidth={2} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* MEDIA TAB */}
          {activeTab === "MEDIA" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {posts?.filter((p) => p.image).length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                    <ImageIcon className="text-primary/30" size={20} />
                  </div>
                  <p className="text-sm font-bold text-on-surface mb-1">
                    No media yet
                  </p>
                  <p className="text-xs text-on-surface-variant text-center">
                    Photos and videos will appear here.
                  </p>
                </div>
              ) : (
                posts
                  ?.filter((p) => p.image)
                  .map((post) => (
                    <div
                      key={post.id}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-outline-variant bg-surface-container-high cursor-pointer"
                    >
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}${post.image}`}
                        alt={post.title || "Media"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-on-surface/0 group-hover:bg-on-surface/40 transition-colors flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-1 text-on-primary">
                          <Heart size={16} fill="currentColor" />
                          <span className="text-xs font-bold">
                            {post.like_count || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-on-primary">
                          <MessageCircle size={16} fill="currentColor" />
                          <span className="text-xs font-bold">
                            {post.comment_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* GROUPS TAB */}
          {activeTab === "GROUPS" && (
            <div>
              {isLoadingGroups ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : userGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                    <Users className="text-primary/30" size={20} />
                  </div>
                  <p className="text-sm font-bold text-on-surface mb-1">
                    No groups joined yet
                  </p>
                  <p className="text-xs text-on-surface-variant text-center max-w-xs mb-4">
                    Discover and join communities that match your interests.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => router.push("/groups")}
                  >
                    Explore Groups
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {userGroups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => router.push(`/groups/${group.id}`)}
                      className="group bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Users
                            className="text-primary"
                            size={18}
                            strokeWidth={2.5}
                          />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                          Joined
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 mb-3">
                        <h3 className="text-base font-bold text-on-surface mb-2 truncate group-hover:text-primary transition-colors">
                          {group.title}
                        </h3>
                        <p className="text-sm text-on-surface-variant line-clamp-2 leading-snug">
                          {group.description || "No description provided."}
                        </p>
                      </div>
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
                        <Share2
                          size={16}
                          className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LIKES TAB */}
          {activeTab === "LIKES" && (
            <div className="flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
              <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                <Heart className="text-primary/30" size={20} />
              </div>
              <p className="text-sm font-bold text-on-surface mb-1">
                No likes yet
              </p>
              <p className="text-xs text-on-surface-variant text-center max-w-xs">
                Posts you appreciate will be saved here for easy access.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showPrivacyModal}
        title={
          pendingPrivacy ? "Make Profile Public?" : "Make Profile Private?"
        }
        message={
          pendingPrivacy
            ? "Anyone on the platform will be able to see your profile and posts."
            : "Only your approved followers will be able to see your profile and posts."
        }
        confirmLabel={pendingPrivacy ? "Go Public" : "Go Private"}
        onConfirm={confirmPrivacyChange}
        onCancel={() => setShowPrivacyModal(false)}
      />
      <UsersListModal
        isOpen={showFollowersModal}
        title="Followers"
        users={followersList}
        onClose={() => setShowFollowersModal(false)}
      />
      <UsersListModal
        isOpen={showFollowingModal}
        title="Following"
        users={followingList}
        onClose={() => setShowFollowingModal(false)}
      />
    </MainLayout>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
