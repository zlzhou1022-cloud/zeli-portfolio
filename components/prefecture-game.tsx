"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import japan from "@svg-maps/japan";
import { PREFECTURES, getPrefecture, type Prefecture } from "@/lib/prefectures";
import { getAllTrips } from "@/lib/travel-data";

// 看图猜县 + 日本地图集章（2026-11-14，站长定方向、慕斯主持）：
// - 猜县：从旅行相册的照片里随机出题（照片的拍摄县在 lib/travel-data.ts 里
//   逐张标好），四选一，干扰项优先同地方的县；答对给该县盖章。
// - 集章两层：①地图底色是站长的制霸图鉴（47 县全到访，lib/prefectures.ts）；
//   ②访客自己的章存 localStorage（muse_stamps），答对一县亮一县。
// - 地图用 @svg-maps/japan 的真实县界 SVG，location id 与主数据 slug 一一对应。
// - 台词全是 messages 的预写文案（PrefectureGame 命名空间），不耗 LLM 额度。
const STAMPS_KEY = "muse_stamps";

type Loc = "cn" | "jp" | "en";

interface FlatPhoto {
  tripId: string;
  n: number; // 相册内 1 起的序号（与 Trips 文案 key 对应）
  src: string;
  pref: string;
  place: Record<Loc, string>;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomFrom(arr: string[]): string {
  return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : "";
}

function makeOptions(answerId: string): string[] {
  const answer = getPrefecture(answerId);
  if (!answer) return [answerId];
  const sameRegion = PREFECTURES.filter((p) => p.region === answer.region && p.id !== answerId);
  const others = PREFECTURES.filter((p) => p.region !== answer.region && p.id !== answerId);
  const distractors = [...shuffle(sameRegion).slice(0, 3)];
  for (const p of shuffle(others)) {
    if (distractors.length >= 3) break;
    distractors.push(p);
  }
  return shuffle([answerId, ...distractors.map((p) => p.id)]);
}

export function PrefectureGame() {
  const t = useTranslations("PrefectureGame");
  const tt = useTranslations("Trips");
  const localeRaw = useLocale();
  const loc: Loc = localeRaw === "cn" || localeRaw === "jp" ? localeRaw : "en";

  const allPhotos = useMemo<FlatPhoto[]>(
    () =>
      getAllTrips().flatMap((trip) =>
        trip.photos.map((ph, i) => ({
          tripId: trip.id,
          n: i + 1,
          src: ph.src,
          pref: ph.prefecture,
          place: ph.place,
        })),
      ),
    [],
  );
  const photosByPref = useMemo(() => {
    const m = new Map<string, FlatPhoto[]>();
    for (const ph of allPhotos) {
      const list = m.get(ph.pref) ?? [];
      list.push(ph);
      m.set(ph.pref, list);
    }
    return m;
  }, [allPhotos]);

  const [tab, setTab] = useState<"quiz" | "map">("quiz");
  const [ready, setReady] = useState(false);
  const [stamps, setStamps] = useState<string[]>([]);
  const stampsLoadedRef = useRef(false);

  const [queue, setQueue] = useState<FlatPhoto[]>([]);
  const [qi, setQi] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [line, setLine] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const prefName = (p: Prefecture) => p[loc];
  const pickLine = (key: "correctLines" | "wrongLines") => randomFrom((t.raw(key) as string[]) ?? []);

  const startRound = (photos: FlatPhoto[]) => {
    const q = shuffle(photos);
    setQueue(q);
    setQi(0);
    setCorrect(0);
    setPicked(null);
    setOptions(q.length > 0 ? makeOptions(q[0].pref) : []);
    setLine(t("introLine"));
  };

  // 挂载后读章 + 开第一轮（setTimeout 写法避开 lint 的同步 setState 规则；
  // 洗牌只在客户端做，避免 SSR 与客户端渲染不一致）
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STAMPS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed)) setStamps(parsed.filter((x) => typeof x === "string"));
        }
      } catch {
        /* 读不到就从零开始集 */
      }
      stampsLoadedRef.current = true;
      startRound(allPhotos);
      setReady(true);
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stampsLoadedRef.current) return;
    try {
      localStorage.setItem(STAMPS_KEY, JSON.stringify(stamps));
    } catch {
      /* 存不下就算了 */
    }
  }, [stamps]);

  const current = queue[qi] as FlatPhoto | undefined;
  const roundDone = ready && queue.length > 0 && qi >= queue.length;

  const onPick = (id: string) => {
    if (picked || !current) return;
    setPicked(id);
    if (id === current.pref) {
      setCorrect((c) => c + 1);
      if (!stamps.includes(current.pref)) {
        setStamps((s) => [...s, current.pref]);
        setLine(t("stampLine"));
      } else {
        setLine(pickLine("correctLines"));
      }
    } else {
      setLine(pickLine("wrongLines"));
    }
  };

  const onNext = () => {
    const next = qi + 1;
    setQi(next);
    setPicked(null);
    if (next < queue.length) setOptions(makeOptions(queue[next].pref));
  };

  const quizPref = (id: string) => {
    const photos = photosByPref.get(id);
    if (!photos || photos.length === 0) return;
    setTab("quiz");
    startRound(photos);
  };

  const fillFor = (id: string) =>
    stamps.includes(id)
      ? "fill-amber-400 dark:fill-amber-500"
      : photosByPref.has(id)
        ? "fill-sky-300 dark:fill-sky-600"
        : "fill-stone-200 dark:fill-stone-700";
  const selectedPref = selected ? getPrefecture(selected) : undefined;
  const selectedPhotos = selected ? (photosByPref.get(selected) ?? []) : [];

  return (
    <div className="space-y-8">
      {/* 慕斯主持席 */}
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/muse-pet/look.webp" alt="" className="w-14 h-14 object-cover object-top shrink-0" />
        <div className="relative rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm px-4 py-3">
          <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-100">
            {tab === "quiz" ? line || t("introLine") : t("mapHint")}
          </p>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex gap-2">
        {(["quiz", "map"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border cursor-pointer transition-colors ${
              tab === k
                ? "bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 border-stone-900 dark:border-stone-100"
                : "border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900"
            }`}
          >
            {k === "quiz" ? t("tabQuiz") : t("tabMap")}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-stone-500 dark:text-stone-400">
          {t("scoreLine", {
            n: Math.min(qi + 1, Math.max(queue.length, 1)),
            correct,
            stamps: stamps.length,
            total: PREFECTURES.length,
          })}
        </span>
      </div>

      {tab === "quiz" && (
        <div>
          {!ready ? (
            <p className="text-sm text-stone-400 py-16 text-center">…</p>
          ) : roundDone ? (
            <div className="border border-stone-200 dark:border-stone-800 px-6 py-12 text-center space-y-4">
              <p className="text-2xl font-serif text-stone-900 dark:text-stone-100">{t("roundEnd")}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {correct} / {queue.length} · {stamps.length} / {PREFECTURES.length}
              </p>
              <button
                onClick={() => startRound(allPhotos)}
                className="bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-5 py-2 text-sm font-medium cursor-pointer hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
              >
                {t("again")}
              </button>
            </div>
          ) : current ? (
            <div className="space-y-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.src}
                alt=""
                className="w-full aspect-[4/3] object-cover border border-stone-200 dark:border-stone-800"
              />
              <p className="text-lg font-serif text-stone-900 dark:text-stone-100">{t("question")}</p>
              <div className="grid grid-cols-2 gap-3">
                {options.map((id) => {
                  const p = getPrefecture(id);
                  if (!p) return null;
                  const isAnswer = picked !== null && id === current.pref;
                  const isPickedWrong = picked === id && id !== current.pref;
                  return (
                    <button
                      key={id}
                      onClick={() => onPick(id)}
                      disabled={picked !== null}
                      className={`px-4 py-3 border text-left text-base cursor-pointer transition-colors disabled:cursor-default ${
                        isAnswer
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-medium"
                          : isPickedWrong
                            ? "border-red-400 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                            : "border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-100 hover:bg-amber-50 dark:hover:bg-stone-900"
                      }`}
                    >
                      {prefName(p)}
                      <span className="block text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                        {t(`regions.${p.region}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <div className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 px-5 py-4 space-y-1.5">
                  <p className="text-sm text-stone-800 dark:text-stone-100">
                    <span className="text-stone-400 dark:text-stone-500 mr-2">{t("answerLabel")}</span>
                    <span className="font-medium">{current.place[loc]}</span>
                    {stamps.includes(current.pref) && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400 text-xs">{t("stampedBadge")}</span>
                    )}
                  </p>
                  {(() => {
                    const caption = tt(`${current.tripId}.photos.${current.n}`);
                    return caption && !caption.includes(".photos.") ? (
                      <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{caption}</p>
                    ) : null;
                  })()}
                  <div className="flex items-center gap-4 pt-1">
                    <Link
                      href={`/${loc}/travels/${current.tripId}?p=${current.n}`}
                      className="text-xs text-sky-700 dark:text-sky-300 hover:underline"
                    >
                      {t("viewTrip")}
                    </Link>
                    <button
                      onClick={onNext}
                      className="ml-auto bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-1.5 text-xs font-medium cursor-pointer hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
                    >
                      {t("next")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {tab === "map" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 bg-stone-200 dark:bg-stone-700 border border-stone-300 dark:border-stone-600" />
              {t("legendVisited")} 47 / 47
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 bg-sky-300 dark:bg-sky-600 border border-stone-300 dark:border-stone-600" />
              {t("legendPhoto")} {photosByPref.size}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 bg-amber-400 dark:bg-amber-500 border border-stone-300 dark:border-stone-600" />
              {t("legendStamped")} {stamps.length} / 47
            </span>
          </div>

          <svg viewBox={japan.viewBox} className="w-full max-w-xl mx-auto" role="group" aria-label="Japan">
            {japan.locations.map((location: { id: string; name: string; path: string }) => (
              <path
                key={location.id}
                d={location.path}
                onClick={() => setSelected(location.id)}
                className={`${fillFor(location.id)} stroke-white dark:stroke-stone-900 cursor-pointer hover:opacity-75 transition-opacity ${
                  selected === location.id ? "stroke-amber-700 dark:stroke-amber-300" : ""
                }`}
                style={{ strokeWidth: selected === location.id ? 1.6 : 0.7 }}
              >
                <title>{getPrefecture(location.id)?.[loc] ?? location.name}</title>
              </path>
            ))}
          </svg>

          {selectedPref && (
            <div className="border border-stone-200 dark:border-stone-800 px-5 py-4 space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100">{prefName(selectedPref)}</h3>
                <span className="text-xs text-stone-400 dark:text-stone-500">
                  {selectedPref.jp} · {selectedPref.en} · {t(`regions.${selectedPref.region}`)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                  {t("zeliBadge")}
                </span>
                <span className="px-2 py-1 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                  {selectedPhotos.length > 0 ? t("photoBadge", { count: selectedPhotos.length }) : t("noPhotoBadge")}
                </span>
                <span
                  className={`px-2 py-1 border ${
                    stamps.includes(selectedPref.id)
                      ? "border-amber-400 text-amber-700 dark:text-amber-300"
                      : "border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400"
                  }`}
                >
                  {stamps.includes(selectedPref.id) ? t("stampedBadge") : t("notStampedBadge")}
                </span>
                {selectedPhotos.length > 0 && (
                  <button
                    onClick={() => quizPref(selectedPref.id)}
                    className="px-2 py-1 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-medium cursor-pointer hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
                  >
                    {t("playThisPref")}
                  </button>
                )}
              </div>
              {selectedPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedPhotos.map((ph) => (
                    <Link key={`${ph.tripId}-${ph.n}`} href={`/${loc}/travels/${ph.tripId}?p=${ph.n}`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ph.src}
                        alt={ph.place[loc]}
                        className="w-24 h-16 object-cover border border-stone-200 dark:border-stone-800 hover:opacity-85 transition-opacity"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
