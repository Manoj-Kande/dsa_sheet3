"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Globe, Lock, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { useAuth } from "@clerk/nextjs";

interface Sheet { id: string; slug: string; title: string; description: string | null; isPublic: boolean; problemCount: number; createdAt: string; }

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Request failed");
  return json.data as T;
}

function CreateSheetModal({ onClose, onCreate }: { onClose: () => void; onCreate: (s: Sheet) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    try {
      let problems: { problemSlug: string }[] = [];
      if (jsonText.trim()) {
        const parsed = JSON.parse(jsonText);
        const arr = Array.isArray(parsed) ? parsed : (parsed.problems ?? parsed.items ?? []);
        problems = arr.map((p: unknown) => ({
          problemSlug: typeof p === "string" ? p : (p as Record<string,string>).slug ?? (p as Record<string,string>).problemSlug ?? ""
        })).filter((p: {problemSlug: string}) => p.problemSlug);
      }
      const sheet = await fetchJson<Sheet>("/api/custom-sheets", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, isPublic, problems }),
      });
      onCreate(sheet);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create sheet");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border-default bg-bg-surface p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-text-primary mb-5">Create Custom Sheet</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-text-tertiary font-medium">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="My Blind 75, Google Prep..."
              className="mt-1.5 w-full rounded-xl border border-border-default bg-bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-focus transition-colors" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-text-tertiary font-medium">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What's this sheet about?"
              className="mt-1.5 w-full rounded-xl border border-border-default bg-bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-focus transition-colors resize-none min-h-20" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-text-tertiary font-medium">Import problems via JSON (optional)</label>
            <textarea value={jsonText} onChange={e => setJsonText(e.target.value)}
              placeholder={`["two-sum", "binary-search"]\n// or\n{"problems": [{"slug": "two-sum"}]}`}
              className="mt-1.5 w-full rounded-xl border border-border-default bg-bg-base px-4 py-2.5 font-mono text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-focus transition-colors resize-none min-h-24" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setIsPublic(p => !p)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isPublic ? "bg-accent" : "bg-bg-subtle"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-text-secondary">Make public (anyone with link can view)</span>
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 justify-center text-sm disabled:opacity-50">
              {loading ? "Creating…" : "Create Sheet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MySheetsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    fetchJson<Sheet[]>("/api/custom-sheets").then(setSheets).finally(() => setLoading(false));
  }, [isSignedIn]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this sheet?")) return;
    await fetchJson(`/api/custom-sheets/${id}`, { method: "DELETE" });
    setSheets(prev => prev.filter(s => s.id !== id));
  }

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Custom Sheets
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">My Sheets</h1>
            <p className="mt-1 text-text-secondary">Create and manage your own curated problem lists.</p>
          </div>
          {isSignedIn && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> New Sheet
            </button>
          )}
        </div>

        {!isLoaded || loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
          </div>
        ) : !isSignedIn ? (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-12 text-center">
            <BookOpen className="h-10 w-10 text-text-tertiary mx-auto mb-3 opacity-40" />
            <p className="text-text-secondary">Sign in to create and manage your custom sheets.</p>
          </div>
        ) : sheets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface p-12 text-center">
            <BookOpen className="h-10 w-10 text-text-tertiary mx-auto mb-3 opacity-40" />
            <p className="text-lg font-semibold text-text-primary mb-1">No sheets yet</p>
            <p className="text-text-secondary mb-4">Create your first custom sheet to get started.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
              <Plus className="h-4 w-4" /> Create Sheet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sheets.map(sheet => (
              <div key={sheet.id} className="group relative rounded-2xl border border-border-default bg-bg-surface p-5 card-hover">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sheet.isPublic
                        ? <Globe className="h-3.5 w-3.5 text-accent shrink-0" />
                        : <Lock className="h-3.5 w-3.5 text-text-tertiary shrink-0" />}
                      <span className="text-xs text-text-tertiary">{sheet.isPublic ? "Public" : "Private"}</span>
                    </div>
                    <h3 className="font-semibold text-text-primary truncate">{sheet.title}</h3>
                    {sheet.description && <p className="text-sm text-text-secondary mt-1 line-clamp-2">{sheet.description}</p>}
                  </div>
                  <button onClick={() => handleDelete(sheet.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">{sheet.problemCount} problems</span>
                  <Link href={`/my-sheets/${sheet.slug}`}
                    className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors">
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showCreate && (
        <CreateSheetModal onClose={() => setShowCreate(false)} onCreate={s => setSheets(prev => [s, ...prev])} />
      )}
    </AppShell>
  );
}
