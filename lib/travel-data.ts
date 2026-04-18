export interface Photo {
  src: string;
  desc: string; // 开发参考用，实际显示将由 JSON 接管
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
      { src: getImageUrl("tohoku2026Feb/appleshrine.jpg"), desc: "苹果神社" },
      { src: getImageUrl("tohoku2026Feb/afactory.jpg"), desc: "A-factory" },
      { src: getImageUrl("tohoku2026Feb/nebuta.jpg"), desc: "睡魔面部" },
      { src: getImageUrl("tohoku2026Feb/stationstuff.jpg"), desc: "弘南铁道" },
      { src: getImageUrl("tohoku2026Feb/tazawako.jpg"), desc: "辰子像" },
      { src: getImageUrl("tohoku2026Feb/namahageentry.jpg"), desc: "生剥鬼下山" },
      { src: getImageUrl("tohoku2026Feb/namahagebudai.jpg"), desc: "生剥鬼舞台" },
      { src: getImageUrl("tohoku2026Feb/kamakurasaikishi.jpg"), desc: "雪屋祭俯瞰" },
      { src: getImageUrl("tohoku2026Feb/kamakurasaiyoru.jpg"), desc: "雪屋祭夜景" },
      { src: getImageUrl("tohoku2026Feb/moriokahachiman.jpg"), desc: "盛冈八幡宫" },
      { src: getImageUrl("tohoku2026Feb/moriokreimen.jpg"), desc: "盛冈冷面" },
      { src: getImageUrl("tohoku2026Feb/wanko.jpg"), desc: "100碗挑战" },
    ]
  },
];

export const getAllTrips = () => {
  return [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getTripById = (id: string) => trips.find(t => t.id === id);