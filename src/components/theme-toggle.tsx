import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { isDark, toggleDark, loading } = useTheme();

  return (
    <button
      onClick={toggleDark}
      disabled={loading}
      className="group flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-all hover:shadow-sm disabled:opacity-50"
      style={{
        borderColor: "var(--surface-border-white)",
        backgroundColor: "var(--surface-card-bg)",
        color: "var(--text-muted)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Moon className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="flex-1 text-left font-medium text-panel-label">
        {isDark ? "Light mode" : "Dark mode"}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          background: "rgba(56,189,248,0.16)",
          color: "var(--text-accent-panel)",
          border: "1px solid rgba(56,189,248,0.18)",
        }}
      >
        {isDark ? "ON" : "OFF"}
      </span>
    </button>
  );
}
