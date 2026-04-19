"use client";

import type { ReactNode } from "react";

type PageShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  shellClassName?: string;
};

export function PageShell({
  sidebar,
  children,
  contentClassName = "",
  shellClassName = "",
}: PageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden lg:h-screen lg:overflow-hidden">
      <div
        className={`relative mx-auto grid min-h-screen w-full max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:h-[calc(100vh-2rem)] lg:grid-cols-[270px_minmax(0,1fr)] lg:overflow-hidden lg:px-8 ${shellClassName}`}
      >
        <aside className="lg:h-full lg:self-start">{sidebar}</aside>

        <main className="space-y-5 pb-10 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:pb-0">
          <div
            className={`space-y-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:pb-4 ${contentClassName}`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Surfaces ──────────────────────────────────────────────────────

/**
 * ShellHero — primary page surface.
 */
export function ShellHero({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[12px] border px-6 py-6 sm:px-8 sm:py-7 ${className}`}
      style={{
        backgroundColor: "var(--ds-surface-1)",
        borderColor: "var(--ds-border)",
      }}
    >
      {children}
    </section>
  );
}

/**
 * ShellCard — standard panel surface.
 */
export function ShellCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[12px] border ${className}`}
      style={{
        backgroundColor: "var(--ds-surface-1)",
        borderColor: "var(--ds-border)",
      }}
    >
      {children}
    </section>
  );
}

/**
 * ShellSoftCard — secondary panel surface.
 */
export function ShellSoftCard({
  children,
  className = "",
  tint = "none",
}: {
  children: ReactNode;
  className?: string;
  tint?: "none" | "sky" | "apricot" | "lime" | "berry";
}) {
  return (
    <section
      className={`rounded-[12px] border ${className}`}
      style={{
        backgroundColor: "var(--ds-surface-2)",
        borderColor: "var(--ds-border)",
      }}
    >
      {children}
    </section>
  );
}
