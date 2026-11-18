import { Redis } from "@upstash/redis";
import { getTranslations } from "next-intl/server";

// 首页页脚（2026-11-18）：今日接待数取聊天新会话计数（与 layout 配额同一 key），
// Redis 不可用时静默降级为只显示值班文案，绝不让页脚成为故障点。
export default async function HomeFooter() {
  const t = await getTranslations("Home");
  let count: number | null = null;
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const today = new Date().toISOString().split("T")[0];
    const v = await Promise.race([
      redis.get<number>(`chat_new_sessions:${today}`),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (typeof v === "number" && v > 0) count = v;
  } catch {
    count = null;
  }

  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 pt-6 pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 text-xs text-stone-400 dark:text-stone-500">
      <div>© {new Date().getFullYear()} Zeli Zhou</div>
      <div>
        {t("footer.onDuty")}
        {count !== null && (
          <>
            {" · "}
            <span className="text-lime-700 dark:text-lime-500 font-medium">
              {t("footer.served", { count })}
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
