"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <div className="w-[120px] h-[38px]" />;

  // 用 resolvedTheme（实际生效的主题）而不是 theme：无痕模式等无存储时 theme 是 "system"，
  // 夜间系统为暗色时页面已是暗色但 theme !== "dark"，旧逻辑第一下会把主题设成已经生效的
  // dark（看不见变化），要按两下才到 light（2026-11-19 站长反馈修复）
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 transition-all cursor-pointer group bg-white dark:bg-stone-950"
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-stone-600 dark:text-stone-400" />
          <span className="text-xs tracking-wider uppercase font-medium text-stone-600 dark:text-stone-400">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-stone-600 dark:text-stone-400" />
          <span className="text-xs tracking-wider uppercase font-medium text-stone-600 dark:text-stone-400">Dark</span>
        </>
      )}
    </button>
  );
}