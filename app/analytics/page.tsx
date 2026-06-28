"use client";
import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/shared/app-shell";
import { TrendingUp, Flame, Target, CheckCircle2, Clock, RotateCcw, BarChart2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { getProblemBySlug } from "@/lib/data/dataset";
import { useProblemModal } from "@/components/shared/problem-modal-provider";

interface Badge { id: string; title: string; description: string; icon: string; color: string; earned: boolean; }
interface AnalyticsData {
  totalSolved: number; totalAttempted: number; totalRevisit: number;
  currentStreak: number; longestStreak: number;
  heatmap: Record<string, number>;
  byTopic: Record<string, { solved: number; attempted: number; total: number }>;
  byDifficulty: { Easy: { solved: number; total: number }; Medium: { solved: number; total: number }; Hard: { solved: number; total: number } };
  recentSolved: { slug: string; solvedAt: string }[];
  weekly: Record<string, number>;
  badges: Badge[];
}

function Heatmap({ data }: { data: Record<string, number> }) {
  const cells = useMemo(() => {
    const today = new Date(); const days = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: data[key] ?? 0 });
    } return days;
  }, [data]);
  const max = Math.max(...cells.map(c => c.count), 1);
  const getColor = (n: number) => !n ? "bg-bg-elevated" : n/max < 0.25 ? "bg-accent/20" : n/max < 0.5 ? "bg-accent/40" : n/max < 0.75 ? "bg-accent/70" : "bg-accent";
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4 text-accent"/><span className="text-sm font-semibold text-text-primary">Activity — Last 365 Days</span></div>
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map(day => <div key={day.date} title={`${day.date}: ${day.count}`} className={`w-3 h-3 rounded-sm ${getColor(day.count)}`} />)}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
          <span>Less</span>
          <div className="flex gap-1">{["bg-bg-elevated","bg-accent/20","bg-accent/40","bg-accent/70","bg-accent"].map(c=><div key={c} className={`w-3 h-3 rounded-sm ${c}`}/>)}</div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: Record<string, number> }) {
  const weeks = useMemo(() => {
    const today = new Date(); const result = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today); d.setUTCDate(d.getUTCDate() - i * 7);
      const dow = d.getUTCDay(); d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
      const key = d.toISOString().slice(0, 10);
      result.push({ label: `${d.getUTCMonth()+1}/${d.getUTCDate()}`, count: data[key] ?? 0 });
    } return result;
  }, [data]);
  const max = Math.max(...weeks.map(w => w.count), 1);
  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-4"><BarChart2 className="h-4 w-4 text-accent"/><span className="text-sm font-semibold text-text-primary">Weekly Solves</span></div>
      <div className="flex items-end gap-2 h-32">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-text-tertiary">{w.count||""}</span>
            <div className="w-full rounded-t-md bg-bg-elevated relative overflow-hidden" style={{height:"80px"}}>
              <div className="absolute bottom-0 w-full rounded-t-md bg-accent transition-all duration-500" style={{height:`${(w.count/max)*100}%`}}/>
            </div>
            <span className="text-[10px] text-text-tertiary">{w.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicBreakdown({ data }: { data: Record<string, { solved: number; attempted: number; total: number }> }) {
  const topics = useMemo(() =>
    Object.entries(data).map(([topic, d]) => ({ topic, ...d, pct: d.total ? Math.round((d.solved/d.total)*100) : 0 }))
      .sort((a, b) => b.pct - a.pct), [data]);
  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-4"><Target className="h-4 w-4 text-accent"/><span className="text-sm font-semibold text-text-primary">Progress by Topic</span></div>
      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
        {topics.map(t => (
          <div key={t.topic}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-text-primary truncate">{t.topic}</span>
              <span className="text-xs text-text-tertiary ml-2">{t.solved}/{t.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-500" style={{width:`${t.pct}%`}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DifficultyCard({ label, solved, total, color }: { label: string; solved: number; total: number; color: string }) {
  const pct = total ? Math.round((solved/total)*100) : 0;
  const r = 28; const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border-default bg-bg-surface p-4">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-bg-elevated)" strokeWidth="6"/>
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ}
          strokeLinecap="round" transform="rotate(-90 36 36)" className="transition-all duration-700"/>
        <text x="36" y="40" textAnchor="middle" fill="var(--color-text-primary)" fontSize="13" fontWeight="700">{pct}%</text>
      </svg>
      <span className="text-xs font-semibold" style={{color}}>{label}</span>
      <span className="text-xs text-text-tertiary">{solved}/{total}</span>
    </div>
  );
}

function BadgesGrid({ badges }: { badges: Badge[] }) {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🏆</span>
        <span className="text-sm font-semibold text-text-primary">Badges</span>
        <span className="ml-auto text-xs text-text-tertiary">{badges.filter(b=>b.earned).length}/{badges.length} earned</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {badges.map(b => (
          <div key={b.id} className={`rounded-xl border p-3 text-center transition-all duration-200
            ${b.earned ? "border-border-strong bg-bg-elevated" : "border-border-default bg-bg-base opacity-40 grayscale"}`}>
            <div className="text-2xl mb-1">{b.icon}</div>
            <div className={`text-xs font-semibold ${b.earned ? b.color : "text-text-tertiary"}`}>{b.title}</div>
            <div className="text-[10px] text-text-tertiary mt-0.5">{b.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openProblem } = useProblemModal();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    fetch("/api/analytics").then(r => r.json()).then(j => setData(j.data)).finally(() => setLoading(false));
  }, [isSignedIn]);

  if (!isLoaded || loading) return <AppShell><div className="max-w-[1400px] mx-auto px-6 py-10 space-y-4">{[1,2,3,4].map(i=><div key={i} className="skeleton h-40 rounded-2xl"/>)}</div></AppShell>;
  if (!isSignedIn) return <AppShell><div className="max-w-[1400px] mx-auto px-6 py-10 text-center text-text-secondary">Sign in to view your analytics.</div></AppShell>;
  if (!data) return null;

  const stats = [
    { icon: CheckCircle2, label: "Solved", value: data.totalSolved, color: "text-emerald-400" },
    { icon: Clock, label: "Attempted", value: data.totalAttempted, color: "text-amber-400" },
    { icon: RotateCcw, label: "Revisit", value: data.totalRevisit, color: "text-violet-400" },
    { icon: Flame, label: "Current Streak", value: `${data.currentStreak}d`, color: "text-orange-400" },
    { icon: TrendingUp, label: "Longest Streak", value: `${data.longestStreak}d`, color: "text-accent" },
  ];

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-3">
            <BarChart2 className="h-3.5 w-3.5"/> Analytics
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Your Progress</h1>
          <p className="mt-1 text-text-secondary">A complete picture of your DSA journey.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl border border-border-default bg-bg-surface p-4 card-hover">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`}/>
              <div className="text-2xl font-bold text-text-primary">{s.value}</div>
              <div className="text-xs text-text-tertiary mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <Heatmap data={data.heatmap}/>
        <div className="grid lg:grid-cols-[1fr_auto] gap-4">
          <WeeklyChart data={data.weekly}/>
          <div className="grid grid-cols-3 gap-3 content-start">
            <DifficultyCard label="Easy" solved={data.byDifficulty.Easy.solved} total={data.byDifficulty.Easy.total} color="#4ade80"/>
            <DifficultyCard label="Medium" solved={data.byDifficulty.Medium.solved} total={data.byDifficulty.Medium.total} color="#fbbf24"/>
            <DifficultyCard label="Hard" solved={data.byDifficulty.Hard.solved} total={data.byDifficulty.Hard.total} color="#f87171"/>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <TopicBreakdown data={data.byTopic}/>
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
            <div className="flex items-center gap-2 mb-4"><CheckCircle2 className="h-4 w-4 text-emerald-400"/><span className="text-sm font-semibold text-text-primary">Recently Solved</span></div>
            <div className="space-y-1">
              {data.recentSolved.length === 0 ? <p className="text-sm text-text-tertiary">No problems solved yet.</p>
                : data.recentSolved.map((r, i) => {
                  const prob = getProblemBySlug(r.slug); if (!prob) return null;
                  return (
                    <button key={i} onClick={() => openProblem(prob.id)}
                      className="w-full flex items-center justify-between gap-3 rounded-xl p-3 hover:bg-bg-elevated transition-colors text-left group">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0"/>
                        <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">{prob.title}</span>
                      </div>
                      <span className="text-xs text-text-tertiary shrink-0">{new Date(r.solvedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
        <BadgesGrid badges={data.badges}/>
      </div>
    </AppShell>
  );
}
