// src/components/groups/CreateGroupModal.tsx
"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/lib/api";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await apiClient.post("/api/groups", { title, description });
      setTitle("");
      setDescription("");
      onGroupCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-xl editorial-shadow overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 className="text-xl font-bold text-on-surface">
            Create New Group
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <p className="text-error font-body-sm">{error}</p>}
          <Input
            label="Group Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Editorial Design Collective"
            required
          />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none min-h-[100px]"
              placeholder="What is this group about?"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            disabled={!title.trim()}
          >
            Create Group
          </Button>
        </form>
      </div>
    </div>
  );
};
