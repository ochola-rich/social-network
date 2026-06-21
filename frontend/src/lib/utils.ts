// src/lib/utils.ts
// Utility function to merge Tailwind CSS classes without conflicts.
// Uses clsx for conditional logic and tailwind-merge to resolve style overrides.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
