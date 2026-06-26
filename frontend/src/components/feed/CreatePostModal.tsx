// src/components/feed/CreatePostModal.tsx
// Real image uploads, privacy selection, and private user targeting.
// Zero hardcoded data. All content fetched from backend.

"use client";

import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, Lock, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PrivacyLevel = "public" | "almost_private" | "private";

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyLevel>("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Private Post User Selection State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  useEffect(() => {
    if (!searchQuery.trim() || privacy !== "private") {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await apiClient.get(
          `/api/users/search?q=${searchQuery}`,
        );
        setSearchResults(data.users || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, privacy]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let imagePath = "";

      // 1. Upload image if present
      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);
        const uploadRes = await apiClient.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imagePath = uploadRes.data.path;
      }

      // 2. Create post
      await apiClient.post("/api/posts", {
        title,
        content,
        privacy,
        image: imagePath,
        user_ids: privacy === "private" ? selectedUserIds : [],
      });

      // Reset and close
      setContent("");
      setTitle("");
      setPrivacy("public");
      setSelectedImage(null);
      setImagePreview("");
      setSelectedUserIds([]);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const privacyOptions = [
    { id: "public" as PrivacyLevel, label: "Public", icon: Globe },
    { id: "almost_private" as PrivacyLevel, label: "Followers", icon: Users },
    { id: "private" as PrivacyLevel, label: "Private", icon: Lock },
  ];

  const currentPrivacy = privacyOptions.find((p) => p.id === privacy);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 className="text-xl font-bold text-on-surface">Create Post</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-error/10 text-error text-sm font-bold rounded-xl">
              {error}
            </div>
          )}

          {/* User Info */}
          <div className="flex gap-4 mb-6">
            <Avatar
              src={user?.avatar}
              alt={user?.first_name || "User"}
              size="lg"
              className="rounded-xl"
            />
            <div>
              <p className="font-bold text-on-surface">
                {user?.first_name} {user?.last_name}
              </p>
              <div className="flex items-center gap-1.5 mt-1 px-2.5 py-1 bg-surface-container-low border border-outline-variant rounded-full w-fit">
                {currentPrivacy &&
                  React.createElement(currentPrivacy.icon, {
                    size: 12,
                    className: "text-primary",
                  })}
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {currentPrivacy?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title (optional)"
            className="w-full mb-4 bg-transparent text-on-surface text-xl font-bold placeholder:text-on-surface-variant/50 focus:outline-none"
          />

          {/* Content Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full min-h-[150px] bg-transparent text-on-surface text-lg placeholder:text-on-surface-variant/50 focus:outline-none resize-none"
            autoFocus
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-4 relative rounded-xl overflow-hidden border border-outline-variant">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview("");
                }}
                className="absolute top-2 right-2 bg-on-surface/80 text-surface p-1.5 rounded-full hover:bg-on-surface transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Private User Selection */}
          {privacy === "private" && (
            <div className="mt-6 p-4 bg-surface-container-low rounded-2xl border border-outline-variant">
              <p className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                Select users who can see this post
              </p>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2.5 text-sm mb-3 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              />
              {searchResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => toggleUserSelection(u.id)}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors",
                        selectedUserIds.includes(u.id)
                          ? "bg-primary/10"
                          : "hover:bg-surface-container-high",
                      )}
                    >
                      <Avatar
                        src={u.avatar}
                        alt={u.first_name}
                        size="sm"
                        className="rounded-lg"
                      />
                      <span className="text-sm font-medium text-on-surface">
                        {u.first_name} {u.last_name}
                      </span>
                      {selectedUserIds.includes(u.id) && (
                        <span className="ml-auto text-primary text-xs font-bold">
                          Selected
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedUserIds.length > 0 && (
                <p className="mt-3 text-xs text-primary font-bold">
                  {selectedUserIds.length} user
                  {selectedUserIds.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
              <ImageIcon size={20} />
              <span className="text-sm font-semibold">Photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
            <div className="h-6 w-px bg-outline-variant" />
            <div className="flex items-center gap-1">
              {privacyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPrivacy(option.id)}
                  className={cn(
                    "p-2 rounded-xl transition-all duration-200",
                    privacy === option.id
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high",
                  )}
                  title={option.label}
                >
                  <option.icon size={18} />
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              !content.trim() ||
              isSubmitting ||
              (privacy === "private" && selectedUserIds.length === 0)
            }
            isLoading={isSubmitting}
            className="rounded-xl"
          >
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
};
