import { create } from "zustand";
import { fetchJson } from "@/lib/fetch-client";

export interface DailyTargetProblem { id: string; problemSlug: string; note: string | null; order: number; }
export interface DailyTargetEntry { id: string; date: string; note: string | null; problems: DailyTargetProblem[]; }

interface DailyTargetStore {
  data: Record<string, DailyTargetEntry>;
  loaded: boolean;
  load: (weekStart?: string) => Promise<void>;
  getTodayTarget: () => DailyTargetEntry | null;
  setDayTarget: (date: string, problems: { problemSlug: string; note?: string }[], note?: string) => Promise<void>;
  addProblemToDay: (date: string, problemSlug: string, note?: string) => Promise<void>;
  removeProblemFromDay: (date: string, problemSlug: string) => Promise<void>;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const useDailyTargetStore = create<DailyTargetStore>((set, get) => ({
  data: {},
  loaded: false,

  load: async (weekStart) => {
    const url = weekStart ? `/api/daily-target?weekStart=${weekStart}` : "/api/daily-target";
    const targets = await fetchJson<DailyTargetEntry[]>(url);
    set(s => {
      const next = { ...s.data };
      targets.forEach(t => { next[t.date] = t; });
      return { data: next, loaded: true };
    });
  },

  getTodayTarget: () => get().data[todayIso()] ?? null,

  setDayTarget: async (date, problems, note) => {
    const result = await fetchJson<DailyTargetEntry>("/api/daily-target", {
      method: "POST", body: JSON.stringify({ action: "set", date, problems, note }),
    });
    set(s => ({ data: { ...s.data, [date]: result } }));
  },

  addProblemToDay: async (date, problemSlug, note) => {
    const result = await fetchJson<DailyTargetEntry>("/api/daily-target", {
      method: "POST", body: JSON.stringify({ action: "add", date, problemSlug, note }),
    });
    set(s => ({ data: { ...s.data, [date]: result } }));
  },

  removeProblemFromDay: async (date, problemSlug) => {
    const result = await fetchJson<DailyTargetEntry | null>("/api/daily-target", {
      method: "POST", body: JSON.stringify({ action: "remove", date, problemSlug }),
    });
    if (result) set(s => ({ data: { ...s.data, [date]: result } }));
  },
}));
