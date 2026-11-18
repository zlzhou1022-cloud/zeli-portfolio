import { Redis } from "@upstash/redis";
import { randomBytes } from "crypto";

// 管理后台登录防爆破（2026-11-18）：按来源 IP 计数，15 分钟内错 5 次锁定 15 分钟；
// 锁定触发时由调用方发 LINE 告警，告警里的一次性链接可提前解锁（/api/admin-unlock）。
// Redis 不可用时一律放行（fail-open）：防爆破是加固，不能反过来把站长锁在门外。
const FAIL_LIMIT = 5;
const FAIL_WINDOW_SEC = 900; // 失败计数窗口 15 分钟
const LOCK_SEC = 900; // 锁定时长 15 分钟
const TOKEN_TTL_SEC = 3600; // 解锁链接有效期 1 小时

function redis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL as string;
  const tok = process.env.UPSTASH_REDIS_REST_TOKEN as string;
  return new Redis({
    url,
    token: tok,
    signal: () => AbortSignal.timeout(2500),
  });
}

const failsKey = (ip: string) => `admin_login_fails:${ip}`;
const lockKey = (ip: string) => `admin_login_lock:${ip}`;
const tokenKey = (token: string) => `admin_unlock:${token}`;

export async function isAdminLocked(ip: string): Promise<boolean> {
  try {
    return (await redis().get(lockKey(ip))) !== null;
  } catch {
    return false;
  }
}

/** 记一次失败；返回 true 表示这次失败刚刚触发了锁定 */
export async function recordAdminFailure(ip: string): Promise<boolean> {
  try {
    const r = redis();
    const count = await r.incr(failsKey(ip));
    if (count === 1) await r.expire(failsKey(ip), FAIL_WINDOW_SEC);
    if (count >= FAIL_LIMIT) {
      await r.set(lockKey(ip), "1", { ex: LOCK_SEC });
      await r.del(failsKey(ip));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function resetAdminFailures(ip: string): Promise<void> {
  try {
    await redis().del(failsKey(ip));
  } catch {
    // 忽略：清计数失败不影响登录本身
  }
}

/** 生成一次性解锁令牌（与被锁 IP 绑定）；Redis 不可用时返回 null，调用方跳过告警链接 */
export async function createAdminUnlockToken(ip: string): Promise<string | null> {
  try {
    const token = randomBytes(32).toString("hex");
    await redis().set(tokenKey(token), ip, { ex: TOKEN_TTL_SEC });
    return token;
  } catch {
    return null;
  }
}

/** 消费解锁令牌：有效则解除对应 IP 的锁定与计数并返回该 IP；无效/已用/过期返回 null */
export async function consumeAdminUnlockToken(token: string): Promise<string | null> {
  try {
    const r = redis();
    const ip = await r.get<string>(tokenKey(token));
    if (!ip) return null;
    await r.del(tokenKey(token));
    await r.del(lockKey(ip));
    await r.del(failsKey(ip));
    return ip;
  } catch {
    return null;
  }
}
