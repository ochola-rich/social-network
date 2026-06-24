
"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { PostCard } from "./PostCard";
import { StoryStrip } from "./StoryStrip";

interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  image: string;
  privacy: string;
  created_at: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar: string;
    nickname: string;
  };
  comment_count: number;
}

export const FeedPosts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get("/api/posts/feed");
        setPosts(response.data.posts || []);
      } catch (err) {
        console.error("Failed to fetch feed:", err);
        setError("Failed to load posts. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StoryStrip />
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 border-b border-surface-container-high animate-pulse">
            <div className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-container-high rounded w-1/3" />
                <div className="h-3 bg-surface-container-high rounded w-1/4" />
              </div>
            </div>
            <div className="h-64 bg-surface-container-high rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center">
        <p className="text-on-surface-variant font-body-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 text-primary font-bold hover:underline"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <StoryStrip />
      
      {posts.length === 0 ? (
        <div className="p-12 text-center border-b border-surface-container-high">
          <p className="text-on-surface-variant font-body-lg mb-2">No posts yet</p>
          <p className="text-on-surface-variant font-body-sm">
            Posts from people you follow will appear here.
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            author={{
              name: `${post.user.first_name} ${post.user.last_name}`,
              handle: post.user.nickname || `@${post.user.first_name.toLowerCase()}`,
              avatar: post.user.avatar,
            }}
            timestamp={post.created_at}
            type={post.image ? "image" : "text"}
            title={post.title}
            content={post.content}
            image={post.image || undefined}
            likes={0}
            comments={post.comment_count}
          />
        ))
      )}
    </div>
  );
};