"use client";

// Light/dark toggle. layout.tsx sets the initial class before paint
// (dark unless the user chose light); this hook keeps React in sync.
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    // Smoothly fade colors for this one switch, then remove the helper class.
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next === "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage blocked: the toggle still works for this visit */
    }
    setTheme(next);
  }

  return { theme, toggle };
}
