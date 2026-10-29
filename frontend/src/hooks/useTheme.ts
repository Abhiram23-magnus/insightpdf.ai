// hooks/useTheme.ts
"use client";

// A tiny hook to toggle between light and dark mode.
// It adds/removes the "dark" class on <html>, which Tailwind's
// darkMode: "class" setting watches. We also remember the choice in
// localStorage so it persists across visits.
//
// The initial class is already set by a small script in layout.tsx (before
// the page paints), so here we just read what's on <html> to stay in sync.

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function save(theme: Theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Private mode / blocked storage: the toggle still works for this visit.
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    save(next);
    setTheme(next);
  }

  return { theme, toggle };
}
