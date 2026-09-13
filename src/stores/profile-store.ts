import { create } from "zustand";
import type { Profile } from "@/types/domain";
import { createProfile, listProfiles } from "@/services/profile-service";

interface ProfileState {
  profiles: Profile[];
  isLoading: boolean;
  error: string | null;
  load: (token: string) => Promise<void>;
  create: (token: string, data: Pick<Profile, "displayName" | "accent">) => Promise<Profile>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  isLoading: false,
  error: null,
  load: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const { profiles } = await listProfiles(token);
      set({ profiles, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "无法读取档案。", isLoading: false });
    }
  },
  create: async (token, data) => {
    const { profile } = await createProfile(token, data);
    set((state) => ({ profiles: [profile, ...state.profiles] }));
    return profile;
  },
  reset: () => set({ profiles: [], isLoading: false, error: null }),
}));
