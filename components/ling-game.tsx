"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 接光点小游戏：45 秒一局。拖动/方向键移动底部的小灵，接光点得分、躲墨团。
// 纯前端 canvas，最高分存 localStorage，无后端、不吃聊天配额。
// 打开方式：window 事件 "ling:open-game"（吉祥物气泡、Lab 页卡片派发）。
const W = 400;
const H = 460;
const DURATION = 45;
const BEST_KEY = "ling_game_best";

type ItemKind = "mote" | "gold" | "ink";
type Item = { x: number; y: number; vy: number; r: number; kind: ItemKind };
type Popup = { x: number; y: number; text: string; color: string; born: number };
type Phase = "closed" | "ready" | "playing" | "over";

export function LingGame() {
  const t = useTranslations("MiniGame");
  const [phase, setPhase] = useState<Phase>("closed");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    items: [] as Item[],
    popups: [] as Popup[],
    playerX: W / 2,
    targetX: W / 2,
    keys: { left: false, right: false },
    spawnAcc: 0,
    elapsed: 0,
    score: 0,
    lastTickSecond: DURATION,
  });

  // 打开事件
  useEffect(() => {
    const open = () => {
      setBest(Number(localStorage.getItem(BEST_KEY) ?? 0) || 0);
      setScore(0);
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
      playerX: W / 2,
      targetX: W / 2,
      keys: { left: false, right: false },
      spawnAcc: 0,
      elapsed: 0,
      score: 0,
      lastTickSecond: DURATION,
    };
    setScore(0);
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

    const spawn = () => {
      const roll = Math.random();
      const kind: ItemKind = roll < 0.14 ? "gold" : roll < 0.34 ? "ink" : "mote";
      const base = 135 + s.elapsed * 4.5;
      s.items.push({
        x: 24 + Math.random() * (W - 48),
        y: -16,
        vy: base * (0.85 + Math.random() * 0.4),
        r: kind === "mote" ? 9 : kind === "gold" ? 11 : 12,
        kind,
      });
    };

    const drawOrb = (x: number, y: number, now: number) => {
      const bob = Math.sin(now / 300) * 2;
      const g = ctx.createRadialGradient(x, y + bob - 6, 4, x, y + bob, 24);
      g.addColorStop(0, "#fffdf5");
      g.addColorStop(0.55, "#ffedb8");
      g.addColorStop(1, "#ffd98a");
      ctx.beginPath();
      ctx.arc(x, y + bob, 20, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(180,130,60,0.4)";
      ctx.stroke();
      // 眼睛（朝上看落下来的光点）
      ctx.fillStyle = "#292524";
      ctx.beginPath();
      ctx.arc(x - 7, y + bob - 3, 2.6, 0, Math.PI * 2);
      ctx.arc(x + 7, y + bob - 3, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(253,164,175,0.6)";
      ctx.beginPath();
      ctx.arc(x - 12, y + bob + 4, 3.4, 0, Math.PI * 2);
      ctx.arc(x + 12, y + bob + 4, 3.4, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawItem = (it: Item, now: number) => {
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

      // 倒计时（整秒变化时才 setState）
      const remain = Math.max(0, Math.ceil(DURATION - s.elapsed));
      if (remain !== s.lastTickSecond) {
        s.lastTickSecond = remain;
        setTimeLeft(remain);
      }
      if (s.elapsed >= DURATION) {
        cancelAnimationFrame(raf);
        setScore(s.score);
        setBest((prev) => {
          if (s.score > prev) {
            localStorage.setItem(BEST_KEY, String(s.score));
            setIsNewRecord(true);
            return s.score;
          }
          return prev;
        });
        setPhase("over");
        return;
      }

      // 玩家移动：键盘优先，其次平滑跟随目标点
      if (s.keys.left) s.targetX -= 340 * dt;
      if (s.keys.right) s.targetX += 340 * dt;
      s.targetX = Math.max(22, Math.min(W - 22, s.targetX));
      s.playerX += (s.targetX - s.playerX) * Math.min(1, dt * 14);

      // 生成
      s.spawnAcc += dt;
      const interval = Math.max(0.34, 0.55 - s.elapsed * 0.005);
      if (s.spawnAcc >= interval) {
        s.spawnAcc = 0;
        spawn();
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
      // 地面线
      ctx.strokeStyle = dark ? "rgba(231,229,228,0.18)" : "rgba(120,113,108,0.25)";
      ctx.beginPath();
      ctx.moveTo(0, H - 22);
      ctx.lineTo(W, H - 22);
      ctx.stroke();

      // 物品更新与绘制
      const playerY = H - 46;
      s.items = s.items.filter((it) => {
        it.y += it.vy * dt;
        const caught =
          it.y > playerY - 26 && it.y < playerY + 16 && Math.abs(it.x - s.playerX) < 30;
        if (caught) {
          if (it.kind === "ink") {
            s.score = Math.max(0, s.score - 20);
            s.popups.push({ x: it.x, y: it.y - 10, text: "-20", color: "#f87171", born: now });
          } else {
            const gain = it.kind === "gold" ? 30 : 10;
            s.score += gain;
            s.popups.push({
              x: it.x,
              y: it.y - 10,
              text: `+${gain}`,
              color: it.kind === "gold" ? "#f59e0b" : "#d97706",
              born: now,
            });
          }
          setScore(s.score);
          return false;
        }
        if (it.y > H + 20) return false;
        drawItem(it, now);
        return true;
      });

      drawOrb(s.playerX, playerY, now);

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

  // 指针控制
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

        <div className="flex items-center gap-4 text-xs tracking-wider uppercase text-stone-500 dark:text-stone-400 mb-2">
          <span>
            {t("scoreLabel")} <span className="text-stone-900 dark:text-stone-100 font-semibold">{score}</span>
          </span>
          <span>
            {t("timeLabel")} <span className="text-stone-900 dark:text-stone-100 font-semibold">{timeLeft}{t("secondsUnit")}</span>
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
              <p className="font-serif text-2xl text-stone-900 dark:text-stone-100">{t("gameOver")}</p>
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
