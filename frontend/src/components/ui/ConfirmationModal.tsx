// src/components/ui/ConfirmationModal.tsx
// Reusable confirmation modal for critical actions like unfollowing or changing privacy.

"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl editorial-shadow overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 flex items-start gap-4">
          <div
            className={`p-3 rounded-full ${isDestructive ? "bg-error/10" : "bg-primary/10"}`}
          >
            <AlertTriangle
              className={isDestructive ? "text-error" : "text-primary"}
              size={24}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-headline-sm text-on-surface mb-2">{title}</h3>
            <p className="font-body-sm text-on-surface-variant">{message}</p>
          </div>
        </div>
        <div className="p-6 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-low/50">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            className={
              isDestructive ? "bg-error hover:bg-error/90 text-white" : ""
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
