"use client";

import { create } from "zustand";
import { api, type User } from "@/lib/api";

type Status = "loading" | "in" | "out";

interface AuthState {
  status: Status;
  user: User | null;
  /** Check the session cookie on load. */
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    displayName: string,
    password: string,
    inviteCode: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  bootstrap: async () => {
    try {
      const { user } = await api.me();
      set({ status: "in", user });
    } catch {
      set({ status: "out", user: null });
    }
  },

  login: async (username, password) => {
    const { user } = await api.login(username, password);
    set({ status: "in", user });
  },

  register: async (username, displayName, password, inviteCode) => {
    const { user } = await api.register(
      username,
      displayName,
      password,
      inviteCode,
    );
    set({ status: "in", user });
  },

  logout: async () => {
    try {
      await api.logout();
    } finally {
      set({ status: "out", user: null });
    }
  },
}));
