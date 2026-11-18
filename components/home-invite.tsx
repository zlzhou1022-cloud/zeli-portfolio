"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

// 首页底部「慕斯邀请条」（2026-11-18）：按访客本地时段问候，气泡文案轮换，按钮打开聊天。
export function HomeInvite() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [greeting, setGreeting] = useState("greetingEvening");

  useEffect(() => {
    // 问候按访客本地时段选，挂载后异步落定（避免 SSR/水合时差与 lint 的同步 setState 规则）
    const greetTimer = setTimeout(() => {
      const h = new Date().getHours();
      setGreeting(
        h < 5 ? "greetingNight" : h < 11 ? "greetingMorning" : h < 14 ? "greetingNoon" : h < 18 ? "greetingAfternoon" : "greetingEvening"
      );
    }, 50);
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % 3);
        setVisible(true);
      }, 360);
    }, 3400);
    return () => {
      clearTimeout(greetTimer);
      clearInterval(timer);
    };
  }, []);

  const lines = [t("invite.line1"), t("invite.line2"), t("invite.line3")];
  const sep = locale === "en" ? ", " : "，";

  return (
    <section className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
      <Image
        src="/muse-pet/book.webp"
        alt="Muse"
        width={339}
        height={560}
        className="w-10 md:w-12 h-auto shrink-0 hidden sm:block"
      />
      <div className="flex-1 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          {t(`invite.${greeting}`)}
          {sep}
          {t("invite.iam")}
        </span>{" "}
        <span className="transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }}>
          {lines[idx]}
        </span>
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("ling:open-chat"))}
        className="shrink-0 self-start sm:self-center bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
      >
        {t("invite.button")} →
      </button>
    </section>
  );
}
