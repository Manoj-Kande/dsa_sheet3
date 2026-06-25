"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, X, Upload, Calendar, Target, CheckCircle2,
  Circle, Clock, BookmarkIcon, Search, ChevronLeft, ChevronRight, Sparkles
} from "lucide-react";
import { useProblemModal } from "./problem-modal-provider";
import { getProblemBySlug, getProblemById, DATASET, Problem } from "@/lib/data/dataset";
import { DifficultyBadge, NeutralBadge, TagChip } from "@/components/ui/badge";
import { QuickLinks } from "@/components/ui/quick-links";
import { useUserData, DailyTargetEntry } from "@/lib/hooks/use-user-data";
import { useAuth } from "@clerk/nextjs";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

function getMondayOfWeek(d: Date): Date {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = utc.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc;
}

function resolveProblem(slug: string) {
  return getProblemBySlug(slug) ?? getProblemById(slug) ?? null;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(d: Date) {
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusDot({ slug }: { slug: string }) {
  const { getStatus, isBookmarked } = useUserData();
  const status = getStatus(slug);
  const bookmarked = isBookmarked(slug);

  return (
    <span className="flex items-center gap-1">
      {status === "SOLVED" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
      {status === "ATTEMPTED" && <Circle className="h-3.5 w-3.5 text-amber-400" />}
      {status === "REVISIT" && <Clock className="h-3.5 w-3.5 text-violet-400" />}
      {!status && <Circle className="h-3.5 w-3.5 text-text-tertiary opacity-40" />}
      {bookmarked && <BookmarkIcon className="h-3 w-3 text-accent fill-accent" />}
    </span>
  );
}

function ProblemCard({
  problem, onRemove, onOpen,
}: {
  problem: Problem;
  onRemove?: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="group relative flex items-start gap-3 rounded-xl border border-border-default bg-bg-base p-3 transition-all duration-200 hover:border-border-focus hover:bg-bg-elevated hover:-translate-y-px">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <StatusDot slug={problem.slug} />
          <button onClick={onOpen} className="truncate text-sm font-semibold text-text-primary hover:text-accent transition-colors text-left">
            {problem.title}
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <DifficultyBadge difficulty={problem.difficulty} variant="outline" />
          <NeutralBadge>{problem.estimated_time_minutes ?? "—"}m</NeutralBadge>
          <span className="text-xs text-text-tertiary">{problem.topic}</span>
        </div>
        <div className="mt-2">
          <QuickLinks problem={problem} />
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="mt-0.5 rounded-lg p-1 text-text-tertiary opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function ProblemPickerRow({
  problem, onAdd, selected,
}: {
  problem: Problem;
  onAdd: () => void;
  selected: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-150 cursor-pointer hover:border-border-focus hover:-translate-y-px ${selected ? "border-accent/50 bg-accent/5" : "border-border-default bg-bg-base hover:bg-bg-elevated"}`}
      onClick={onAdd}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium text-text-primary">{problem.title}</div>
        <div className="flex items-center gap-2 mt-1">
          <DifficultyBadge difficulty={problem.difficulty} variant="outline" />
          <span className="text-xs text-text-tertiary">{problem.topic}</span>
        </div>
      </div>
      <div className={`rounded-full p-1 transition-colors ${selected ? "text-accent" : "text-text-tertiary hover:text-accent"}`}>
        {selected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </div>
    </div>
  );
}

// ─── Weekly Calendar ─────────────────────────────────────────────────────────

function WeeklyCalendar({
  weekStart, targets, selectedDate, onSelectDate, onNavigate,
}: {
  weekStart: Date;
  targets: Record<string, DailyTargetEntry>;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  onNavigate: (dir: -1 | 1) => void;
}) {
  const today = isoDate(new Date());
  const days = getWeekDays(weekStart);

  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary">
            {formatDate(days[0])} – {formatDate(days[6])}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onNavigate(-1)} className="rounded-lg p-1.5 text-text-tertiary hover:bg-bg-elevated hover:text-text-primary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => onNavigate(1)} className="rounded-lg p-1.5 text-text-tertiary hover:bg-bg-elevated hover:text-text-primary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const key = isoDate(day);
          const entry = targets[key];
          const count = entry?.problems.length ?? 0;
          const isToday = key === today;
          const isSelected = key === selectedDate;
          const solvedCount = entry?.problems.filter(p => {
            const prob = resolveProblem(p.problemSlug);
            return prob;
          }).length ?? 0;

          return (
            <button
              key={key}
              onClick={() => onSelectDate(key)}
              className={`relative flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-all duration-150
                ${isSelected ? "bg-accent text-white shadow-lg shadow-accent/20" :
                  isToday ? "bg-accent/10 text-accent border border-accent/30" :
                  "hover:bg-bg-elevated text-text-secondary hover:text-text-primary"}`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{DAY_LABELS[i]}</span>
              <span className={`text-sm font-bold ${isSelected ? "text-white" : ""}`}>{day.getUTCDate()}</span>
              {count > 0 ? (
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5
                  ${isSelected ? "bg-white/20 text-white" : "bg-accent/15 text-accent"}`}>
                  {count}
                </span>
              ) : (
                <span className="h-4" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Problem Picker Panel ────────────────────────────────────────────────────

function ProblemPicker({
  selectedSlugs, onAdd, onRemove,
}: {
  selectedSlugs: Set<string>;
  onAdd: (slug: string) => void;
  onRemove: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DATASET.problems.slice(0, 30);
    return DATASET.problems
      .filter(p => [p.title, p.slug, p.topic, p.subtopic, ...p.tags, ...p.companies]
        .join(" ").toLowerCase().includes(q))
      .slice(0, 30);
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search problems..."
          className="w-full rounded-xl border border-border-default bg-bg-base pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-focus transition-colors"
        />
      </div>
      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
        {filtered.map(p => (
          <ProblemPickerRow
            key={p.slug}
            problem={p}
            selected={selectedSlugs.has(p.slug)}
            onAdd={() => selectedSlugs.has(p.slug) ? onRemove(p.slug) : onAdd(p.slug)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── JSON Import ─────────────────────────────────────────────────────────────

function JsonImporter({ onImport }: { onImport: (slugs: string[]) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function parse(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      const items: string[] = [];
      const arr = Array.isArray(parsed) ? parsed :
        (parsed.problems ?? parsed.targets ?? parsed.items ?? [parsed]);
      for (const item of arr) {
        const slug = typeof item === "string" ? item : (item.slug ?? item.problemSlug ?? item.id ?? "");
        if (slug) items.push(slug.trim());
      }
      if (!items.length) { setError("No valid slugs found."); return; }
      setError(null);
      onImport(items);
    } catch {
      setError("Invalid JSON.");
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setText(text);
    parse(text);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-text-tertiary font-medium">Paste or upload JSON</span>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-base px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors">
          <Upload className="h-3.5 w-3.5" /> Upload
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
          onChange={e => { void handleFile(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder={`["two-sum", "binary-search"]\n// or\n{"problems": [{"slug": "two-sum", "note": "warmup"}]}`}
        className="w-full min-h-32 rounded-xl border border-border-default bg-bg-base px-4 py-3 font-mono text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-focus transition-colors resize-none" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={() => setText("")}
          className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
          Clear
        </button>
        <button onClick={() => parse(text)}
          className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors">
          Import
        </button>
      </div>
    </div>
  );
}

// ─── Day Panel ───────────────────────────────────────────────────────────────

function DayPanel({
  date, entry, isSaving, onAdd, onRemove,
}: {
  date: string;
  entry: DailyTargetEntry | null;
  isSaving: boolean;
  onAdd: (slug: string) => void;
  onRemove: (slug: string) => void;
}) {
  const { openProblem } = useProblemModal();
  const { isSignedIn } = useAuth();
  const [tab, setTab] = useState<"pick" | "import">("pick");

  const slugSet = useMemo(() => new Set(entry?.problems.map(p => p.problemSlug) ?? []), [entry]);
  const problems = useMemo(() =>
    (entry?.problems ?? []).map(p => resolveProblem(p.problemSlug)).filter(Boolean) as Problem[],
    [entry]);

  const today = isoDate(new Date());
  const isToday = date === today;
  const isPast = date < today;

  return (
    <div className="space-y-4">
      {/* Date header */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold
          ${isToday ? "bg-accent/15 text-accent" : isPast ? "bg-bg-surface text-text-tertiary" : "bg-bg-surface text-text-secondary"}`}>
          <Target className="h-3.5 w-3.5" />
          {isToday ? "Today" : new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}
        </div>
        {isSaving && <span className="text-xs text-text-tertiary animate-pulse">Saving…</span>}
      </div>

      {/* Problems for this day */}
      {problems.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-tertiary font-medium">
              {problems.length} problem{problems.length !== 1 ? "s" : ""} planned
            </span>
          </div>
          {problems.map(p => (
            <ProblemCard
              key={p.slug}
              problem={p}
              onRemove={isSignedIn ? () => onRemove(p.slug) : undefined}
              onOpen={() => openProblem(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-default bg-bg-surface p-6 text-center">
          <Target className="h-6 w-6 text-text-tertiary mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-tertiary">No problems planned for this day.</p>
          <p className="text-xs text-text-tertiary mt-1 opacity-60">Use the picker below to add some.</p>
        </div>
      )}

      {/* Add problems */}
      {isSignedIn ? (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4 space-y-4">
          <div className="flex gap-2">
            {(["pick", "import"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors
                  ${tab === t ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}>
                {t === "pick" ? "Search & Pick" : "JSON Import"}
              </button>
            ))}
          </div>
          {tab === "pick" ? (
            <ProblemPicker selectedSlugs={slugSet} onAdd={onAdd} onRemove={onRemove} />
          ) : (
            <JsonImporter onImport={slugs => slugs.forEach(s => !slugSet.has(s) && onAdd(s))} />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 text-center text-sm text-text-tertiary">
          Sign in to save your daily targets.
        </div>
      )}
    </div>
  );
}

// ─── Main Studio ─────────────────────────────────────────────────────────────

export function DailyTargetStudio() {
  const { dailyTargets, dailyTargetsLoaded, addProblemToDay, removeProblemFromDay, refreshDailyTargets } = useUserData();
  const { isSignedIn } = useAuth();

  const todayStr = isoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [isSaving, setIsSaving] = useState(false);

  // Load week data when week changes
  useEffect(() => {
    if (isSignedIn) refreshDailyTargets(isoDate(weekStart));
  }, [weekStart, isSignedIn, refreshDailyTargets]);

  function navigateWeek(dir: -1 | 1) {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() + dir * 7);
      return d;
    });
  }

  async function handleAdd(slug: string) {
    setIsSaving(true);
    try { await addProblemToDay(selectedDate, slug); }
    finally { setIsSaving(false); }
  }

  async function handleRemove(slug: string) {
    setIsSaving(true);
    try { await removeProblemFromDay(selectedDate, slug); }
    finally { setIsSaving(false); }
  }

  const selectedEntry = dailyTargets[selectedDate] ?? null;

  // Stats
  const weekDays = getWeekDays(weekStart);
  const totalPlanned = weekDays.reduce((acc, d) => acc + (dailyTargets[isoDate(d)]?.problems.length ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-surface via-bg-elevated to-bg-base p-6">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
        <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)]" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Weekly Planner
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Daily Targets</h1>
            <p className="mt-2 text-sm text-text-secondary max-w-lg">
              Plan your DSA practice week by week. Add multiple problems per day, track progress, and stay consistent.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-xl border border-border-default bg-bg-base/80 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-text-primary">{totalPlanned}</div>
              <div className="text-xs text-text-tertiary mt-0.5">This week</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Calendar */}
      <WeeklyCalendar
        weekStart={weekStart}
        targets={dailyTargets}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onNavigate={navigateWeek}
      />

      {/* Day Panel */}
      {dailyTargetsLoaded || !isSignedIn ? (
        <DayPanel
          date={selectedDate}
          entry={selectedEntry}
          isSaving={isSaving}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      ) : (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl border border-border-default bg-bg-surface animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
