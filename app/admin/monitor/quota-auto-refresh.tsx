"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 额度卡的「实时」刷新：每 30 秒让服务端组件重拉一次快照（只读 Redis，不探测、
// 不消耗供应商额度）。真正的额度数字变化来自聊天路由的旁路记账与手动探测。
export function QuotaAutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const iv = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(iv);
  }, [router, seconds]);
  return null;
}
