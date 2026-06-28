"use client";
// Backwards-compatible shim — components that already use useUserData() 
// continue to work. New components should import stores directly.
import { useAuth } from "@clerk/nextjs";
import { useProgressStore, ProblemStatus } from "@/lib/stores/progress-store";
import { useBookmarkStore } from "@/lib/stores/bookmark-store";
import { useNotesStore } from "@/lib/stores/notes-store";
import { useDailyTargetStore, DailyTargetEntry, DailyTargetProblem } from "@/lib/stores/daily-target-store";
import { useStreakStore } from "@/lib/stores/streak-store";

export type { ProblemStatus, DailyTargetEntry, DailyTargetProblem };
export { ApiError } from "@/lib/fetch-client";

export function useUserData() {
  const { isSignedIn, isLoaded } = useAuth();
  const progress   = useProgressStore();
  const bookmarks  = useBookmarkStore();
  const notes      = useNotesStore();
  const targets    = useDailyTargetStore();
  const streak     = useStreakStore();

  return {
    isSignedIn: !!isSignedIn,
    isLoaded,
    progress: progress.data,
    bookmarks: bookmarks.data,
    notes: notes.data,
    streak: streak.data,
    dailyTargets: targets.data,
    dailyTargetsLoaded: targets.loaded,

    getStatus:          progress.getStatus,
    cycleStatus:        progress.cycleStatus,
    isBookmarked:       bookmarks.isBookmarked,
    toggleBookmark:     bookmarks.toggleBookmark,
    getNote:            notes.getNote,
    saveNote:           notes.saveNote,
    refresh:            async () => {
      await Promise.all([progress.load(), bookmarks.load(), notes.load()]);
    },
    refreshDailyTargets: targets.load,
    setDayTarget:        targets.setDayTarget,
    addProblemToDay:     targets.addProblemToDay,
    removeProblemFromDay: targets.removeProblemFromDay,
    getTodayTarget:      targets.getTodayTarget,
  };
}

// Keep UserDataProvider as a no-op wrapper for backwards compat
export function UserDataProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
