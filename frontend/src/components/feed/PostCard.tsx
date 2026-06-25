// Core post display component. Supports Image, Text, Quote, and Bento variants.
// Handles backend image URL resolution and strictly adheres to the Editorial Pulse design system.

"use client";

import React, { useState } from "react";
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface PostCardProps {
  author: {
    name: string;
    handle?: string;
    avatar?: string;
  };
  timestamp: string;
  type?: "image" | "text" | "quote" | "bento";
  title?: string;
  content: string;
  image?: string;
  images?: string[]; // For bento layout
  likes: number;
  comments: number;
}

export const PostCard: React.FC<PostCardProps> = ({
  author,
  timestamp,
  type = "text",
  title,
  content,
  image,
  images,
  likes,
  comments,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  // Helper to resolve image URLs from the Go backend
  // If the image is a relative path (e.g., /uploads/123.jpg), prepend the API URL.
  const resolveImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${process.env.NEXT_PUBLIC_API_URL}${url}`;
  };

  const formattedTime = dayjs(timestamp).isValid() 
    ? dayjs(timestamp).fromNow().toUpperCase() 
    : timestamp.toUpperCase();

  return (
    <article className={cn(
      "p-6 border-b border-surface-container-high transition-colors group",
      type === "quote" ? "bg-surface-container-low/50 space-y-6" : "space-y-4 hover:bg-surface-container-lowest"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={resolveImageUrl(author.avatar || "")} alt={author.name} size="md" />
          <div>
            <h3 className="font-bold font-body-md text-on-surface">
              {author.name} {isLiked && <span className="text-primary ml-1">●</span>}
            </h3>
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              {formattedTime}
            </p>
          </div>
        </div>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content Variants */}
      {type === "quote" ? (
        <div className="relative py-8 px-6 border-l-4 border-primary bg-surface-container-lowest editorial-shadow rounded-r-xl">
          <p className="font-headline-md text-headline-lg leading-relaxed text-on-surface relative z-10 italic">
            "{content}"
          </p>
          {title && (
            <cite className="block mt-4 font-label-sm text-primary uppercase tracking-widest font-bold">
              — {title}
            </cite>
          )}
        </div>
      ) : type === "bento" && images ? (
        <div className="grid grid-cols-2 gap-2 h-96">
          <div className="h-full rounded-xl overflow-hidden border border-surface-container-high">
            <img src={resolveImageUrl(images[0])} alt="Gallery 1" className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-rows-2 gap-2 h-full">
            <div className="rounded-xl overflow-hidden border border-surface-container-high">
              <img src={resolveImageUrl(images[1])} alt="Gallery 2" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-xl overflow-hidden border border-surface-container-high bg-surface-container relative">
              <img src={resolveImageUrl(images[2])} alt="Gallery 3" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-headline-sm text-headline-sm text-on-surface">+{images.length - 2}</span>
              </div>
            </div>
          </div>
        </div>
      ) : image ? (
        <div className="rounded-xl overflow-hidden border border-surface-container-high editorial-shadow group-hover:border-primary/30 transition-colors">
          <img 
            src={resolveImageUrl(image)} 
            alt={title || "Post image"} 
            className="w-full aspect-video object-cover" 
          />
        </div>
      ) : null}

      {/* Text Content (for non-quote posts) */}
      {type !== "quote" && (
        <div className="space-y-2">
          {title && (
            <h2 className="font-headline-sm text-headline-sm leading-tight text-on-surface group-hover:text-primary transition-colors">
              {title}
            </h2>
          )}
          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3">
            {content}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-6">
          <button onClick={handleLike} className="flex items-center gap-2 group/btn">
            <Heart 
              className={cn(
                "transition-colors",
                isLiked ? "text-primary fill-primary" : "text-on-surface-variant group-hover/btn:text-primary"
              )} 
              size={20} 
            />
            <span className="font-label-sm text-on-surface">
              {isLiked ? likes + 1 : likes}
            </span>
          </button>
          <button className="flex items-center gap-2 group/btn">
            <MessageCircle className="text-on-surface-variant group-hover/btn:text-primary transition-colors" size={20} />
            <span className="font-label-sm text-on-surface">{comments}</span>
          </button>
          <button className="flex items-center gap-2 group/btn">
            <Share className="text-on-surface-variant group-hover/btn:text-primary transition-colors" size={20} />
          </button>
        </div>
        <button onClick={() => setIsBookmarked(!isBookmarked)}>
          <Bookmark 
            size={20} 
            className={cn(
              "transition-colors cursor-pointer",
              isBookmarked ? "text-primary fill-primary" : "text-on-surface-variant hover:text-primary"
            )} 
          />
        </button>
      </div>
    </article>
  );
};