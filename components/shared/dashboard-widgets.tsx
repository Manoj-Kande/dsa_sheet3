"use client";
import Link from "next/link";
import { useUserData } from "@/lib/hooks/use-user-data";
import { useDailyTargetStore } from "@/lib/stores/daily-target-store";
import { getProblemBySlug } from "@/lib/data/dataset";
import { Target, Brain, Flame, CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";

// Today's target widget
export function TodayTargetWidget() {
  const { isSignedIn, getStatus } = useUserData();
  const getTodayTarget = useDailyTargetStore(s => s.getTodayTarget);
  const today = getTodayTarget();

  if (!isSignedIn) return null;

  if (!today || today.problems.length === 0) {
    return (
      <Link href="/daily-target" className="flex items-center gap-3 rounded-xl border border-dashed border-border-default bg-bg-surface p-4 hover:border-accent/40 hover:bg-bg-elevated transition-all group">
        <div className="w-8 h-8 rounded-lg bg-accent/10 grid place-items-center shrink-0">
          <Target className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">No target set for today</p>
          <p className="text-xs text-text-tertiary">Tap to plan your practice session</p>
        </div>
        <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-accent transition-colors shrink-0" />
      </Link>
    );
  }

  const problems = today.problems.map(p => ({ ...p, prob: getProblemBySlug(p.problemSlug) })).filter(p => p.prob);
  const solved = problems.filter(p => getStatus(p.problemSlug) === "SOLVED").length;
  const pct = problems.length ? Math.round((solved / problems.length) * 100) : 0;

  return (
    <Link href="/daily-target" className="rounded-xl border border-border-default bg-bg-surface p-4 hover:border-border-strong hover:bg-bg-elevated transition-all block">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary">Today's Target</span>
        </div>
        <span className="text-xs font-semibold text-accent">{solved}/{problems.length} done</span>
      </div>
      <div className="space-y-1.5 mb-3">
        {problems.slice(0, 3).map(p => {
          const status = getStatus(p.problemSlug);
          return (
            <div key={p.problemSlug} className="flex items-center gap-2">
              {status === "SOLVED" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> :
               status === "ATTEMPTED" ? <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" /> :
               <Circle className="h-3.5 w-3.5 text-text-tertiary opacity-40 shrink-0" />}
              <span className={`text-xs truncate ${status === "SOLVED" ? "line-through text-text-tertiary" : "text-text-secondary"}`}>
                {p.prob!.title}
              </span>
            </div>
          );
        })}
        {problems.length > 3 && <p className="text-xs text-text-tertiary pl-5">+{problems.length - 3} more</p>}
      </div>
      <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

// Review queue widget
export function ReviewWidget() {
  const { isSignedIn } = useUserData();
  if (!isSignedIn) return null;

  return (
    <Link href="/review" className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-4 hover:border-border-strong hover:bg-bg-elevated transition-all group">
      <div className="w-8 h-8 rounded-lg bg-violet-500/10 grid place-items-center shrink-0">
        <Brain className="h-4 w-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">Review Queue</p>
        <p className="text-xs text-text-tertiary">Check problems due for spaced repetition</p>
      </div>
      <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-violet-400 transition-colors shrink-0" />
    </Link>
  );
}

// Streak widget
export function StreakWidget() {
  const { isSignedIn, streak } = useUserData();
  if (!isSignedIn || streak.currentStreak === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 grid place-items-center shrink-0">
        <Flame className="h-4 w-4 text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">{streak.currentStreak} day streak 🔥</p>
        <p className="text-xs text-text-tertiary">Longest: {streak.longestStreak} days</p>
      </div>
    </div>
  );
}
