"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X, Timer, ChevronUp, ChevronDown } from "lucide-react";

type Phase = "focus" | "break";

const PRESETS = [
  { label: "25 / 5", focus: 25, breakMins: 5 },
  { label: "50 / 10", focus: 50, breakMins: 10 },
  { label: "90 / 15", focus: 90, breakMins: 15 },
];

function pad(n: number) { return String(n).padStart(2, "0"); }

export function FocusTimer() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [focusMins, setFocusMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [phase, setPhase] = useState<Phase>("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const totalSeconds = phase === "focus" ? focusMins * 60 : breakMins * 60;
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  function playBeep() {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }

  const tick = useCallback(() => {
    setSeconds(prev => {
      if (prev <= 1) {
        playBeep();
        setPhase(p => {
          if (p === "focus") { setSessions(s => s + 1); setSeconds(breakMins * 60); return "break"; }
          setSeconds(focusMins * 60); return "focus";
        });
        return prev; // will be overridden by setPhase's setSeconds
      }
      return prev - 1;
    });
  }, [focusMins, breakMins]);

  useEffect(() => {
    if (running) { intervalRef.current = setInterval(tick, 1000); }
    else if (intervalRef.current) { clearInterval(intervalRef.current); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  // Update title
  useEffect(() => {
    if (running) document.title = `${pad(mins)}:${pad(secs)} — ${phase === "focus" ? "Focus" : "Break"} | InterviewOS`;
    else document.title = "InterviewOS";
    return () => { document.title = "InterviewOS"; };
  }, [running, mins, secs, phase]);

  function reset() {
    setRunning(false);
    setPhase("focus");
    setSeconds(focusMins * 60);
  }

  function applyPreset(f: number, b: number) {
    setFocusMins(f); setBreakMins(b);
    setRunning(false); setPhase("focus"); setSeconds(f * 60);
  }

  const circumference = 2 * Math.PI * 40;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-border-default bg-bg-surface px-4 py-3 text-sm font-semibold text-text-primary shadow-lg hover:border-border-strong hover:bg-bg-elevated transition-all duration-200 hover:-translate-y-0.5 glow-accent">
        <Timer className="h-4 w-4 text-accent" />
        Focus Timer
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-72 rounded-2xl border border-border-default bg-bg-surface shadow-2xl transition-all duration-300 ${minimized ? "h-14 overflow-hidden" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary">Focus Timer</span>
          {sessions > 0 && <span className="text-xs text-text-tertiary">· {sessions} sessions</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(m => !m)} className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors">
            {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={() => { setOpen(false); setRunning(false); }} className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="p-4 space-y-4">
          {/* Phase indicator */}
          <div className="flex gap-1">
            {(["focus", "break"] as Phase[]).map(p => (
              <div key={p} className={`flex-1 rounded-full py-1 text-center text-xs font-semibold transition-colors
                ${phase === p ? (p === "focus" ? "bg-accent text-white" : "bg-emerald-500/20 text-emerald-400") : "text-text-tertiary"}`}>
                {p === "focus" ? "Focus" : "Break"}
              </div>
            ))}
          </div>

          {/* SVG ring timer */}
          <div className="flex justify-center">
            <div className="relative">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-bg-elevated)" strokeWidth="6" />
                <circle cx="50" cy="50" r="40" fill="none"
                  stroke={phase === "focus" ? "var(--color-accent)" : "#10b981"}
                  strokeWidth="6" strokeDasharray={circumference}
                  strokeDashoffset={circumference - (progress / 100) * circumference}
                  strokeLinecap="round" transform="rotate(-90 50 50)"
                  className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-2xl font-bold text-text-primary">{pad(mins)}:{pad(secs)}</span>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wide">{phase}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={reset} className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => setRunning(r => !r)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all
                ${running ? "bg-bg-elevated text-text-primary border border-border-default hover:border-border-strong" : "bg-accent text-white hover:bg-accent-hover shadow-[0_4px_12px_rgba(110,110,247,0.4)]"}`}>
              {running ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Start</>}
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <span className="text-xs text-text-tertiary uppercase tracking-wide font-medium">Presets</span>
            <div className="flex gap-1.5">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p.focus, p.breakMins)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors
                    ${focusMins === p.focus && breakMins === p.breakMins
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-bg-elevated text-text-tertiary hover:text-text-primary"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom */}
          <div className="flex gap-3">
            {[
              { label: "Focus", value: focusMins, set: (v: number) => { setFocusMins(v); if (phase === "focus") setSeconds(v * 60); } },
              { label: "Break", value: breakMins, set: (v: number) => { setBreakMins(v); if (phase === "break") setSeconds(v * 60); } },
            ].map(f => (
              <div key={f.label} className="flex-1">
                <label className="text-xs text-text-tertiary block mb-1">{f.label} (min)</label>
                <input type="number" min={1} max={120} value={f.value}
                  onChange={e => f.set(Math.max(1, Math.min(120, Number(e.target.value))))}
                  className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-1.5 text-sm text-text-primary outline-none focus:border-border-focus transition-colors text-center font-mono" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
