export interface Photo {
  src: string;
  desc: string; // 开发参考用，实际显示将由 JSON 接管
  // 拍摄地（看图猜县 + 地图集章用，2026-11-14 依据三语说明逐张标注；
  // prefecture = lib/prefectures.ts 的 id；place = 县市短标签，供答题揭晓显示）
  prefecture: string;
  place: { cn: string; jp: string; en: string };
  // 语义标签（语言无关的概念 id，如 "onsen"）：照片「本体」是什么，而不是说明里
  // 顺带提到的词。search_photos 用它区分本体命中与字面命中——如别府双地狱是
  // 温泉本体，而温泉蛋只是菜里顺带出现的词（2026-11-19 站长反馈后加）。
  tags?: string[];
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
      { src: getImageUrl("tohoku2026Feb/p13.jpg"), desc: "苹果JR标牌", prefecture: "aomori", place: { cn: "青森・弘前", jp: "青森・弘前", en: "Aomori · Hirosaki" } },
      { src: getImageUrl("tohoku2026Feb/p14.jpg"), desc: "暖炉列车烤鱿鱼", prefecture: "aomori", place: { cn: "青森・津轻", jp: "青森・津軽", en: "Aomori · Tsugaru" } },
      { src: getImageUrl("tohoku2026Feb/p16.jpg"), desc: "岩木山雾凇", prefecture: "aomori", place: { cn: "青森・岩木山", jp: "青森・岩木山", en: "Aomori · Mt. Iwaki" } },
      { src: getImageUrl("tohoku2026Feb/tazawako.jpg"), desc: "辰子像", prefecture: "akita", place: { cn: "秋田县仙北市", jp: "秋田県仙北市", en: "Semboku, Akita" } },
      { src: getImageUrl("tohoku2026Feb/namahageentry.jpg"), desc: "生剥鬼下山", prefecture: "akita", place: { cn: "秋田县男鹿市", jp: "秋田県男鹿市", en: "Oga, Akita" } },
      { src: getImageUrl("tohoku2026Feb/namahagebudai.jpg"), desc: "生剥鬼舞台", prefecture: "akita", place: { cn: "秋田县男鹿市", jp: "秋田県男鹿市", en: "Oga, Akita" } },
      { src: getImageUrl("tohoku2026Feb/kamakurasaikishi.jpg"), desc: "雪屋祭俯瞰", prefecture: "akita", place: { cn: "秋田县横手市", jp: "秋田県横手市", en: "Yokote, Akita" } },
      { src: getImageUrl("tohoku2026Feb/kamakurasaiyoru.jpg"), desc: "雪屋祭夜景", prefecture: "akita", place: { cn: "秋田县横手市", jp: "秋田県横手市", en: "Yokote, Akita" } },
      { src: getImageUrl("tohoku2026Feb/moriokahachiman.jpg"), desc: "盛冈八幡宫", prefecture: "iwate", place: { cn: "岩手县盛冈市", jp: "岩手県盛岡市", en: "Morioka, Iwate" } },
      { src: getImageUrl("tohoku2026Feb/moriokareimen.jpg"), desc: "盛冈冷面", prefecture: "iwate", place: { cn: "岩手县盛冈市", jp: "岩手県盛岡市", en: "Morioka, Iwate" } },
      { src: getImageUrl("tohoku2026Feb/wanko.jpg"), desc: "100碗挑战", prefecture: "iwate", place: { cn: "岩手县盛冈市", jp: "岩手県盛岡市", en: "Morioka, Iwate" } },
      { src: getImageUrl("tohoku2026Feb/p15.jpg"), desc: "山居仓库夜景", prefecture: "yamagata", place: { cn: "山形・酒田", jp: "山形・酒田", en: "Yamagata · Sakata" } },
    ]
  },
  {
    id: "kyushu-may-2026",
    date: "2026-05-11",
    title: "九州纪行：从关门海峡到樱岛",
    cover: getImageUrl("kyushu2026May/p15.jpg"),
    photos: [
      { src: getImageUrl("kyushu2026May/p15.jpg"), desc: "旧丰后森机关库", prefecture: "oita", place: { cn: "大分县玖珠町", jp: "大分県玖珠町", en: "Kusu, Oita" } },
      { src: getImageUrl("kyushu2026May/p17.jpg"), desc: "血之池地狱", prefecture: "oita", place: { cn: "大分县别府市", jp: "大分県別府市", en: "Beppu, Oita" }, tags: ["onsen"] },
      { src: getImageUrl("kyushu2026May/p16.jpg"), desc: "海地狱", prefecture: "oita", place: { cn: "大分县别府市", jp: "大分県別府市", en: "Beppu, Oita" }, tags: ["onsen"] },
      { src: getImageUrl("kyushu2026May/p18.jpg"), desc: "地狱蒸", prefecture: "oita", place: { cn: "大分县别府市", jp: "大分県別府市", en: "Beppu, Oita" } },
      { src: getImageUrl("kyushu2026May/p14.jpg"), desc: "巨人纪念石", prefecture: "oita", place: { cn: "大分县日田市", jp: "大分県日田市", en: "Hita, Oita" } },
      { src: getImageUrl("kyushu2026May/p23.jpg"), desc: "赤间神宫", prefecture: "yamaguchi", place: { cn: "山口县下关市", jp: "山口県下関市", en: "Shimonoseki, Yamaguchi" } },
      { src: getImageUrl("kyushu2026May/p10.jpg"), desc: "关门大桥", prefecture: "yamaguchi", place: { cn: "山口县下关市", jp: "山口県下関市", en: "Shimonoseki, Yamaguchi" } },
      { src: getImageUrl("kyushu2026May/p11.jpg"), desc: "门司港地啤", prefecture: "fukuoka", place: { cn: "福冈县北九州市", jp: "福岡県北九州市", en: "Kitakyushu, Fukuoka" } },
      { src: getImageUrl("kyushu2026May/p13.jpg"), desc: "宫地岳神社夕阳", prefecture: "fukuoka", place: { cn: "福冈县福津市", jp: "福岡県福津市", en: "Fukutsu, Fukuoka" } },
      { src: getImageUrl("kyushu2026May/p12.jpg"), desc: "宫地岳留言石", prefecture: "fukuoka", place: { cn: "福冈县福津市", jp: "福岡県福津市", en: "Fukutsu, Fukuoka" } },
      { src: getImageUrl("kyushu2026May/p08.jpg"), desc: "祐德稻荷神社", prefecture: "saga", place: { cn: "佐贺县鹿岛市", jp: "佐賀県鹿島市", en: "Kashima, Saga" } },
      { src: getImageUrl("kyushu2026May/p09.jpg"), desc: "武雄市图书馆", prefecture: "saga", place: { cn: "佐贺县武雄市", jp: "佐賀県武雄市", en: "Takeo, Saga" } },
      { src: getImageUrl("kyushu2026May/p07.jpg"), desc: "佐贺牛", prefecture: "saga", place: { cn: "佐贺县", jp: "佐賀県", en: "Saga" } },
      { src: getImageUrl("kyushu2026May/p06.jpg"), desc: "二十六圣人纪念馆", prefecture: "nagasaki", place: { cn: "长崎县长崎市", jp: "長崎県長崎市", en: "Nagasaki City, Nagasaki" } },
      { src: getImageUrl("kyushu2026May/p02.jpg"), desc: "大浦天主堂", prefecture: "nagasaki", place: { cn: "长崎县长崎市", jp: "長崎県長崎市", en: "Nagasaki City, Nagasaki" } },
      { src: getImageUrl("kyushu2026May/p03.jpg"), desc: "长崎孔子庙", prefecture: "nagasaki", place: { cn: "长崎县长崎市", jp: "長崎県長崎市", en: "Nagasaki City, Nagasaki" } },
      { src: getImageUrl("kyushu2026May/p04.jpg"), desc: "长崎电车", prefecture: "nagasaki", place: { cn: "长崎县长崎市", jp: "長崎県長崎市", en: "Nagasaki City, Nagasaki" } },
      { src: getImageUrl("kyushu2026May/p05.jpg"), desc: "平和祈念像", prefecture: "nagasaki", place: { cn: "长崎县长崎市", jp: "長崎県長崎市", en: "Nagasaki City, Nagasaki" } },
      { src: getImageUrl("kyushu2026May/p01.jpg"), desc: "茄子番茄面", prefecture: "nagasaki", place: { cn: "长崎县长崎市", jp: "長崎県長崎市", en: "Nagasaki City, Nagasaki" } },
      { src: getImageUrl("kyushu2026May/p20.jpg"), desc: "太阳之丘日南", prefecture: "miyazaki", place: { cn: "宫崎县日南市", jp: "宮崎県日南市", en: "Nichinan, Miyazaki" } },
      { src: getImageUrl("kyushu2026May/p19.jpg"), desc: "宫崎海岸", prefecture: "miyazaki", place: { cn: "宫崎县", jp: "宮崎県", en: "Miyazaki" } },
      { src: getImageUrl("kyushu2026May/p21.jpg"), desc: "樱岛", prefecture: "kagoshima", place: { cn: "鹿儿岛县鹿儿岛市", jp: "鹿児島県鹿児島市", en: "Kagoshima City, Kagoshima" } },
      { src: getImageUrl("kyushu2026May/p22.jpg"), desc: "黑猪丼", prefecture: "kagoshima", place: { cn: "鹿儿岛县鹿儿岛市", jp: "鹿児島県鹿児島市", en: "Kagoshima City, Kagoshima" } },
    ]
  },
];

export const getAllTrips = () => {
  return [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getTripById = (id: string) => trips.find(t => t.id === id);