import { create } from "zustand";
import { fetchJson } from "@/lib/fetch-client";

interface BookmarkStore {
  data: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  isBookmarked: (slug: string) => boolean;
  toggleBookmark: (slug: string) => Promise<void>;
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  data: new Set(),
  loaded: false,

  load: async () => {
    const slugs = await fetchJson<string[]>("/api/bookmarks");
    set({ data: new Set(slugs), loaded: true });
  },

  isBookmarked: (slug) => get().data.has(slug),

  toggleBookmark: async (slug) => {
    const was = get().data.has(slug);
    set(s => { const c = new Set(s.data); was ? c.delete(slug) : c.add(slug); return { data: c }; });
    try {
      await fetchJson("/api/bookmarks", { method: "POST", body: JSON.stringify({ problemSlug: slug }) });
    } catch (err) {
      set(s => { const c = new Set(s.data); was ? c.add(slug) : c.delete(slug); return { data: c }; });
      throw err;
    }
  },
}));
