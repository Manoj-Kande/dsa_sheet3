import { create } from "zustand";

interface Streak { currentStreak: number; longestStreak: number; lastActiveDate: string | null; totalSolved: number; }

interface StreakStore {
  data: Streak;
  increment: () => void;
  set: (streak: Streak) => void;
}

export const useStreakStore = create<StreakStore>((set) => ({
  data: { currentStreak: 0, longestStreak: 0, lastActiveDate: null, totalSolved: 0 },
  increment: () => set(s => ({ data: { ...s.data, totalSolved: s.data.totalSolved + 1 } })),
  set: (streak) => set({ data: streak }),
}));
