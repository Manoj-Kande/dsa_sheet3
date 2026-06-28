"use client";
import { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, message: "" }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, message: error.message }; }
  componentDidCatch(error: Error) { console.error("[ErrorBoundary]", error); }
  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-6">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <div>
          <p className="text-lg font-semibold text-text-primary">Something went wrong</p>
          <p className="text-sm text-text-tertiary mt-1 max-w-sm">{this.state.message || "An unexpected error occurred."}</p>
        </div>
        <button onClick={() => { this.setState({ hasError: false, message: "" }); window.location.reload(); }}
          className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4" /> Reload page
        </button>
      </div>
    );
  }
}
