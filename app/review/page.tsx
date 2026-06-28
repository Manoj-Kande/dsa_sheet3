"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shared/app-shell";
import { useProblemModal } from "@/components/shared/problem-modal-provider";
import { DifficultyBadge } from "@/components/ui/badge";
import { useAuth } from "@clerk/nextjs";
import { Brain, Clock, CheckCircle2, Calendar } from "lucide-react";

interface ReviewItem { slug: string; title: string; difficulty: string; topic: string; reviewDate: string; overdueDays?: number; daysUntil?: number; reviewCount: number; }
interface SRData { due: ReviewItem[]; upcoming: ReviewItem[]; totalTracked: number; }

export default function ReviewPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openProblem } = useProblemModal();
  const [data, setData] = useState<SRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [marked, setMarked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    fetch("/api/spaced-repetition").then(r => r.json()).then(j => setData(j.data)).finally(() => setLoading(false));
  }, [isSignedIn]);

  async function markReviewed(slug: string) {
    setMarked(prev => new Set([...prev, slug]));
    await fetch("/api/spaced-repetition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problemSlug: slug }) });
  }

  if (!isLoaded || loading) return <AppShell><div className="max-w-[1400px] mx-auto px-6 py-10 space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-2xl"/>)}</div></AppShell>;
  if (!isSignedIn) return <AppShell><div className="max-w-[1400px] mx-auto px-6 py-10 text-center text-text-secondary">Sign in to use spaced repetition.</div></AppShell>;

  const dueItems = data?.due.filter(d => !marked.has(d.slug)) ?? [];
  const upcomingItems = data?.upcoming ?? [];

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-3">
            <Brain className="h-3.5 w-3.5"/> Spaced Repetition
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Review Queue</h1>
          <p className="mt-1 text-text-secondary">Problems scheduled for review based on your solve history.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Clock, label: "Due Today", value: dueItems.length, color: "text-red-400" },
            { icon: Calendar, label: "Due This Week", value: upcomingItems.length, color: "text-amber-400" },
            { icon: Brain, label: "Total Tracked", value: data?.totalTracked ?? 0, color: "text-accent" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-border-default bg-bg-surface p-4 card-hover">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`}/>
              <div className="text-2xl font-bold text-text-primary">{s.value}</div>
              <div className="text-xs text-text-tertiary">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Due now */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-red-400"/>
            <span className="text-sm font-semibold text-text-primary">Due for Review</span>
            {dueItems.length > 0 && <span className="ml-auto text-xs bg-red-400/15 text-red-400 px-2 py-0.5 rounded-full font-semibold">{dueItems.length}</span>}
          </div>
          {dueItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2"/>
              <p className="text-text-secondary text-sm">You're all caught up! No reviews due.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dueItems.map(item => (
                <div key={item.slug} className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-base p-3 hover:border-border-focus transition-all group">
                  <div className="flex-1 min-w-0">
                    <button onClick={() => openProblem(item.slug)} className="text-sm font-semibold text-text-primary hover:text-accent transition-colors text-left truncate block">{item.title}</button>
                    <div className="flex items-center gap-2 mt-1">
                      <DifficultyBadge difficulty={item.difficulty as "Easy" | "Medium" | "Hard"} variant="outline"/>
                      <span className="text-xs text-text-tertiary">{item.topic}</span>
                      <span className="text-xs text-red-400">{item.overdueDays === 0 ? "Due today" : `${item.overdueDays}d overdue`}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-text-tertiary">Review #{(item.reviewCount ?? 0) + 1}</span>
                    <button onClick={() => markReviewed(item.slug)}
                      className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                      Done ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        {upcomingItems.length > 0 && (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-amber-400"/>
              <span className="text-sm font-semibold text-text-primary">Coming Up This Week</span>
            </div>
            <div className="space-y-2">
              {upcomingItems.map(item => (
                <div key={item.slug} className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-base p-3">
                  <div className="flex-1 min-w-0">
                    <button onClick={() => openProblem(item.slug)} className="text-sm font-semibold text-text-primary hover:text-accent transition-colors text-left truncate block">{item.title}</button>
                    <div className="flex items-center gap-2 mt-1">
                      <DifficultyBadge difficulty={item.difficulty as "Easy" | "Medium" | "Hard"} variant="outline"/>
                      <span className="text-xs text-text-tertiary">{item.topic}</span>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 shrink-0">in {item.daysUntil}d</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
