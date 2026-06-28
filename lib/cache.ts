import { unstable_cache, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/services/current-user";
import { prisma } from "@/lib/prisma";

// Cache TTLs
const TTL = {
  progress:   30,   // 30s — changes frequently
  bookmarks:  60,   // 1min
  notes:      120,  // 2min
  analytics:  300,  // 5min — expensive aggregation
  srQueue:    3600, // 1hr
};

function userTag(userId: string, key: string) { return `${key}:${userId}`; }

// ── Cached getters ──────────────────────────────────────────────────────────

export async function getCachedProgress(userId: string) {
  return unstable_cache(
    async () => {
      const rows = await prisma.userProgress.findMany({ where: { userId }, select: { problemSlug: true, status: true } });
      return Object.fromEntries(rows.map(r => [r.problemSlug, r.status]));
    },
    [userTag(userId, "progress")],
    { tags: [userTag(userId, "progress")], revalidate: TTL.progress }
  )();
}

export async function getCachedBookmarks(userId: string) {
  return unstable_cache(
    async () => {
      const rows = await prisma.bookmark.findMany({ where: { userId }, select: { problemSlug: true } });
      return rows.map(r => r.problemSlug);
    },
    [userTag(userId, "bookmarks")],
    { tags: [userTag(userId, "bookmarks")], revalidate: TTL.bookmarks }
  )();
}

export async function getCachedNotes(userId: string) {
  return unstable_cache(
    async () => {
      const rows = await prisma.note.findMany({ where: { userId }, select: { problemSlug: true, content: true } });
      return Object.fromEntries(rows.map(r => [r.problemSlug, r.content]));
    },
    [userTag(userId, "notes")],
    { tags: [userTag(userId, "notes")], revalidate: TTL.notes }
  )();
}

// ── Cache invalidators ──────────────────────────────────────────────────────

export function invalidateProgress(userId: string)  { revalidateTag(userTag(userId, "progress")); }
export function invalidateBookmarks(userId: string) { revalidateTag(userTag(userId, "bookmarks")); }
export function invalidateNotes(userId: string)     { revalidateTag(userTag(userId, "notes")); }
export function invalidateAnalytics(userId: string) { revalidateTag(userTag(userId, "analytics")); }
