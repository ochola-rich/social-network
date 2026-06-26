// src/components/ui/UsersListModal.tsx
// Modal to display a list of users (followers/following).

"use client";

import React from "react";
import { X } from "lucide-react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  avatar?: string;
  nickname?: string;
}

interface UsersListModalProps {
  isOpen: boolean;
  title: string;
  users: User[];
  onClose: () => void;
}

export const UsersListModal: React.FC<UsersListModalProps> = ({
  isOpen,
  title,
  users,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 className="text-xl font-bold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-1">
          {users.length === 0 ? (
            <p className="text-center text-on-surface-variant py-8 text-sm">
              No users to display.
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 hover:bg-surface-container-low rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user.avatar}
                    alt={`${user.first_name} ${user.last_name}`}
                    size="md"
                    className="rounded-xl"
                  />
                  <div>
                    <p className="font-bold text-sm text-on-surface">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-mono">
                      @{user.nickname || user.first_name.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
