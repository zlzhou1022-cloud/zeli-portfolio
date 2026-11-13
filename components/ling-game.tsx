"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 慕斯向前冲：45 秒一局的竖版跑酷小游戏。玩法由站长 2026-11-14 亲自定稿
// （上一版「踩横杆躲地刺」被他否决：难懂）：慕斯向画面上方奔跑，画面自动
// 向下卷动；玩家拖动她在画面里做 2D 平面自由移动（指针跟随 / 方向键）；
// 横向障碍是实心墙——从下方撞上会被拦住、被顶着往下带，必须绕开障碍两端
// 或中间的缺口冲过去，被顶出画面下沿扣 1 点生命并在中场复活（1.6 秒无
// 敌）。空中光点（+10）/金色（+30）/墨团（−20）/炸弹（−1 生命），冲过的
// 距离也计分。奔跑动画 = 奔跑帧 A/B 两张每 150ms 轮换；被障碍拦住时切站
// 立帧。纯前端 canvas，最高分存 localStorage，无后端、不吃聊天配额。
// 打开方式：window 事件 "ling:open-game"（桌宠气泡、Lab 页卡片派发）。
// 主角形象：桌宠同款慕斯抠图 /muse-pet/run-a.webp、run-b.webp、look.webp，
// 加载失败时回退白团子。
const W = 400;
const H = 460;
const DURATION = 45;
const BEST_KEY = "ling_game_best";
const PLAYER_H = 66;
const PLAYER_HALF_W = 15; // 碰撞盒半宽（比画面略窄，手感宽容）
const PLAYER_BOX_H = 54; // 碰撞盒高
const POINTER_SPEED = 400; // 指针跟随的最高速度（px/s）
const KEY_SPEED = 320; // 方向键速度（px/s）
const BAR_T = 14;

type ItemKind = "mote" | "gold" | "ink" | "bomb";
type Item = { x: number; y: number; spd: number; r: number; kind: ItemKind };
type Popup = { x: number; y: number; text: string; color: string; born: number };
type Bar = { x: number; w: number; y: number };
type Phase = "closed" | "ready" | "playing" | "over";

export function LingGame() {
  const t = useTranslations("MiniGame");
  const [phase, setPhase] = useState<Phase>("closed");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [lives, setLives] = useState(3);
  const [overReason, setOverReason] = useState<"time" | "lives">("time");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<{ a: HTMLImageElement | null; b: HTMLImageElement | null; look: HTMLImageElement | null }>({
    a: null,
    b: null,
    look: null,
  });
  const stateRef = useRef({
    items: [] as Item[],
    popups: [] as Popup[],
    bars: [] as Bar[],
    dots: [] as { x: number; y0: number; f: number }[],
    px: W / 2,
    py: 330,
    targetX: W / 2,
    targetY: 300,
    pointerSeen: false,
    vx: 0,
    blocked: false,
    keys: { left: false, right: false, up: false, down: false },
    barAcc: 0,
    itemAcc: 0,
    elapsed: 0,
    distance: 0,
    pickup: 0,
    score: 0,
    lives: 3,
    hurtAt: 0,
    invUntil: 0,
    lastTickSecond: DURATION,
  });

  // 主角图预加载（组件全局挂载，页面打开时就拉好，进游戏不等待）
  useEffect(() => {
    const load = (key: "a" | "b" | "look", src: string) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imgRef.current[key] = img;
      };
    };
    load("a", "/muse-pet/run-a.webp");
    load("b", "/muse-pet/run-b.webp");
    load("look", "/muse-pet/look.webp");
  }, []);

  // 打开事件
  useEffect(() => {
    const open = () => {
      setBest(Number(localStorage.getItem(BEST_KEY) ?? 0) || 0);
      setScore(0);
      setLives(3);
      setTimeLeft(DURATION);
      setIsNewRecord(false);
      setPhase("ready");
    };
    window.addEventListener("ling:open-game", open);
    return () => window.removeEventListener("ling:open-game", open);
  }, []);

  // Esc 关闭
  useEffect(() => {
    if (phase === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhase("closed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const startGame = useCallback(() => {
    stateRef.current = {
      items: [],
      popups: [],
      bars: [],
      dots: Array.from({ length: 42 }, () => ({
        x: Math.random() * W,
        y0: Math.random() * H,
        f: 0.45 + Math.random() * 0.75,
      })),
      px: W / 2,
      py: 330,
      targetX: W / 2,
      targetY: 300,
      pointerSeen: false,
      vx: 0,
      blocked: false,
      keys: { left: false, right: false, up: false, down: false },
      barAcc: 0.55, // 第一道障碍稍晚一点出现
      itemAcc: 0,
      elapsed: 0,
      distance: 0,
      pickup: 0,
      score: 0,
      lives: 3,
      hurtAt: 0,
      invUntil: 0,
      lastTickSecond: DURATION,
    };
    setScore(0);
    setLives(3);
    setOverReason("time");
    setTimeLeft(DURATION);
    setIsNewRecord(false);
    setPhase("playing");
  }, []);

  // 游戏主循环（仅 playing 阶段运行）
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const s = stateRef.current;
    let raf = 0;
    let last = performance.now();

    // 障碍生成：每道障碍留一个缺口（左端 / 右端 / 中间），必须绕行
    const spawnBar = () => {
      const y = -BAR_T - 2;
      const roll = Math.random();
      if (roll < 0.38) {
        const gap = 100 + Math.random() * 34;
        s.bars.push({ x: gap, w: W - gap, y });
      } else if (roll < 0.76) {
        const gap = 100 + Math.random() * 34;
        s.bars.push({ x: 0, w: W - gap, y });
      } else {
        const gapW = 108 + Math.random() * 26;
        const gx = 40 + Math.random() * (W - gapW - 80);
        s.bars.push({ x: 0, w: gx, y });
        s.bars.push({ x: gx + gapW, w: W - gx - gapW, y });
      }
    };

    const spawnItem = () => {
      const roll = Math.random();
      const kind: ItemKind = roll < 0.12 ? "gold" : roll < 0.28 ? "bomb" : roll < 0.46 ? "ink" : "mote";
      // 别把物品生在障碍里面：顶部附近有障碍覆盖的 x 就换个位置（试 4 次）
      let x = 24 + Math.random() * (W - 48);
      for (let i = 0; i < 4; i++) {
        const inside = s.bars.some((b) => b.y < 70 && x > b.x - 18 && x < b.x + b.w + 18);
        if (!inside) break;
        x = 24 + Math.random() * (W - 48);
      }
      s.items.push({
        x,
        y: -16,
        spd: 0.9 + Math.random() * 0.2,
        r: kind === "mote" ? 9 : 12,
        kind,
      });
    };

    const finish = (reason: "time" | "lives") => {
      cancelAnimationFrame(raf);
      setScore(s.score);
      setLives(s.lives);
      setOverReason(reason);
      setBest((prev) => {
        if (s.score > prev) {
          localStorage.setItem(BEST_KEY, String(s.score));
          setIsNewRecord(true);
          return s.score;
        }
        return prev;
      });
      setPhase("over");
    };

    const hurt = (now: number, x: number, y: number) => {
      s.lives -= 1;
      s.hurtAt = now;
      s.invUntil = now + 1600;
      setLives(s.lives);
      s.popups.push({ x, y, text: "-1", color: "#dc2626", born: now });
    };

    const respawn = () => {
      s.px = W / 2;
      s.py = 320;
      s.targetX = W / 2;
      s.targetY = 290;
      s.blocked = false;
    };

    const drawOrbFallback = (cx: number, cy: number) => {
      // 抠图没加载好时的回退形象：与旧版一致的白色荧光团子
      const glow = ctx.createRadialGradient(cx, cy, 6, cx, cy, 34);
      glow.addColorStop(0, "rgba(186,230,253,0.5)");
      glow.addColorStop(1, "rgba(186,230,253,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      const g = ctx.createRadialGradient(cx, cy - 6, 4, cx, cy, 24);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.58, "#eef3f9");
      g.addColorStop(1, "#d9e4f2");
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.45)";
      ctx.stroke();
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 3, 2.7, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 3, 2.7, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawPlayer = (now: number) => {
      const imgs = imgRef.current;
      // 被障碍拦在下方 → 站立帧；其余时间两张奔跑帧轮换
      let img: HTMLImageElement | null;
      if (s.blocked) img = imgs.look ?? imgs.a;
      else img = Math.floor(now / 150) % 2 === 0 ? imgs.a : imgs.b;
      img = img ?? imgs.a ?? imgs.b ?? imgs.look;
      const inv = now < s.invUntil;
      const blinkOff = inv && Math.floor(now / 110) % 2 === 0;
      const tilt = Math.max(-0.12, Math.min(0.12, s.vx * 0.00035));
      const bob = s.blocked ? 0 : Math.sin(now / 78) * 1.4;
      ctx.save();
      ctx.translate(s.px, s.py + bob);
      ctx.rotate(tilt);
      if (blinkOff) ctx.globalAlpha = 0.3;
      if (img) {
        const w = (PLAYER_H * img.naturalWidth) / img.naturalHeight;
        // 脚下软影
        ctx.fillStyle = "rgba(60,50,30,0.18)";
        ctx.beginPath();
        ctx.ellipse(0, -1, w * 0.36, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(img, -w / 2, -PLAYER_H, w, PLAYER_H);
      } else {
        drawOrbFallback(0, -26);
      }
      ctx.restore();
    };

    const drawItem = (it: Item, now: number) => {
      if (it.kind === "bomb") {
        const g2 = ctx.createRadialGradient(it.x - 3, it.y - 3, 2, it.x, it.y, it.r);
        g2.addColorStop(0, "#78716c");
        g2.addColorStop(0.4, "#292524");
        g2.addColorStop(1, "#0c0a09");
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
        ctx.fillStyle = g2;
        ctx.fill();
        ctx.strokeStyle = "#a8a29e";
        ctx.beginPath();
        ctx.moveTo(it.x, it.y - it.r);
        ctx.quadraticCurveTo(it.x + 3, it.y - it.r - 5, it.x + 6, it.y - it.r - 5);
        ctx.stroke();
        const flick = 1 + Math.sin(now / 60 + it.x) * 0.35;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(it.x + 7, it.y - it.r - 6, 2.4 * flick, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      if (it.kind === "ink") {
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
        ctx.fillStyle = "#44403c";
        ctx.fill();
        ctx.fillStyle = "#e7e5e4";
        ctx.beginPath();
        ctx.arc(it.x - 4, it.y - 1, 1.8, 0, Math.PI * 2);
        ctx.arc(it.x + 4, it.y - 1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const pulse = 1 + Math.sin(now / 160 + it.x) * 0.12;
      const r = it.r * pulse;
      const glow = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, r * 2.4);
      const core = it.kind === "gold" ? "#f59e0b" : "#fbbf24";
      glow.addColorStop(0, core);
      glow.addColorStop(0.35, it.kind === "gold" ? "rgba(245,158,11,0.5)" : "rgba(251,191,36,0.45)");
      glow.addColorStop(1, "rgba(251,191,36,0)");
      ctx.beginPath();
      ctx.arc(it.x, it.y, r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(it.x, it.y, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = it.kind === "gold" ? "#fbbf24" : "#fde68a";
      ctx.fill();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      s.elapsed += dt;

      const remain = Math.max(0, Math.ceil(DURATION - s.elapsed));
      if (remain !== s.lastTickSecond) {
        s.lastTickSecond = remain;
        setTimeLeft(remain);
      }
      if (s.elapsed >= DURATION) {
        finish("time");
        return;
      }
      if (s.lives <= 0) {
        finish("lives");
        return;
      }

      // 世界卷动：速度随时间爬升
      const speed = Math.min(235, 120 + s.elapsed * 3.0);
      s.distance += speed * dt;
      const total = s.pickup + Math.floor(s.distance / 100);
      if (total !== s.score) {
        s.score = total;
        setScore(total);
      }

      // 生成障碍与物品
      s.barAcc += dt;
      if (s.barAcc >= 1.15) {
        s.barAcc = 0;
        spawnBar();
      }
      s.itemAcc += dt;
      if (s.itemAcc >= 0.8) {
        s.itemAcc = 0;
        spawnItem();
      }

      // 障碍随世界下移
      for (const b of s.bars) b.y += speed * dt;
      s.bars = s.bars.filter((b) => b.y < H + 30);

      // 玩家 2D 移动：方向键优先，其次指针跟随（目标点 = 她的身体中心）
      let vx = 0;
      let vy = 0;
      const keyActive = s.keys.left || s.keys.right || s.keys.up || s.keys.down;
      if (keyActive) {
        vx = (s.keys.right ? KEY_SPEED : 0) - (s.keys.left ? KEY_SPEED : 0);
        vy = (s.keys.down ? KEY_SPEED : 0) - (s.keys.up ? KEY_SPEED : 0);
      } else if (s.pointerSeen) {
        const dx = s.targetX - s.px;
        const dy = s.targetY - (s.py - 30);
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          const sp = Math.min(POINTER_SPEED, dist * 9);
          vx = (dx / dist) * sp;
          vy = (dy / dist) * sp;
        }
      }
      s.vx = vx;
      s.px += vx * dt;
      s.py += vy * dt;
      s.px = Math.max(22, Math.min(W - 22, s.px));
      s.py = Math.max(PLAYER_BOX_H + 8, Math.min(H - 4, s.py));

      // 障碍碰撞（AABB，按最小穿透轴推出）：从下方撞上 = 被拦住并被带着
      // 往下走，沿障碍下沿横滑就能绕到缺口；从上方落下 = 站上障碍顶面。
      s.blocked = false;
      for (const b of s.bars) {
        const left = s.px - PLAYER_HALF_W;
        const right = s.px + PLAYER_HALF_W;
        const top = s.py - PLAYER_BOX_H;
        const bottom = s.py;
        if (right <= b.x || left >= b.x + b.w || bottom <= b.y || top >= b.y + BAR_T) continue;
        const penLeft = right - b.x;
        const penRight = b.x + b.w - left;
        const penTop = bottom - b.y;
        const penBottom = b.y + BAR_T - top;
        const min = Math.min(penLeft, penRight, penTop, penBottom);
        if (min === penTop) {
          s.py = b.y; // 站上顶面，随障碍下行（下一帧障碍移动会继续判定）
        } else if (min === penBottom) {
          s.py = b.y + BAR_T + PLAYER_BOX_H; // 被拦在下方
          s.blocked = true;
        } else if (min === penLeft) {
          s.px = b.x - PLAYER_HALF_W;
        } else {
          s.px = b.x + b.w + PLAYER_HALF_W;
        }
      }
      // 被顶出画面下沿 → 扣命复活（无敌期间不复判）
      if (s.py > H + 14 && now > s.invUntil) {
        hurt(now, s.px, H - 26);
        if (s.lives > 0) respawn();
      }

      // 背景
      const dark = document.documentElement.classList.contains("dark");
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      if (dark) {
        bg.addColorStop(0, "#1c1917");
        bg.addColorStop(1, "#292524");
      } else {
        bg.addColorStop(0, "#fafaf9");
        bg.addColorStop(1, "#f5efe3");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      // 卷动光点（速度感）
      ctx.fillStyle = dark ? "rgba(231,229,228,0.35)" : "rgba(168,162,158,0.5)";
      for (const d of s.dots) {
        const y = (d.y0 + s.distance * d.f) % (H + 8);
        ctx.beginPath();
        ctx.arc(d.x, y - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 障碍（石板墙：顶边天蓝、下沿压暗、两端加深收口，读起来是一堵墙）
      for (const b of s.bars) {
        ctx.fillStyle = dark ? "#44403c" : "#d6d3d1";
        ctx.fillRect(b.x, b.y, b.w, BAR_T);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(b.x, b.y, b.w, 3);
        ctx.fillStyle = dark ? "rgba(0,0,0,0.35)" : "rgba(120,113,108,0.4)";
        ctx.fillRect(b.x, b.y + BAR_T - 2, b.w, 2);
        ctx.fillStyle = dark ? "#292524" : "#a8a29e";
        ctx.fillRect(b.x, b.y, 3, BAR_T);
        ctx.fillRect(b.x + b.w - 3, b.y, 3, BAR_T);
      }

      // 物品更新与绘制（随世界下移；与慕斯身体中心判碰撞）
      const centerY = s.py - 30;
      s.items = s.items.filter((it) => {
        it.y += speed * it.spd * dt;
        const dx = it.x - s.px;
        const dy2 = it.y - centerY;
        if (dx * dx + dy2 * dy2 < 30 * 30) {
          if (it.kind === "bomb") {
            if (now <= s.invUntil) return false; // 无敌期间炸弹直接穿过
            hurt(now, it.x, it.y - 10);
          } else if (it.kind === "ink") {
            s.pickup = Math.max(0, s.pickup - 20);
            s.popups.push({ x: it.x, y: it.y - 10, text: "-20", color: "#f87171", born: now });
          } else {
            const gain = it.kind === "gold" ? 30 : 10;
            s.pickup += gain;
            s.popups.push({
              x: it.x,
              y: it.y - 10,
              text: `+${gain}`,
              color: it.kind === "gold" ? "#f59e0b" : "#d97706",
              born: now,
            });
          }
          return false;
        }
        if (it.y > H + 20) return false;
        drawItem(it, now);
        return true;
      });

      drawPlayer(now);

      // 受击红闪
      if (s.hurtAt) {
        const a = 0.32 - (now - s.hurtAt) / 900;
        if (a > 0) {
          ctx.fillStyle = `rgba(220, 38, 38, ${a.toFixed(3)})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // 得分浮字
      s.popups = s.popups.filter((p) => now - p.born < 700);
      for (const p of s.popups) {
        const age = (now - p.born) / 700;
        ctx.globalAlpha = 1 - age;
        ctx.fillStyle = p.color;
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y - age * 26);
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // 指针控制（平面位置：横纵都跟）
  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const s = stateRef.current;
    s.targetX = ((e.clientX - rect.left) / rect.width) * W;
    s.targetY = ((e.clientY - rect.top) / rect.height) * H;
    s.pointerSeen = true;
  };

  // 方向键（含 WASD）
  useEffect(() => {
    if (phase !== "playing") return;
    const set = (e: KeyboardEvent, v: boolean) => {
      const k = stateRef.current.keys;
      if (e.key === "ArrowLeft" || e.key === "a") k.left = v;
      if (e.key === "ArrowRight" || e.key === "d") k.right = v;
      if (e.key === "ArrowUp" || e.key === "w") k.up = v;
      if (e.key === "ArrowDown" || e.key === "s") k.down = v;
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  if (phase === "closed") return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={() => setPhase("closed")}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl w-[min(440px,94vw)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-xl text-stone-900 dark:text-stone-100">{t("title")}</h2>
          <button
            onClick={() => setPhase("closed")}
            aria-label={t("close")}
            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer text-lg"
          >
            ×
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tracking-wider uppercase text-stone-500 dark:text-stone-400 mb-2">
          <span>
            {t("scoreLabel")} <span className="text-stone-900 dark:text-stone-100 font-semibold">{score}</span>
          </span>
          <span>
            {t("timeLabel")} <span className="text-stone-900 dark:text-stone-100 font-semibold">{timeLeft}{t("secondsUnit")}</span>
          </span>
          <span>
            {t("livesLabel")} <span className="text-red-500 tracking-normal">{"♥".repeat(lives)}{"♡".repeat(Math.max(0, 3 - lives))}</span>
          </span>
          <span className="ml-auto">
            {t("bestLabel")} <span className="text-stone-900 dark:text-stone-100 font-semibold">{best}</span>
          </span>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full block border border-stone-200 dark:border-stone-700"
            style={{ touchAction: "none", aspectRatio: `${W}/${H}` }}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
          />
          {phase === "ready" && (
            <div className="absolute inset-0 bg-white/85 dark:bg-stone-900/85 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{t("howTo")}</p>
              <button
                onClick={startGame}
                className="bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-6 py-2.5 text-xs tracking-wider uppercase font-medium cursor-pointer hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
              >
                {t("start")}
              </button>
            </div>
          )}
          {phase === "over" && (
            <div className="absolute inset-0 bg-white/85 dark:bg-stone-900/85 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="font-serif text-2xl text-stone-900 dark:text-stone-100">{overReason === "lives" ? t("gameOverLives") : t("gameOver")}</p>
              <p className="text-sm text-stone-600 dark:text-stone-300">
                {t("finalScore")} <span className="font-semibold text-stone-900 dark:text-stone-100">{score}</span>
                {isNewRecord && <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">{t("newRecord")}</span>}
              </p>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={startGame}
                  className="bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-5 py-2.5 text-xs tracking-wider uppercase font-medium cursor-pointer hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
                >
                  {t("again")}
                </button>
                <button
                  onClick={() => setPhase("closed")}
                  className="px-5 py-2.5 text-xs tracking-wider uppercase font-medium text-stone-500 dark:text-stone-400 cursor-pointer hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  {t("close")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
