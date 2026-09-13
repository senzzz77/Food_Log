import Taro from '@tarojs/taro';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LocalUser } from '@/types/domain';

interface AppState {
  authToken: string | null;
  user: LocalUser | null;
  activeProfileId: string | null;
  setSession: (session: { token: string; user: LocalUser }) => void;
  setActiveProfile: (profileId: string | null) => void;
  logout: () => void;
}

const taroStorage = {
  getItem: (name: string) => {
    const value = Taro.getStorageSync(name);
    return value ? (value as string) : null;
  },
  setItem: (name: string, value: string) => {
    Taro.setStorageSync(name, value);
  },
  removeItem: (name: string) => {
    Taro.removeStorageSync(name);
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      authToken: null,
      user: null,
      activeProfileId: null,
      setSession: ({ token, user }) => set({ authToken: token, user }),
      setActiveProfile: (activeProfileId) => set({ activeProfileId }),
      logout: () => set({ authToken: null, user: null, activeProfileId: null }),
    }),
    {
      name: 'diet-assistant-session',
      storage: createJSONStorage(() => taroStorage),
    },
  ),
);
