"use client";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { useAuth } from "@clerk/nextjs";

export type ProblemStatus = "ATTEMPTED" | "SOLVED" | "REVISIT";

export interface DailyTargetProblem {
  id: string;
  problemSlug: string;
  note: string | null;
  order: number;
}

export interface DailyTargetEntry {
  id: string;
  date: string;
  note: string | null;
  problems: DailyTargetProblem[];
}

interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalSolved: number;
}

interface UserDataState {
  isSignedIn: boolean;
  isLoaded: boolean;
  progress: Record<string, ProblemStatus>;
  bookmarks: Set<string>;
  notes: Record<string, string>;
  streak: Streak;
  dailyTargets: Record<string, DailyTargetEntry>;
  dailyTargetsLoaded: boolean;
  getStatus: (slug: string) => ProblemStatus | null;
  cycleStatus: (slug: string) => Promise<void>;
  isBookmarked: (slug: string) => boolean;
  toggleBookmark: (slug: string) => Promise<void>;
  getNote: (slug: string) => string;
  saveNote: (slug: string, content: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshDailyTargets: (weekStart?: string) => Promise<void>;
  setDayTarget: (date: string, problems: { problemSlug: string; note?: string }[], note?: string) => Promise<void>;
  addProblemToDay: (date: string, problemSlug: string, note?: string) => Promise<void>;
  removeProblemFromDay: (date: string, problemSlug: string) => Promise<void>;
  getTodayTarget: () => DailyTargetEntry | null;
}

const UserDataContext = createContext<UserDataState | null>(null);
const STATUS_CYCLE: (ProblemStatus | null)[] = [null, "SOLVED", "ATTEMPTED", "REVISIT"];

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Request failed");
  return json.data as T;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [progress, setProgress] = useState<Record<string, ProblemStatus>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState<Streak>({ currentStreak: 0, longestStreak: 0, lastActiveDate: null, totalSolved: 0 });
  const [dailyTargets, setDailyTargets] = useState<Record<string, DailyTargetEntry>>({});
  const [dailyTargetsLoaded, setDailyTargetsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const [progressData, bookmarksData, notesData] = await Promise.all([
        fetchJson<Record<string, ProblemStatus>>("/api/progress"),
        fetchJson<string[]>("/api/bookmarks"),
        fetchJson<Record<string, string>>("/api/notes"),
      ]);
      setProgress(progressData);
      setBookmarks(new Set(bookmarksData));
      setNotes(notesData);
    } catch (err) { console.error("Failed to load user data", err); }
  }, [isSignedIn]);

  const refreshDailyTargets = useCallback(async (weekStart?: string) => {
    if (!isSignedIn) return;
    try {
      const url = weekStart ? `/api/daily-target?weekStart=${weekStart}` : "/api/daily-target";
      const targets = await fetchJson<DailyTargetEntry[]>(url);
      setDailyTargets((prev) => {
        const next = { ...prev };
        targets.forEach((t) => { next[t.date] = t; });
        return next;
      });
      setDailyTargetsLoaded(true);
    } catch (err) {
      console.error("Failed to load daily targets", err);
      setDailyTargetsLoaded(true);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn) { refresh(); refreshDailyTargets(); }
  }, [isLoaded, isSignedIn, refresh, refreshDailyTargets]);

  const getStatus = useCallback((slug: string) => progress[slug] ?? null, [progress]);

  const cycleStatus = useCallback(async (slug: string) => {
    if (!isSignedIn) return;
    const current = progress[slug] ?? null;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    setProgress((prev) => { const c = { ...prev }; if (next === null) delete c[slug]; else c[slug] = next; return c; });
    try {
      await fetchJson("/api/progress", { method: "POST", body: JSON.stringify({ problemSlug: slug, status: next }) });
      if (next === "SOLVED") setStreak((s) => ({ ...s, totalSolved: s.totalSolved + 1 }));
    } catch (err) {
      console.error("Failed to update status", err);
      setProgress((prev) => { const c = { ...prev }; if (current === null) delete c[slug]; else c[slug] = current; return c; });
    }
  }, [isSignedIn, progress]);

  const isBookmarked = useCallback((slug: string) => bookmarks.has(slug), [bookmarks]);

  const toggleBookmark = useCallback(async (slug: string) => {
    if (!isSignedIn) return;
    const was = bookmarks.has(slug);
    setBookmarks((prev) => { const c = new Set(prev); was ? c.delete(slug) : c.add(slug); return c; });
    try {
      await fetchJson("/api/bookmarks", { method: "POST", body: JSON.stringify({ problemSlug: slug }) });
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
      setBookmarks((prev) => { const c = new Set(prev); was ? c.add(slug) : c.delete(slug); return c; });
    }
  }, [isSignedIn, bookmarks]);

  const getNote = useCallback((slug: string) => notes[slug] ?? "", [notes]);

  const saveNote = useCallback(async (slug: string, content: string) => {
    if (!isSignedIn) return;
    setNotes((prev) => ({ ...prev, [slug]: content }));
    try { await fetchJson("/api/notes", { method: "POST", body: JSON.stringify({ problemSlug: slug, content }) }); }
    catch (err) { console.error("Failed to save note", err); }
  }, [isSignedIn]);

  const setDayTarget = useCallback(async (date: string, problems: { problemSlug: string; note?: string }[], note?: string) => {
    if (!isSignedIn) return;
    try {
      const result = await fetchJson<DailyTargetEntry>("/api/daily-target", { method: "POST", body: JSON.stringify({ action: "set", date, problems, note }) });
      setDailyTargets((prev) => ({ ...prev, [date]: result }));
    } catch (err) { console.error("Failed to set day target", err); }
  }, [isSignedIn]);

  const addProblemToDay = useCallback(async (date: string, problemSlug: string, note?: string) => {
    if (!isSignedIn) return;
    try {
      const result = await fetchJson<DailyTargetEntry>("/api/daily-target", { method: "POST", body: JSON.stringify({ action: "add", date, problemSlug, note }) });
      setDailyTargets((prev) => ({ ...prev, [date]: result }));
    } catch (err) { console.error("Failed to add problem to day", err); }
  }, [isSignedIn]);

  const removeProblemFromDay = useCallback(async (date: string, problemSlug: string) => {
    if (!isSignedIn) return;
    try {
      const result = await fetchJson<DailyTargetEntry | null>("/api/daily-target", { method: "POST", body: JSON.stringify({ action: "remove", date, problemSlug }) });
      if (result) setDailyTargets((prev) => ({ ...prev, [date]: result }));
    } catch (err) { console.error("Failed to remove problem from day", err); }
  }, [isSignedIn]);

  const getTodayTarget = useCallback(() => dailyTargets[todayIso()] ?? null, [dailyTargets]);

  const value = useMemo<UserDataState>(() => ({
    isSignedIn: !!isSignedIn, isLoaded, progress, bookmarks, notes, streak,
    dailyTargets, dailyTargetsLoaded,
    getStatus, cycleStatus, isBookmarked, toggleBookmark, getNote, saveNote, refresh,
    refreshDailyTargets, setDayTarget, addProblemToDay, removeProblemFromDay, getTodayTarget,
  }), [isSignedIn, isLoaded, progress, bookmarks, notes, streak, dailyTargets, dailyTargetsLoaded,
    getStatus, cycleStatus, isBookmarked, toggleBookmark, getNote, saveNote, refresh,
    refreshDailyTargets, setDayTarget, addProblemToDay, removeProblemFromDay, getTodayTarget]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used within a UserDataProvider");
  return ctx;
}
