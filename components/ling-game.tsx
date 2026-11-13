"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 慕斯向前冲：45 秒一局的竖版卷轴小游戏（站长 2026-11-13 定稿，倒置版
// 「是男人就下一百层」）。画面自动向下卷动——慕斯在往前（上）冲，玩家只
// 能左右移动：落在横杆上会被带着往下走，必须在横杆沉到底前挪开；画面
// 最底部是整排地刺，碰到扣 1 点生命并弹回半空（1.6 秒无敌）。空中还有
// 光点（+10）/金色（+30）/墨团（−20）/炸弹（−1 生命），冲过的距离也计分。
// 纯前端 canvas，最高分存 localStorage，无后端、不吃聊天配额。
// 打开方式：window 事件 "ling:open-game"（桌宠气泡、Lab 页卡片派发）。
// 主角形象：桌宠同款慕斯抠图 /muse-pet/look.webp，加载失败时回退白团子。
const W = 400;
const H = 460;
const DURATION = 45;
const BEST_KEY = "ling_game_best";
const SPIKE_H = 34;
const CRUISE_Y = 292; // 自由状态下脚底回到的巡航高度
const RISE_SPEED = 112; // 自由状态下朝巡航高度回位的速度（px/s）
const PLAYER_H = 62;

type ItemKind = "mote" | "gold" | "ink" | "bomb";
type Item = { x: number; y: number; spd: number; r: number; kind: ItemKind };
type Popup = { x: number; y: number; text: string; color: string; born: number };
type Bar = { x: number; w: number; y: number };
type Phase = "closed" | "ready" | "playing" | "over";
const BAR_T = 13;

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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef({
    items: [] as Item[],
    popups: [] as Popup[],
    bars: [] as Bar[],
    dots: [] as { x: number; y0: number; f: number }[],
    playerX: W / 2,
    targetX: W / 2,
    feetY: CRUISE_Y,
    standing: null as Bar | null,
    keys: { left: false, right: false },
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
    const img = new Image();
    img.src = "/muse-pet/look.webp";
    img.onload = () => {
      imgRef.current = img;
    };
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
      playerX: W / 2,
      targetX: W / 2,
      feetY: CRUISE_Y,
      standing: null,
      keys: { left: false, right: false },
      barAcc: 0.55, // 第一根横杆稍晚一点出现
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

    const spawnBar = () => {
      const w = 110 + Math.random() * 90;
      s.bars.push({ x: 6 + Math.random() * (W - w - 12), w, y: -BAR_T - 2 });
    };

    const spawnItem = () => {
      const roll = Math.random();
      const kind: ItemKind = roll < 0.12 ? "gold" : roll < 0.28 ? "bomb" : roll < 0.46 ? "ink" : "mote";
      s.items.push({
        x: 24 + Math.random() * (W - 48),
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

    const drawOrbFallback = (cx: number, cy: number, now: number) => {
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
      void now;
    };

    const drawPlayer = (now: number) => {
      const img = imgRef.current;
      const inv = now < s.invUntil;
      const blinkOff = inv && Math.floor(now / 110) % 2 === 0;
      const tilt = Math.max(-0.14, Math.min(0.14, (s.targetX - s.playerX) * 0.0016));
      const bob = s.standing ? 0 : Math.sin(now / 240) * 1.6;
      ctx.save();
      ctx.translate(s.playerX, s.feetY + bob);
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
        drawOrbFallback(0, -26, now);
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
      const speed = Math.min(240, 125 + s.elapsed * 3.2);
      s.distance += speed * dt;
      const total = s.pickup + Math.floor(s.distance / 100);
      if (total !== s.score) {
        s.score = total;
        setScore(total);
      }

      // 生成横杆与物品
      s.barAcc += dt;
      if (s.barAcc >= 1.05) {
        s.barAcc = 0;
        spawnBar();
      }
      s.itemAcc += dt;
      if (s.itemAcc >= 0.8) {
        s.itemAcc = 0;
        spawnItem();
      }

      // 横杆随世界下移
      for (const b of s.bars) b.y += speed * dt;
      if (s.standing && s.standing.y > H + 24) s.standing = null;
      s.bars = s.bars.filter((b) => b.y < H + 24);

      // 玩家左右移动
      if (s.keys.left) s.targetX -= 340 * dt;
      if (s.keys.right) s.targetX += 340 * dt;
      s.targetX = Math.max(20, Math.min(W - 20, s.targetX));
      s.playerX += (s.targetX - s.playerX) * Math.min(1, dt * 14);

      // 玩家纵向：站在横杆上随杆下行；离开杆沿 → 自由回位巡航高度；途中可落杆
      if (s.standing) {
        const b = s.standing;
        if (s.playerX < b.x - 12 || s.playerX > b.x + b.w + 12) {
          s.standing = null;
        } else {
          s.feetY = b.y;
        }
      }
      if (!s.standing) {
        const dy = CRUISE_Y - s.feetY;
        const step = Math.max(-RISE_SPEED * dt, Math.min(RISE_SPEED * dt, dy));
        s.feetY += step;
        for (const b of s.bars) {
          if (
            s.playerX > b.x - 12 &&
            s.playerX < b.x + b.w + 12 &&
            s.feetY >= b.y &&
            s.feetY <= b.y + 18
          ) {
            s.standing = b;
            s.feetY = b.y;
            break;
          }
        }
      }

      // 地刺：脚底扎进刺区 → 扣命并弹回半空
      if (s.feetY >= H - SPIKE_H + 12 && now > s.invUntil) {
        hurt(now, s.playerX, H - SPIKE_H - 8);
        s.standing = null;
        s.feetY = 186;
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

      // 横杆（石板 + 天蓝顶边）
      for (const b of s.bars) {
        ctx.fillStyle = dark ? "#44403c" : "#d6d3d1";
        ctx.fillRect(b.x, b.y, b.w, BAR_T);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(b.x, b.y, b.w, 3);
        ctx.fillStyle = dark ? "rgba(231,229,228,0.25)" : "rgba(120,113,108,0.35)";
        ctx.fillRect(b.x, b.y + BAR_T - 2, b.w, 2);
      }

      // 物品更新与绘制（随世界下移；与慕斯身体中心判碰撞）
      const centerY = s.feetY - 30;
      s.items = s.items.filter((it) => {
        it.y += speed * it.spd * dt;
        const dx = it.x - s.playerX;
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

      // 底部地刺
      const spikeTop = H - SPIKE_H;
      const danger = ctx.createLinearGradient(0, spikeTop - 12, 0, spikeTop);
      danger.addColorStop(0, "rgba(220,38,38,0)");
      danger.addColorStop(1, "rgba(220,38,38,0.13)");
      ctx.fillStyle = danger;
      ctx.fillRect(0, spikeTop - 12, W, 12);
      ctx.fillStyle = dark ? "#78716c" : "#57534e";
      ctx.beginPath();
      ctx.moveTo(0, H);
      const tooth = 16;
      for (let x = 0; x < W; x += tooth) {
        ctx.lineTo(x + tooth / 2, spikeTop);
        ctx.lineTo(x + tooth, H);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dark ? "#a8a29e" : "#292524";
      ctx.fillRect(0, H - 3, W, 3);

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

  // 指针控制（只取横向位置）
  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    stateRef.current.targetX = ((e.clientX - rect.left) / rect.width) * W;
  };

  // 方向键
  useEffect(() => {
    if (phase !== "playing") return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") stateRef.current.keys.left = true;
      if (e.key === "ArrowRight") stateRef.current.keys.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight") stateRef.current.keys.right = false;
    };
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
