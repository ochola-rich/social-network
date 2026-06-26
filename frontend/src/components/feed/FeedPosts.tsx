// src/components/feed/FeedPosts.tsx
// Main feed component. Fetches posts and renders them using PostCard.
// Zero hardcoded data. All content fetched from backend.

"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { PostCard } from "./PostCard";
import { StoryStrip } from "./StoryStrip";
import { MessageSquare } from "lucide-react";

interface Post {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    nickname: string;
    avatar: string;
  };
  title: string;
  content: string;
  image: string;
  created_at: string;
  comment_count: number;
  like_count: number;
}

export const FeedPosts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const { data } = await apiClient.get("/api/posts/feed");
        setPosts(data.posts || []);
      } catch (err) {
        console.error("Failed to fetch feed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeed();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 bg-surface-container-high rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <StoryStrip />
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-5">
            <MessageSquare className="text-primary/40" size={28} />
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">
            No posts yet
          </h3>
          <p className="text-on-surface-variant text-sm text-center max-w-sm leading-relaxed">
            Follow some users to see their content here!
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            id={post.id}
            authorId={post.user.id}
            author={{
              name: `${post.user.first_name} ${post.user.last_name}`,
              handle:
                post.user.nickname || `@${post.user.first_name.toLowerCase()}`,
              avatar: post.user.avatar,
            }}
            timestamp={post.created_at}
            type={post.image ? "image" : "text"}
            title={post.title}
            content={post.content}
            image={post.image || undefined}
            likes={post.like_count || 0}
            comments={post.comment_count || 0}
          />
        ))
      )}
    </section>
  );
};
