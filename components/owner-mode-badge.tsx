"use client";

import { useEffect, useState } from "react";
import { isOwnerMode, setOwnerMode, OWNER_EVENT } from "@/lib/owner";

// 站长模式角落徽章（2026-11-19）：开启时在前台左下角常驻提醒，一点即关并刷新。
// 只对开了站长模式的本机浏览器可见，普通访客永远看不到。
export function OwnerModeBadge() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const read = () => setOn(isOwnerMode());
    read();
    window.addEventListener(OWNER_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(OWNER_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  if (!on) return null;

  return (
    <button
      type="button"
      onClick={() => {
        setOwnerMode(false);
        window.location.reload();
      }}
      className="fixed left-4 bottom-4 z-[90] px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-500/30 cursor-pointer hover:bg-amber-600 transition-colors"
      title="点击关闭站长模式"
    >
      🔑 站长模式中 · 点击关闭
    </button>
  );
}
