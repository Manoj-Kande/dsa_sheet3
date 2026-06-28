"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Globe, Lock, ArrowLeft, Copy, Check } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { useUserData } from "@/lib/hooks/use-user-data";
import { useProblemModal } from "@/components/shared/problem-modal-provider";
import { DATASET, getProblemBySlug } from "@/lib/data/dataset";
import { DifficultyBadge, NeutralBadge } from "@/components/ui/badge";
import { QuickLinks } from "@/components/ui/quick-links";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { use } from "react";

interface SheetProblem { id: string; problemSlug: string; note: string | null; order: number; }
interface Sheet { id: string; slug: string; title: string; description: string | null; isPublic: boolean; problemCount: number; problems: SheetProblem[]; }

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Request failed");
  return json.data as T;
}

function StatusIcon({ slug }: { slug: string }) {
  const { getStatus } = useUserData();
  const s = getStatus(slug);
  if (s === "SOLVED") return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (s === "ATTEMPTED") return <Circle className="h-4 w-4 text-amber-400 shrink-0" />;
  if (s === "REVISIT") return <Clock className="h-4 w-4 text-violet-400 shrink-0" />;
  return <Circle className="h-4 w-4 text-text-tertiary opacity-30 shrink-0" />;
}

export default function SheetDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { openProblem } = useProblemModal();
  const { progress } = useUserData();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    fetchJson<Sheet>(`/api/custom-sheets/${slug}`)
      .then(setSheet).catch(() => setSheet(null)).finally(() => setLoading(false));
  }, [slug]);

  const solvedCount = useMemo(() =>
    sheet?.problems.filter(p => progress[p.problemSlug] === "SOLVED").length ?? 0,
    [sheet, progress]);

  const filtered = useMemo(() => {
    if (!sheet) return [];
    const q = query.trim().toLowerCase();
    return sheet.problems.filter(p => {
      const prob = getProblemBySlug(p.problemSlug);
      return !q || prob?.title.toLowerCase().includes(q) || p.problemSlug.includes(q);
    });
  }, [sheet, query]);

  const pickerFiltered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const existing = new Set(sheet?.problems.map(p => p.problemSlug) ?? []);
    return DATASET.problems
      .filter(p => !existing.has(p.slug) && (!q || p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q)))
      .slice(0, 30);
  }, [pickerQuery, sheet]);

  async function addProblem(problemSlug: string) {
    if (!sheet) return;
    const updated = await fetchJson<Sheet>(`/api/custom-sheets/${sheet.id}`, {
      method: "PATCH", body: JSON.stringify({ action: "addProblem", problemSlug }),
    });
    setSheet(updated);
  }

  async function removeProblem(problemSlug: string) {
    if (!sheet) return;
    const updated = await fetchJson<Sheet>(`/api/custom-sheets/${sheet.id}`, {
      method: "PATCH", body: JSON.stringify({ action: "removeProblem", problemSlug }),
    });
    setSheet(updated);
  }

  async function togglePublic() {
    if (!sheet) return;
    const updated = await fetchJson<Sheet>(`/api/custom-sheets/${sheet.id}`, {
      method: "PATCH", body: JSON.stringify({ action: "update", isPublic: !sheet.isPublic }),
    });
    setSheet(updated);
  }

  async function saveTitle() {
    if (!sheet || !editTitle.trim()) return;
    const updated = await fetchJson<Sheet>(`/api/custom-sheets/${sheet.id}`, {
      method: "PATCH", body: JSON.stringify({ action: "update", title: editTitle.trim() }),
    });
    setSheet(updated);
    setEditing(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/my-sheets/${sheet?.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <AppShell><div className="max-w-[1400px] mx-auto px-6 py-10 space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div></AppShell>;
  if (!sheet) return <AppShell><div className="max-w-[1400px] mx-auto px-6 py-10 text-center text-text-secondary">Sheet not found.</div></AppShell>;

  const pct = sheet.problemCount ? Math.round((solvedCount / sheet.problemCount) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div>
          <Link href="/my-sheets" className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> My Sheets
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    className="text-2xl font-bold bg-transparent border-b border-border-focus outline-none text-text-primary"
                    onKeyDown={e => e.key === "Enter" && saveTitle()} autoFocus />
                  <button onClick={saveTitle} className="btn-primary text-xs px-3 py-1.5">Save</button>
                  <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
                </div>
              ) : (
                <h1 onClick={() => { setEditTitle(sheet.title); setEditing(true); }}
                  className="text-3xl font-bold text-text-primary cursor-pointer hover:text-accent transition-colors">
                  {sheet.title}
                </h1>
              )}
              {sheet.description && <p className="mt-1 text-text-secondary">{sheet.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={togglePublic}
                className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5">
                {sheet.isPublic ? <><Globe className="h-3.5 w-3.5 text-accent"/>Public</> : <><Lock className="h-3.5 w-3.5"/>Private</>}
              </button>
              {sheet.isPublic && (
                <button onClick={copyLink} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5">
                  {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400"/>Copied!</> : <><Copy className="h-3.5 w-3.5"/>Copy Link</>}
                </button>
              )}
              <button onClick={() => setShowPicker(p => !p)} className="btn-primary text-xs px-3 py-2">
                <Plus className="h-3.5 w-3.5" /> Add Problem
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 max-w-xs h-2 rounded-full bg-bg-elevated overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-500"
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm text-text-secondary">{solvedCount}/{sheet.problemCount} solved · {pct}%</span>
          </div>
        </div>

        {/* Problem picker */}
        {showPicker && (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">Add problems</span>
              <button onClick={() => setShowPicker(false)} className="text-text-tertiary hover:text-text-primary"><Trash2 className="h-4 w-4 rotate-0" /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <input value={pickerQuery} onChange={e => setPickerQuery(e.target.value)}
                placeholder="Search problems to add..."
                className="w-full rounded-xl border border-border-default bg-bg-base pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-focus transition-colors" />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 scrollbar-thin">
              {pickerFiltered.map(p => (
                <button key={p.slug} onClick={() => addProblem(p.slug)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-base p-3 text-left hover:border-border-focus hover:bg-bg-elevated transition-all">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{p.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <DifficultyBadge difficulty={p.difficulty} variant="outline" />
                      <span className="text-xs text-text-tertiary">{p.topic}</span>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-accent shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Filter problems in this sheet..."
            className="w-full rounded-xl border border-border-default bg-bg-surface pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-focus transition-colors" />
        </div>

        {/* Problems list */}
        <div className="space-y-2">
          {filtered.map((sp, i) => {
            const prob = getProblemBySlug(sp.problemSlug);
            if (!prob) return null;
            return (
              <div key={sp.id}
                className="group flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-3 hover:border-border-focus hover:bg-bg-elevated transition-all duration-150">
                <span className="text-xs text-text-tertiary w-6 text-right shrink-0">{i + 1}</span>
                <StatusIcon slug={prob.slug} />
                <div className="flex-1 min-w-0">
                  <button onClick={() => openProblem(prob.id)}
                    className="text-sm font-semibold text-text-primary hover:text-accent transition-colors text-left truncate block">
                    {prob.title}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <DifficultyBadge difficulty={prob.difficulty} variant="outline" />
                    <NeutralBadge>{prob.estimated_time_minutes ?? "—"}m</NeutralBadge>
                    <span className="text-xs text-text-tertiary">{prob.topic}</span>
                  </div>
                </div>
                <QuickLinks problem={prob} />
                <button onClick={() => removeProblem(sp.problemSlug)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-default bg-bg-surface p-8 text-center text-text-tertiary text-sm">
              {query ? "No problems match your search." : "No problems yet. Click \"Add Problem\" to get started."}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
