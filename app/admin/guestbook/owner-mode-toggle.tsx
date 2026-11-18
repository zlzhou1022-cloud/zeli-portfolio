"use client";

import { useEffect, useState } from "react";
import { isOwnerMode, setOwnerMode } from "@/lib/owner";

// 站长模式开关（2026-11-19）：只出现在密码登录后的后台，控制「本机浏览器」的测试覆盖。
// 时装/家具/星星都是访客本机的单机数据，开启只是判定层放行，不写回真实存档，关闭即恢复。
export function OwnerModeToggle() {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOn(isOwnerMode());
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggle = () => {
    const next = !on;
    setOwnerMode(next);
    setOn(next);
  };

  return (
    <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800/40 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">🔑 站长模式（本机测试）</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            开启后，<b>这台浏览器</b>上：全部时装解锁可穿、小屋全部家具可用、星星按 ∞ 显示、零食免费。
            只是显示与判定层面的覆盖，<b>不会改写你的真实存档</b>，关闭立即恢复原样。
            换浏览器或设备需要重新开启；开启时前台左下角有徽章提醒。
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={!mounted}
          className={`shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
            on
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {mounted ? (on ? "已开启 · 点击关闭" : "开启站长模式") : "…"}
        </button>
      </div>
    </section>
  );
}
