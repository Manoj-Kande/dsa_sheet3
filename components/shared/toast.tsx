"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, X, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";
interface Toast { id: string; type: ToastType; message: string; }
interface ToastCtx { toast: (message: string, type?: ToastType) => void; success: (m: string) => void; error: (m: string) => void; warning: (m: string) => void; }

const ToastContext = createContext<ToastCtx | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertCircle, info: Info };
const COLORS = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  error:   "border-red-500/30 bg-red-500/10 text-red-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  info:    "border-accent/30 bg-accent/10 text-accent",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.type];
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md bg-bg-surface/90 min-w-72 max-w-sm
      animate-[fade-up_200ms_ease-out_both] ${COLORS[toast.type]}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="text-sm font-medium text-text-primary flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="text-text-tertiary hover:text-text-primary transition-colors shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++counter.current}`;
    setToasts(p => [...p.slice(-4), { id, type, message }]);
  }, []);

  const ctx: ToastCtx = {
    toast,
    success: useCallback((m: string) => toast(m, "success"), [toast]),
    error:   useCallback((m: string) => toast(m, "error"), [toast]),
    warning: useCallback((m: string) => toast(m, "warning"), [toast]),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
