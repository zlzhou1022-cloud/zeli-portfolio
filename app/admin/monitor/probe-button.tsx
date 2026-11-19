"use client";

import { useFormStatus } from "react-dom";

// 「立即探测」按钮：提交后立刻进入 pending 态（禁用 + 文案变「探测中…」），
// 让站长明确知道点击已生效——探测要等两家供应商各回一次，最长约 8 秒。
export function ProbeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-85 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-wait"
    >
      {pending ? "探测中…" : "立即探测"}
    </button>
  );
}
