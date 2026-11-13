// 都道府县主数据（看图猜县 + 日本地图集章的地基，2026-11-14 建）。
// id = 英文 slug（与照片数据 Photo.prefecture 对应）；code = JIS 县代码 1–47。
// visitedByZeli：站长的制霸记录（47 县全访问，站长本人陈述）。
// 县名三语为标准译名；地方（region）按通用的八地方划分。

export type RegionId =
  | "hokkaido"
  | "tohoku"
  | "kanto"
  | "chubu"
  | "kinki"
  | "chugoku"
  | "shikoku"
  | "kyushu";

export interface Prefecture {
  id: string;
  code: number;
  jp: string;
  cn: string;
  en: string;
  region: RegionId;
  visitedByZeli: boolean;
}

type P = [string, string, string, string, RegionId];

const RAW: P[] = [
  ["hokkaido", "北海道", "北海道", "Hokkaido", "hokkaido"],
  ["aomori", "青森県", "青森县", "Aomori", "tohoku"],
  ["iwate", "岩手県", "岩手县", "Iwate", "tohoku"],
  ["miyagi", "宮城県", "宫城县", "Miyagi", "tohoku"],
  ["akita", "秋田県", "秋田县", "Akita", "tohoku"],
  ["yamagata", "山形県", "山形县", "Yamagata", "tohoku"],
  ["fukushima", "福島県", "福岛县", "Fukushima", "tohoku"],
  ["ibaraki", "茨城県", "茨城县", "Ibaraki", "kanto"],
  ["tochigi", "栃木県", "栃木县", "Tochigi", "kanto"],
  ["gunma", "群馬県", "群马县", "Gunma", "kanto"],
  ["saitama", "埼玉県", "埼玉县", "Saitama", "kanto"],
  ["chiba", "千葉県", "千叶县", "Chiba", "kanto"],
  ["tokyo", "東京都", "东京都", "Tokyo", "kanto"],
  ["kanagawa", "神奈川県", "神奈川县", "Kanagawa", "kanto"],
  ["niigata", "新潟県", "新潟县", "Niigata", "chubu"],
  ["toyama", "富山県", "富山县", "Toyama", "chubu"],
  ["ishikawa", "石川県", "石川县", "Ishikawa", "chubu"],
  ["fukui", "福井県", "福井县", "Fukui", "chubu"],
  ["yamanashi", "山梨県", "山梨县", "Yamanashi", "chubu"],
  ["nagano", "長野県", "长野县", "Nagano", "chubu"],
  ["gifu", "岐阜県", "岐阜县", "Gifu", "chubu"],
  ["shizuoka", "静岡県", "静冈县", "Shizuoka", "chubu"],
  ["aichi", "愛知県", "爱知县", "Aichi", "chubu"],
  ["mie", "三重県", "三重县", "Mie", "kinki"],
  ["shiga", "滋賀県", "滋贺县", "Shiga", "kinki"],
  ["kyoto", "京都府", "京都府", "Kyoto", "kinki"],
  ["osaka", "大阪府", "大阪府", "Osaka", "kinki"],
  ["hyogo", "兵庫県", "兵库县", "Hyogo", "kinki"],
  ["nara", "奈良県", "奈良县", "Nara", "kinki"],
  ["wakayama", "和歌山県", "和歌山县", "Wakayama", "kinki"],
  ["tottori", "鳥取県", "鸟取县", "Tottori", "chugoku"],
  ["shimane", "島根県", "岛根县", "Shimane", "chugoku"],
  ["okayama", "岡山県", "冈山县", "Okayama", "chugoku"],
  ["hiroshima", "広島県", "广岛县", "Hiroshima", "chugoku"],
  ["yamaguchi", "山口県", "山口县", "Yamaguchi", "chugoku"],
  ["tokushima", "徳島県", "德岛县", "Tokushima", "shikoku"],
  ["kagawa", "香川県", "香川县", "Kagawa", "shikoku"],
  ["ehime", "愛媛県", "爱媛县", "Ehime", "shikoku"],
  ["kochi", "高知県", "高知县", "Kochi", "shikoku"],
  ["fukuoka", "福岡県", "福冈县", "Fukuoka", "kyushu"],
  ["saga", "佐賀県", "佐贺县", "Saga", "kyushu"],
  ["nagasaki", "長崎県", "长崎县", "Nagasaki", "kyushu"],
  ["kumamoto", "熊本県", "熊本县", "Kumamoto", "kyushu"],
  ["oita", "大分県", "大分县", "Oita", "kyushu"],
  ["miyazaki", "宮崎県", "宫崎县", "Miyazaki", "kyushu"],
  ["kagoshima", "鹿児島県", "鹿儿岛县", "Kagoshima", "kyushu"],
  ["okinawa", "沖縄県", "冲绳县", "Okinawa", "kyushu"],
];

export const PREFECTURES: Prefecture[] = RAW.map(([id, jp, cn, en, region], i) => ({
  id,
  code: i + 1,
  jp,
  cn,
  en,
  region,
  visitedByZeli: true,
}));

export const getPrefecture = (id: string) => PREFECTURES.find((p) => p.id === id);
