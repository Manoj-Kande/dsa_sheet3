import { create } from "zustand";
import { fetchJson } from "@/lib/fetch-client";

interface NotesStore {
  data: Record<string, string>;
  loaded: boolean;
  load: () => Promise<void>;
  getNote: (slug: string) => string;
  saveNote: (slug: string, content: string) => Promise<void>;
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  data: {},
  loaded: false,

  load: async () => {
    const data = await fetchJson<Record<string, string>>("/api/notes");
    set({ data, loaded: true });
  },

  getNote: (slug) => get().data[slug] ?? "",

  saveNote: async (slug, content) => {
    set(s => ({ data: { ...s.data, [slug]: content } }));
    await fetchJson("/api/notes", { method: "POST", body: JSON.stringify({ problemSlug: slug, content }) });
  },
}));
