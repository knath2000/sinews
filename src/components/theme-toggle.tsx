import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { isDark, toggleDark, loading } = useTheme();

  return (
    <button
      onClick={toggleDark}
      disabled={loading}
      className="group flex w-full items-center gap-2 rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--ds-surface-2)] disabled:opacity-50"
      style={{
        borderColor: "var(--ds-border)",
        backgroundColor: "var(--ds-surface-1)",
        color: "var(--ds-text-muted)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Moon className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="flex-1 text-left">
        {isDark ? "Light mode" : "Dark mode"}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          background: "var(--ds-accent-soft)",
          color: "var(--ds-accent)",
        }}
      >
        {isDark ? "ON" : "OFF"}
      </span>
    </button>
  );
}
