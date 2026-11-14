import { redirect } from "next/navigation";

// 猜县游戏已搬到小游戏专区（2026-11-14 站长改版）：旧地址永久跳转新地址，
// 收藏过旧链接的访客不会扑空。
export default async function OldPrefectureGameRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/games/prefecture-game`);
}
