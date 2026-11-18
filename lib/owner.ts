// 站长模式（2026-11-19 站长需求）：站长本人测试内容用的本机开关。
// 开关入口只在密码保护的 /admin 后台（OwnerModeToggle），状态存本机 localStorage。
// 性质：纯显示/判定层覆盖——时装解锁、家具拥有、星星余额在判定时临时放行，
// 绝不写回任何真实存档；关闭立即恢复原状。时装/家具/星星都是访客本机的单机数据，
// 没有服务器资产，因此这个开关不构成安全边界（访客改自己浏览器也只影响自己），
// 藏进后台只是避免普通访客随手触发、剧透未解锁时装的黑影悬念。
export const OWNER_MODE_KEY = "muse_owner_mode";
export const OWNER_EVENT = "muse:owner-changed";

export function isOwnerMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OWNER_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOwnerMode(on: boolean) {
  try {
    if (on) localStorage.setItem(OWNER_MODE_KEY, "1");
    else localStorage.removeItem(OWNER_MODE_KEY);
  } catch {
    /* 存不下就算了 */
  }
  window.dispatchEvent(new CustomEvent(OWNER_EVENT));
}
