// Zustand store for managing global authentication state.
// Tracks the current user and provides actions for login/logout.

import { create } from "zustand";
import { User } from "@/types";
import { apiClient } from "@/lib/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  fetchCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  fetchCurrentUser: async () => {
    try {
      const { data } = await apiClient.get("/api/auth/me");
      set({ user: data.user, isLoading: false });
    } catch (error) {
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/api/auth/logout");
      set({ user: null });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  },
}));
