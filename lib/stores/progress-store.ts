import { create } from "zustand";
import { fetchJson } from "@/lib/fetch-client";

export type ProblemStatus = "ATTEMPTED" | "SOLVED" | "REVISIT";
const STATUS_CYCLE: (ProblemStatus | null)[] = [null, "SOLVED", "ATTEMPTED", "REVISIT"];

interface ProgressStore {
  data: Record<string, ProblemStatus>;
  loaded: boolean;
  load: () => Promise<void>;
  getStatus: (slug: string) => ProblemStatus | null;
  cycleStatus: (slug: string) => Promise<void>;
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  data: {},
  loaded: false,

  load: async () => {
    const data = await fetchJson<Record<string, ProblemStatus>>("/api/progress");
    set({ data, loaded: true });
  },

  getStatus: (slug) => get().data[slug] ?? null,

  cycleStatus: async (slug) => {
    const current = get().data[slug] ?? null;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    // Optimistic update
    set(s => {
      const copy = { ...s.data };
      if (next === null) delete copy[slug]; else copy[slug] = next;
      return { data: copy };
    });
    try {
      await fetchJson("/api/progress", { method: "POST", body: JSON.stringify({ problemSlug: slug, status: next }) });
    } catch (err) {
      // Rollback
      set(s => {
        const copy = { ...s.data };
        if (current === null) delete copy[slug]; else copy[slug] = current;
        return { data: copy };
      });
      throw err;
    }
  },
}));
