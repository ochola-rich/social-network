// src/components/feed/PostCard.tsx
// Core post display component. Includes functional comments fetching, submission,
// image uploads for comments, and native sharing.

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MoreHorizontal,
  Send,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface CommentUser {
  id: number;
  first_name: string;
  last_name: string;
  avatar: string;
  nickname: string;
}

interface Comment {
  id: number;
  content: string;
  image?: string;
  created_at: string;
  user: CommentUser;
}

interface PostCardProps {
  id: number;
  authorId?: number;
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
  images?: string[];
  likes: number;
  comments: number;
}

export const PostCard: React.FC<PostCardProps> = ({
  id,
  authorId,
  author,
  timestamp,
  type = "text",
  title,
  content,
  image,
  images,
  likes,
  comments: initialCommentCount,
}) => {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string>("");
  const [isUploadingCommentImage, setIsUploadingCommentImage] = useState(false);

  const [shareMessage, setShareMessage] = useState("");

  const resolveImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${process.env.NEXT_PUBLIC_API_URL}${url}`;
  };

  const formattedTime = dayjs(timestamp).isValid()
    ? dayjs(timestamp).fromNow().toUpperCase()
    : timestamp.toUpperCase();

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const toggleComments = async () => {
    if (!showComments && commentsList.length === 0 && commentCount > 0) {
      setIsLoadingComments(true);
      try {
        const { data } = await apiClient.get(`/api/posts/${id}`);
        setCommentsList(data.comments || []);
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        setIsLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleCommentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCommentImage(file);
      setCommentImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && !commentImage) return;
    setIsSubmittingComment(true);
    try {
      let imagePath = "";
      if (commentImage) {
        setIsUploadingCommentImage(true);
        const formData = new FormData();
        formData.append("file", commentImage);
        const uploadRes = await apiClient.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imagePath = uploadRes.data.path;
        setIsUploadingCommentImage(false);
      }

      await apiClient.post(`/api/posts/${id}/comment`, {
        content: newComment.trim(),
        image: imagePath,
      });

      setNewComment("");
      setCommentImage(null);
      setCommentImagePreview("");

      const { data } = await apiClient.get(`/api/posts/${id}`);
      setCommentsList(data.comments || []);
      setCommentCount((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title || "Check out this post",
          text: content.substring(0, 100),
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareMessage("Link copied!");
        setTimeout(() => setShareMessage(""), 2000);
      }
    } catch (err) {
      console.error("Failed to share", err);
    }
  };

  return (
    <article
      className={cn(
        "p-6 border-b border-outline-variant transition-colors group",
        type === "quote"
          ? "bg-surface-container-low/50 space-y-6"
          : "space-y-4 hover:bg-surface-container-lowest",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => authorId && router.push(`/profile?userId=${authorId}`)}
        >
          <Avatar
            src={resolveImageUrl(author.avatar || "")}
            alt={author.name}
            size="md"
          />
          <div>
            <h3 className="font-bold text-sm text-on-surface">
              {author.name}{" "}
              {isLiked && <span className="text-primary ml-1">●</span>}
            </h3>
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
              {formattedTime}
            </p>
          </div>
        </div>
        <button className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-xl transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content Variants */}
      {type === "quote" ? (
        <div className="relative py-8 px-6 border-l-4 border-primary bg-surface-container-lowest rounded-r-2xl shadow-sm">
          <p className="text-lg font-medium leading-relaxed text-on-surface relative z-10 italic">
            &ldquo;{content}&rdquo;
          </p>
          {title && (
            <cite className="block mt-4 text-xs font-bold text-primary uppercase tracking-widest not-italic">
              — {title}
            </cite>
          )}
        </div>
      ) : type === "bento" && images ? (
        <div className="grid grid-cols-2 gap-2 h-96">
          <div className="h-full rounded-2xl overflow-hidden border border-outline-variant">
            <img
              src={resolveImageUrl(images[0])}
              alt="Gallery 1"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-rows-2 gap-2 h-full">
            <div className="rounded-2xl overflow-hidden border border-outline-variant">
              <img
                src={resolveImageUrl(images[1])}
                alt="Gallery 2"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-2xl overflow-hidden border border-outline-variant bg-surface-container relative">
              <img
                src={resolveImageUrl(images[2])}
                alt="Gallery 3"
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-on-surface">
                  +{images.length - 2}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : image ? (
        <div className="rounded-2xl overflow-hidden border border-outline-variant shadow-sm group-hover:border-primary/30 transition-colors">
          <img
            src={resolveImageUrl(image)}
            alt={title || "Post image"}
            className="w-full aspect-video object-cover"
          />
        </div>
      ) : null}

      {/* Text Content */}
      {type !== "quote" && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-base font-bold leading-tight text-on-surface group-hover:text-primary transition-colors">
              {title}
            </h2>
          )}
          <p className="text-sm text-on-surface-variant line-clamp-3 leading-relaxed">
            {content}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-6">
          <button
            onClick={handleLike}
            className="flex items-center gap-2 group/btn"
          >
            <Heart
              className={cn(
                "transition-colors",
                isLiked
                  ? "text-primary fill-primary"
                  : "text-on-surface-variant group-hover/btn:text-primary",
              )}
              size={20}
            />
            <span className="text-xs font-semibold text-on-surface">
              {likeCount}
            </span>
          </button>

          <button
            onClick={toggleComments}
            className="flex items-center gap-2 group/btn"
          >
            <MessageCircle
              className="text-on-surface-variant group-hover/btn:text-primary transition-colors"
              size={20}
            />
            <span className="text-xs font-semibold text-on-surface">
              {commentCount}
            </span>
            {showComments ? (
              <ChevronUp size={16} className="text-on-surface-variant" />
            ) : (
              <ChevronDown size={16} className="text-on-surface-variant" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 group/btn"
            >
              <Share
                className="text-on-surface-variant group-hover/btn:text-primary transition-colors"
                size={20}
              />
            </button>
            {shareMessage && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
                {shareMessage}
              </span>
            )}
          </div>
        </div>
        <button onClick={handleBookmark}>
          <Bookmark
            size={20}
            className={cn(
              "transition-colors cursor-pointer",
              isBookmarked
                ? "text-primary fill-primary"
                : "text-on-surface-variant hover:text-primary",
            )}
          />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-outline-variant space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {isLoadingComments ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : commentsList.length === 0 ? (
            <p className="text-center text-on-surface-variant text-sm py-2">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {commentsList.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar
                    src={resolveImageUrl(comment.user.avatar)}
                    alt={comment.user.first_name}
                    size="sm"
                    className="w-8 h-8 rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 bg-surface-container-low p-3 rounded-lg rounded-tl-none">
                    <p className="font-bold text-xs text-on-surface mb-1">
                      {comment.user.first_name} {comment.user.last_name}
                      <span className="font-normal text-on-surface-variant ml-2 text-[10px]">
                        {dayjs(comment.created_at).fromNow()}
                      </span>
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {comment.content}
                    </p>
                    {comment.image && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-outline-variant w-32 h-32">
                        <img
                          src={resolveImageUrl(comment.image)}
                          alt="Comment attachment"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {commentImagePreview && (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-outline-variant">
                <img
                  src={commentImagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setCommentImage(null);
                    setCommentImagePreview("");
                  }}
                  className="absolute top-1 right-1 bg-on-surface/80 text-surface p-0.5 rounded-full"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <label className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                <ImageIcon size={18} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleCommentImageChange}
                  className="hidden"
                />
              </label>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                disabled={isSubmittingComment}
              />
              <button
                onClick={handleAddComment}
                disabled={
                  (!newComment.trim() && !commentImage) || isSubmittingComment
                }
                className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment || isUploadingCommentImage ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
