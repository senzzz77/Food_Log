import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  authToken: string | null;
  user: { id: string; username: string } | null;
  activeProfileId: string | null;
  theme: "light" | "dark";
  setSession: (session: { token: string; user: { id: string; username: string } }) => void;
  setActiveProfile: (profileId: string | null) => void;
  setTheme: (theme: "light" | "dark") => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      authToken: null,
      user: null,
      activeProfileId: null,
      theme: "light",
      setSession: ({ token, user }) => set({ authToken: token, user }),
      setActiveProfile: (activeProfileId) => set({ activeProfileId }),
      setTheme: (theme) => set({ theme }),
      logout: () => set({ authToken: null, user: null, activeProfileId: null }),
    }),
    { name: "diet-assistant-session" },
  ),
);
