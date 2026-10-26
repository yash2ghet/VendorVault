"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

/**
 * 1. Theme Provider Wrapper Component
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

/**
 * 2. Theme Toggle Controller Component
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch bugs by waiting for mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[108px] h-9 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/40 animate-pulse border border-zinc-300 dark:border-zinc-800" />;
  }

  return (
    <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl shadow-sm transition-colors duration-200">
      {/* Light Mode Switch */}
      <button
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded-lg transition-colors duration-150 ${
          theme === "light" 
            ? "bg-white text-amber-500 shadow-sm border border-zinc-200/50" 
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        title="Light Mode"
      >
        <Sun className="h-4 w-4" />
      </button>

      {/* Dark Mode Switch */}
      <button
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded-lg transition-colors duration-150 ${
          theme === "dark" 
            ? "bg-zinc-800 text-emerald-400 border border-zinc-700/50" 
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        title="Dark Mode"
      >
        <Moon className="h-4 w-4" />
      </button>

      {/* System Default Switch */}
      <button
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded-lg transition-colors duration-150 ${
          theme === "system" 
            ? "bg-white dark:bg-zinc-800 text-blue-500 dark:text-blue-400 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50" 
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
        title="System Default"
      >
        <Laptop className="h-4 w-4" />
      </button>
    </div>
  );
}