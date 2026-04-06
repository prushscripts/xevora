"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-[var(--text)]">Something went wrong</h2>
          <p className="text-sm text-[var(--muted)]">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-2 rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--blue-bright)]"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
