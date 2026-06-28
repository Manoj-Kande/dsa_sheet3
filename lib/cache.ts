import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

const TTL = { progress: 30, bookmarks: 60, notes: 120 };
const tag = (userId: string, key: string) => `${key}:${userId}`;

export async function getCachedProgress(userId: string) {
  return unstable_cache(
    async () => {
      const rows = await prisma.userProgress.findMany({ where: { userId }, select: { problemSlug: true, status: true } });
      return Object.fromEntries(rows.map((r: { problemSlug: string; status: string }) => [r.problemSlug, r.status]));
    },
    [tag(userId, "progress")],
    { tags: [tag(userId, "progress")], revalidate: TTL.progress }
  )();
}

export async function getCachedBookmarks(userId: string) {
  return unstable_cache(
    async () => {
      const rows = await prisma.bookmark.findMany({ where: { userId }, select: { problemSlug: true } });
      return rows.map((r: { problemSlug: string }) => r.problemSlug);
    },
    [tag(userId, "bookmarks")],
    { tags: [tag(userId, "bookmarks")], revalidate: TTL.bookmarks }
  )();
}

export async function getCachedNotes(userId: string) {
  return unstable_cache(
    async () => {
      const rows = await prisma.note.findMany({ where: { userId }, select: { problemSlug: true, content: true } });
      return Object.fromEntries(rows.map((r: { problemSlug: string; content: string }) => [r.problemSlug, r.content]));
    },
    [tag(userId, "notes")],
    { tags: [tag(userId, "notes")], revalidate: TTL.notes }
  )();
}

export function invalidateProgress(userId: string)  { revalidateTag(tag(userId, "progress"), "cache"); }
export function invalidateBookmarks(userId: string) { revalidateTag(tag(userId, "bookmarks"), "cache"); }
export function invalidateNotes(userId: string)     { revalidateTag(tag(userId, "notes"), "cache"); }
export function invalidateAnalytics(userId: string) { revalidateTag(tag(userId, "analytics"), "cache"); }
