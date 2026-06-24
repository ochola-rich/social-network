"use client";

import React, { useState } from "react";
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

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyLevel>("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/api/posts", {
        title,
        content,
        privacy,
        image: "",
      });

      // Reset and close
      setContent("");
      setTitle("");
      setPrivacy("public");
      onClose();
      
      // Reload the feed
      window.location.reload();
    } catch (err) {
      console.error("Failed to create post:", err);
      setError("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const privacyOptions = [
    { id: "public" as PrivacyLevel, label: "Public", icon: Globe },
    { id: "almost_private" as PrivacyLevel, label: "Followers", icon: Users },
    { id: "private" as PrivacyLevel, label: "Private", icon: Lock },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl editorial-shadow overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-error/10 text-error text-sm font-medium rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <Avatar src={user?.avatar} alt={user?.first_name || "User"} size="lg" />
            <div>
              <p className="font-bold text-on-surface">
                {user?.first_name} {user?.last_name}
              </p>
              <div className="flex items-center gap-1 mt-1 px-2 py-0.5 bg-surface-container-low border border-outline-variant rounded-full w-fit">
                {React.createElement(
                  privacyOptions.find((p) => p.id === privacy)?.icon || Globe,
                  { size: 12, className: "text-primary" }
                )}
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {privacyOptions.find((p) => p.id === privacy)?.label}
                </span>
              </div>
            </div>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title (optional)"
            className="w-full mb-4 bg-transparent text-on-surface text-xl font-bold placeholder:text-on-surface-variant/50 focus:outline-none"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full min-h-[150px] bg-transparent text-on-surface text-lg placeholder:text-on-surface-variant/50 focus:outline-none resize-none"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
              <ImageIcon size={20} />
              <span className="text-sm font-semibold">Photo</span>
            </button>

            <div className="h-6 w-px bg-outline-variant" />

            <div className="flex items-center gap-2">
              {privacyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPrivacy(option.id)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    privacy === option.id
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high"
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
            disabled={!content.trim() || isSubmitting}
            isLoading={isSubmitting}
          >
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
};