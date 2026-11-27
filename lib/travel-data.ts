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
  // 排序专用日期（可选）：date 是显示字符串（如合集只显示到月 "2025-12"），
  // 排序位置需要另定真值时填 sortDate（完整 YYYY-MM-DD）；不填则按 date 排。
  sortDate?: string;
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
  {
    id: "shikoku-jan-2026",
    date: "2026-01-12",
    title: "四国的一月：从金刀比罗宫到道后温泉",
    cover: getImageUrl("shikoku2026Jan/p02.jpg"),
    photos: [
      { src: getImageUrl("shikoku2026Jan/p01.jpg"), desc: "金刀比罗宫石灯笼", prefecture: "kagawa", place: { cn: "香川县琴平町", jp: "香川県琴平町", en: "Kotohira, Kagawa" } },
      { src: getImageUrl("shikoku2026Jan/p02.jpg"), desc: "銭形砂絵", prefecture: "kagawa", place: { cn: "香川县观音寺市", jp: "香川県観音寺市", en: "Kan'onji, Kagawa" } },
      { src: getImageUrl("shikoku2026Jan/p03.jpg"), desc: "呆呆兽井盖", prefecture: "kagawa", place: { cn: "香川县琴平町", jp: "香川県琴平町", en: "Kotohira, Kagawa" } },
      { src: getImageUrl("shikoku2026Jan/p04.jpg"), desc: "桂滨小神社", prefecture: "kochi", place: { cn: "高知县高知市", jp: "高知県高知市", en: "Kochi City, Kochi" } },
      { src: getImageUrl("shikoku2026Jan/p05.jpg"), desc: "大鸣门桥通道", prefecture: "tokushima", place: { cn: "德岛县鸣门市", jp: "徳島県鳴門市", en: "Naruto, Tokushima" } },
      { src: getImageUrl("shikoku2026Jan/p06.jpg"), desc: "阿波舞照片", prefecture: "tokushima", place: { cn: "德岛县德岛市", jp: "徳島県徳島市", en: "Tokushima City, Tokushima" } },
      { src: getImageUrl("shikoku2026Jan/p07.jpg"), desc: "梅津寺手帕", prefecture: "ehime", place: { cn: "爱媛县松山市", jp: "愛媛県松山市", en: "Matsuyama, Ehime" } },
      { src: getImageUrl("shikoku2026Jan/p08.jpg"), desc: "柑橘汁试饮", prefecture: "ehime", place: { cn: "爱媛县松山市", jp: "愛媛県松山市", en: "Matsuyama, Ehime" } },
      { src: getImageUrl("shikoku2026Jan/p09.jpg"), desc: "人力车吉祥物", prefecture: "ehime", place: { cn: "爱媛县松山市", jp: "愛媛県松山市", en: "Matsuyama, Ehime" } },
      { src: getImageUrl("shikoku2026Jan/p10.jpg"), desc: "三色团子", prefecture: "ehime", place: { cn: "爱媛县松山市", jp: "愛媛県松山市", en: "Matsuyama, Ehime" } },
    ]
  },
  {
    id: "fukushima-jul-2026",
    date: "2026-07-26",
    title: "福岛的七月：传承馆与震灾遗构",
    cover: getImageUrl("fukushima2026Jul/p01.jpg"),
    photos: [
      { src: getImageUrl("fukushima2026Jul/p01.jpg"), desc: "手绘鲤鱼旗", prefecture: "fukushima", place: { cn: "福岛县双叶町", jp: "福島県双葉町", en: "Futaba, Fukushima" } },
      { src: getImageUrl("fukushima2026Jul/p02.jpg"), desc: "标语牌", prefecture: "fukushima", place: { cn: "福岛县双叶町", jp: "福島県双葉町", en: "Futaba, Fukushima" } },
      { src: getImageUrl("fukushima2026Jul/p03.jpg"), desc: "线量显示屏", prefecture: "fukushima", place: { cn: "福岛县双叶町", jp: "福島県双葉町", en: "Futaba, Fukushima" } },
      { src: getImageUrl("fukushima2026Jul/p04.jpg"), desc: "遗构教室", prefecture: "fukushima", place: { cn: "福岛县浪江町", jp: "福島県浪江町", en: "Namie, Fukushima" } },
      { src: getImageUrl("fukushima2026Jul/p05.jpg"), desc: "路边花坛", prefecture: "fukushima", place: { cn: "福岛县", jp: "福島県", en: "Fukushima" } },
      { src: getImageUrl("fukushima2026Jul/p06.jpg"), desc: "纯米吟酿爱姬", prefecture: "fukushima", place: { cn: "福岛县三春町", jp: "福島県三春町", en: "Miharu, Fukushima" } },
      { src: getImageUrl("fukushima2026Jul/p07.jpg"), desc: "喜多方拉面", prefecture: "fukushima", place: { cn: "福岛县喜多方市", jp: "福島県喜多方市", en: "Kitakata, Fukushima" } },
    ]
  },
  {
    id: "autumn-dec-2025",
    date: "2025-12",
    sortDate: "2025-11-30",
    title: "赏秋合集：芦之湖、昭和纪念公园与日立海滨公园",
    cover: getImageUrl("autumn2025Dec/p07.jpg"),
    photos: [
      { src: getImageUrl("autumn2025Dec/p01.jpg"), desc: "芦之湖黄昏", prefecture: "kanagawa", place: { cn: "神奈川县箱根町", jp: "神奈川県箱根町", en: "Hakone, Kanagawa" } },
      { src: getImageUrl("autumn2025Dec/p02.jpg"), desc: "芦之湖小艇", prefecture: "kanagawa", place: { cn: "神奈川县箱根町", jp: "神奈川県箱根町", en: "Hakone, Kanagawa" } },
      { src: getImageUrl("autumn2025Dec/p03.jpg"), desc: "芦之湖海盗船", prefecture: "kanagawa", place: { cn: "神奈川县箱根町", jp: "神奈川県箱根町", en: "Hakone, Kanagawa" } },
      { src: getImageUrl("autumn2025Dec/p04.jpg"), desc: "芒草原", prefecture: "tokyo", place: { cn: "东京都立川市", jp: "東京都立川市", en: "Tachikawa, Tokyo" } },
      { src: getImageUrl("autumn2025Dec/p05.jpg"), desc: "芒草穗", prefecture: "tokyo", place: { cn: "东京都立川市", jp: "東京都立川市", en: "Tachikawa, Tokyo" } },
      { src: getImageUrl("autumn2025Dec/p06.jpg"), desc: "银杏墙", prefecture: "tokyo", place: { cn: "东京都立川市", jp: "東京都立川市", en: "Tachikawa, Tokyo" } },
      { src: getImageUrl("autumn2025Dec/p07.jpg"), desc: "透光红叶", prefecture: "tokyo", place: { cn: "东京都立川市", jp: "東京都立川市", en: "Tachikawa, Tokyo" } },
      { src: getImageUrl("autumn2025Dec/p08.jpg"), desc: "飘落的银杏叶", prefecture: "tokyo", place: { cn: "东京都立川市", jp: "東京都立川市", en: "Tachikawa, Tokyo" } },
      { src: getImageUrl("autumn2025Dec/p09.jpg"), desc: "远望富士山", prefecture: "tokyo", place: { cn: "东京都立川市", jp: "東京都立川市", en: "Tachikawa, Tokyo" } },
      { src: getImageUrl("autumn2025Dec/p10.jpg"), desc: "摩天轮与蒲苇", prefecture: "ibaraki", place: { cn: "茨城县常陆那珂市", jp: "茨城県ひたちなか市", en: "Hitachinaka, Ibaraki" } },
      { src: getImageUrl("autumn2025Dec/p11.jpg"), desc: "彼岸花", prefecture: "ibaraki", place: { cn: "茨城县常陆那珂市", jp: "茨城県ひたちなか市", en: "Hitachinaka, Ibaraki" } },
      { src: getImageUrl("autumn2025Dec/p12.jpg"), desc: "坡上望海", prefecture: "ibaraki", place: { cn: "茨城县常陆那珂市", jp: "茨城県ひたちなか市", en: "Hitachinaka, Ibaraki" } },
    ]
  },
  {
    id: "kawagoe-oct-2026",
    date: "2026-10-19",
    title: "川越祭之夜：山车、灯笼与狐面舞者",
    cover: getImageUrl("kawagoe2026Oct/p02.jpg"),
    photos: [
      { src: getImageUrl("kawagoe2026Oct/p01.jpg"), desc: "狐面舞者派糖", prefecture: "saitama", place: { cn: "埼玉县川越市", jp: "埼玉県川越市", en: "Kawagoe, Saitama" } },
      { src: getImageUrl("kawagoe2026Oct/p02.jpg"), desc: "两台山车交会", prefecture: "saitama", place: { cn: "埼玉县川越市", jp: "埼玉県川越市", en: "Kawagoe, Saitama" } },
      { src: getImageUrl("kawagoe2026Oct/p03.jpg"), desc: "冰川神社灯笼", prefecture: "saitama", place: { cn: "埼玉县川越市", jp: "埼玉県川越市", en: "Kawagoe, Saitama" } },
      { src: getImageUrl("kawagoe2026Oct/p04.jpg"), desc: "日本武尊山车的白狐", prefecture: "saitama", place: { cn: "埼玉县川越市", jp: "埼玉県川越市", en: "Kawagoe, Saitama" } },
      { src: getImageUrl("kawagoe2026Oct/p05.jpg"), desc: "葫芦灯", prefecture: "saitama", place: { cn: "埼玉县川越市", jp: "埼玉県川越市", en: "Kawagoe, Saitama" } },
    ]
  },
  {
    id: "chugoku-jul-2025",
    date: "2025-07-27",
    title: "山阴・山阳之旅：宍道湖的兔子、出云大社与鸟取沙丘",
    cover: getImageUrl("chugoku2025Jul/p01.jpg"),
    photos: [
      { src: getImageUrl("chugoku2025Jul/p01.jpg"), desc: "湖岸的兔子剪影", prefecture: "shimane", place: { cn: "岛根县松江市", jp: "島根県松江市", en: "Matsue, Shimane" } },
      { src: getImageUrl("chugoku2025Jul/p02.jpg"), desc: "宍道湖畔的铜兔", prefecture: "shimane", place: { cn: "岛根县松江市", jp: "島根県松江市", en: "Matsue, Shimane" } },
      { src: getImageUrl("chugoku2025Jul/p03.jpg"), desc: "出云大社的石兔", prefecture: "shimane", place: { cn: "岛根县出云市", jp: "島根県出雲市", en: "Izumo, Shimane" } },
      { src: getImageUrl("chugoku2025Jul/p04.jpg"), desc: "大注连绳", prefecture: "shimane", place: { cn: "岛根县出云市", jp: "島根県出雲市", en: "Izumo, Shimane" } },
      { src: getImageUrl("chugoku2025Jul/p05.jpg"), desc: "沙丘上遛狗", prefecture: "tottori", place: { cn: "鸟取县鸟取市", jp: "鳥取県鳥取市", en: "Tottori, Tottori" } },
      { src: getImageUrl("chugoku2025Jul/p06.jpg"), desc: "沙丘日出", prefecture: "tottori", place: { cn: "鸟取县鸟取市", jp: "鳥取県鳥取市", en: "Tottori, Tottori" } },
      { src: getImageUrl("chugoku2025Jul/p07.jpg"), desc: "清晨的沙丘棱线", prefecture: "tottori", place: { cn: "鸟取县鸟取市", jp: "鳥取県鳥取市", en: "Tottori, Tottori" } },
      { src: getImageUrl("chugoku2025Jul/p08.jpg"), desc: "八岐大蛇沙雕", prefecture: "tottori", place: { cn: "鸟取县鸟取市", jp: "鳥取県鳥取市", en: "Tottori, Tottori" } },
      { src: getImageUrl("chugoku2025Jul/p09.jpg"), desc: "西瓜柯南", prefecture: "tottori", place: { cn: "鸟取县北荣町", jp: "鳥取県北栄町", en: "Hokuei, Tottori" } },
      { src: getImageUrl("chugoku2025Jul/p10.jpg"), desc: "超级白兔号", prefecture: "tottori", place: { cn: "鸟取县鸟取市", jp: "鳥取県鳥取市", en: "Tottori, Tottori" } },
      { src: getImageUrl("chugoku2025Jul/p11.jpg"), desc: "鸟取和牛", prefecture: "tottori", place: { cn: "鸟取县鸟取市", jp: "鳥取県鳥取市", en: "Tottori, Tottori" } },
      { src: getImageUrl("chugoku2025Jul/p12.jpg"), desc: "姬路城", prefecture: "hyogo", place: { cn: "兵库县姬路市", jp: "兵庫県姫路市", en: "Himeji, Hyogo" } },
      { src: getImageUrl("chugoku2025Jul/p13.jpg"), desc: "车站大道尽头的姬路城", prefecture: "hyogo", place: { cn: "兵库县姬路市", jp: "兵庫県姫路市", en: "Himeji, Hyogo" } },
      { src: getImageUrl("chugoku2025Jul/p14.jpg"), desc: "仓敷川游船", prefecture: "okayama", place: { cn: "冈山县仓敷市", jp: "岡山県倉敷市", en: "Kurashiki, Okayama" } },
      { src: getImageUrl("chugoku2025Jul/p15.jpg"), desc: "后乐园望乌城", prefecture: "okayama", place: { cn: "冈山县冈山市", jp: "岡山県岡山市", en: "Okayama, Okayama" } },
      { src: getImageUrl("chugoku2025Jul/p16.jpg"), desc: "晒太阳的乌龟", prefecture: "okayama", place: { cn: "冈山县冈山市", jp: "岡山県岡山市", en: "Okayama, Okayama" } },
    ]
  },
];

export const getAllTrips = () => {
  return [...trips].sort((a, b) => new Date(b.sortDate ?? b.date).getTime() - new Date(a.sortDate ?? a.date).getTime());
};

export const getTripById = (id: string) => trips.find(t => t.id === id);