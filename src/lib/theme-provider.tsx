"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface ThemeContextValue {
  isDark: boolean;
  toggleDark: () => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load preference from DB on mount, with brief timeout fallback
  useEffect(() => {
    let cancelled = false;
    const fetchPref = fetch("/api/settings/theme")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    // Fallback: apply dark class after timeout if fetch hasn't resolved
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        // Apply whatever we have so far
        document.documentElement.classList.toggle("dark", isDark);
      }
    }, 2000);

    fetchPref.then((data) => {
      if (cancelled) return;
      clearTimeout(timeout);
      const pref = data?.darkMode === true;
      setIsDark(pref);
      document.documentElement.classList.toggle("dark", pref);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    fetch("/api/settings/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: next }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}
