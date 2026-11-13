export interface Photo {
  src: string;
  desc: string; // 开发参考用，实际显示将由 JSON 接管
  // 拍摄地（看图猜县 + 地图集章用，2026-11-14 依据三语说明逐张标注；
  // prefecture = lib/prefectures.ts 的 id；place = 县市短标签，供答题揭晓显示）
  prefecture: string;
  place: { cn: string; jp: string; en: string };
}

export interface Trip {
  id: string;
  date: string; 
  title: string;
  cover: string;
  photos: Photo[];
}

const getImageUrl = (path: string) => `https://xvwjtmycuaplxmtgwkok.supabase.co/storage/v1/object/public/travels/${path}`;

const trips: Trip[] = [
  {
    id: "tohoku-feb-2026",
    date: "2026-02-23",
    title: "日本东北地方纪行：雪与祭典",
    cover: getImageUrl("tohoku2026Feb/appleshrine.jpg"), 
    photos: [
      { src: getImageUrl("tohoku2026Feb/appleshrine.jpg"), desc: "苹果神社", prefecture: "aomori", place: { cn: "青森县青森市", jp: "青森県青森市", en: "Aomori City, Aomori" } },
      { src: getImageUrl("tohoku2026Feb/afactory.jpg"), desc: "A-factory", prefecture: "aomori", place: { cn: "青森县青森市", jp: "青森県青森市", en: "Aomori City, Aomori" } },
      { src: getImageUrl("tohoku2026Feb/nebuta.jpg"), desc: "睡魔面部", prefecture: "aomori", place: { cn: "青森县青森市", jp: "青森県青森市", en: "Aomori City, Aomori" } },
      { src: getImageUrl("tohoku2026Feb/stationstuff.jpg"), desc: "弘南铁道", prefecture: "aomori", place: { cn: "青森县弘前市", jp: "青森県弘前市", en: "Hirosaki, Aomori" } },
      { src: getImageUrl("tohoku2026Feb/tazawako.jpg"), desc: "辰子像", prefecture: "akita", place: { cn: "秋田县仙北市", jp: "秋田県仙北市", en: "Semboku, Akita" } },
      { src: getImageUrl("tohoku2026Feb/namahageentry.jpg"), desc: "生剥鬼下山", prefecture: "akita", place: { cn: "秋田县男鹿市", jp: "秋田県男鹿市", en: "Oga, Akita" } },
      { src: getImageUrl("tohoku2026Feb/namahagebudai.jpg"), desc: "生剥鬼舞台", prefecture: "akita", place: { cn: "秋田县男鹿市", jp: "秋田県男鹿市", en: "Oga, Akita" } },
      { src: getImageUrl("tohoku2026Feb/kamakurasaikishi.jpg"), desc: "雪屋祭俯瞰", prefecture: "akita", place: { cn: "秋田县横手市", jp: "秋田県横手市", en: "Yokote, Akita" } },
      { src: getImageUrl("tohoku2026Feb/kamakurasaiyoru.jpg"), desc: "雪屋祭夜景", prefecture: "akita", place: { cn: "秋田县横手市", jp: "秋田県横手市", en: "Yokote, Akita" } },
      { src: getImageUrl("tohoku2026Feb/moriokahachiman.jpg"), desc: "盛冈八幡宫", prefecture: "iwate", place: { cn: "岩手县盛冈市", jp: "岩手県盛岡市", en: "Morioka, Iwate" } },
      { src: getImageUrl("tohoku2026Feb/moriokareimen.jpg"), desc: "盛冈冷面", prefecture: "iwate", place: { cn: "岩手县盛冈市", jp: "岩手県盛岡市", en: "Morioka, Iwate" } },
      { src: getImageUrl("tohoku2026Feb/wanko.jpg"), desc: "100碗挑战", prefecture: "iwate", place: { cn: "岩手县盛冈市", jp: "岩手県盛岡市", en: "Morioka, Iwate" } },
    ]
  },
];

export const getAllTrips = () => {
  return [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getTripById = (id: string) => trips.find(t => t.id === id);