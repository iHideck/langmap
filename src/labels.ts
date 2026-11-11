// 画面の文言と、地域・語族・文字の名前（日本語と英語）

export type Locale = "ja" | "en";
export type Label = Record<Locale, string>;

export const AREAS: Record<string, Label> = {
  "east-asia": { ja: "東アジア", en: "East Asia" },
  "southeast-asia": { ja: "東南アジア", en: "Southeast Asia" },
  "south-asia": { ja: "南アジア", en: "South Asia" },
  europe: { ja: "ヨーロッパ", en: "Europe" },
  eurasia: { ja: "ロシア・中央アジア・コーカサス", en: "Russia, Central Asia, Caucasus" },
  "middle-east": { ja: "中東・北アフリカ", en: "Middle East, North Africa" },
  africa: { ja: "アフリカ", en: "Africa" },
};

export const AREA_ORDER = Object.keys(AREAS);

export const FAMILIES: Record<string, Label> = {
  albanian: { ja: "アルバニア語派", en: "Albanian" },
  armenian: { ja: "アルメニア語派", en: "Armenian" },
  atlantic: { ja: "大西洋諸語", en: "Atlantic" },
  austroasiatic: { ja: "オーストロアジア語族", en: "Austroasiatic" },
  austronesian: { ja: "オーストロネシア語族", en: "Austronesian" },
  baltic: { ja: "バルト語派", en: "Baltic" },
  bantu: { ja: "バントゥー諸語", en: "Bantu" },
  basque: { ja: "孤立した言語（バスク語）", en: "Isolate (Basque)" },
  berber: { ja: "ベルベル諸語", en: "Berber" },
  celtic: { ja: "ケルト語派", en: "Celtic" },
  chadic: { ja: "チャド諸語", en: "Chadic" },
  creole: { ja: "クレオール言語", en: "Creole" },
  cushitic: { ja: "クシ諸語", en: "Cushitic" },
  dravidian: { ja: "ドラヴィダ語族", en: "Dravidian" },
  germanic: { ja: "ゲルマン語派", en: "Germanic" },
  gur: { ja: "グル諸語", en: "Gur" },
  hellenic: { ja: "ギリシア語派", en: "Hellenic" },
  "indo-aryan": { ja: "インド・アーリア語派", en: "Indo-Aryan" },
  iranian: { ja: "イラン語派", en: "Iranian" },
  japonic: { ja: "日本語族", en: "Japonic" },
  kartvelian: { ja: "カルトヴェリ語族", en: "Kartvelian" },
  koreanic: { ja: "朝鮮語族", en: "Koreanic" },
  "kra-dai": { ja: "タイ・カダイ語族", en: "Kra–Dai" },
  kwa: { ja: "クワ諸語", en: "Kwa" },
  mande: { ja: "マンデ諸語", en: "Mande" },
  mongolic: { ja: "モンゴル語族", en: "Mongolic" },
  nilotic: { ja: "ナイル諸語", en: "Nilotic" },
  "northeast-caucasian": { ja: "北東コーカサス語族", en: "Northeast Caucasian" },
  "northwest-caucasian": { ja: "北西コーカサス語族", en: "Northwest Caucasian" },
  plateau: { ja: "プラトー諸語", en: "Plateau" },
  romance: { ja: "ロマンス語派", en: "Romance" },
  semitic: { ja: "セム語派", en: "Semitic" },
  sinitic: { ja: "シナ語派", en: "Sinitic" },
  slavic: { ja: "スラヴ語派", en: "Slavic" },
  "tibeto-burman": { ja: "チベット・ビルマ語派", en: "Tibeto-Burman" },
  turkic: { ja: "テュルク語族", en: "Turkic" },
  uralic: { ja: "ウラル語族", en: "Uralic" },
  "volta-niger": { ja: "ボルタ・ニジェール諸語", en: "Volta–Niger" },
};

export const SCRIPTS: Record<string, Label> = {
  Arab: { ja: "アラビア文字", en: "Arabic" },
  Armn: { ja: "アルメニア文字", en: "Armenian" },
  Beng: { ja: "ベンガル文字", en: "Bengali" },
  Cyrl: { ja: "キリル文字", en: "Cyrillic" },
  Deva: { ja: "デーヴァナーガリー", en: "Devanagari" },
  Ethi: { ja: "エチオピア文字", en: "Ethiopic" },
  Geor: { ja: "ジョージア文字", en: "Georgian" },
  Grek: { ja: "ギリシア文字", en: "Greek" },
  Gujr: { ja: "グジャラート文字", en: "Gujarati" },
  Guru: { ja: "グルムキー文字", en: "Gurmukhi" },
  Hani: { ja: "漢字", en: "Han" },
  Hebr: { ja: "ヘブライ文字", en: "Hebrew" },
  Jpan: { ja: "漢字・かな", en: "Kanji and kana" },
  Khmr: { ja: "クメール文字", en: "Khmer" },
  Knda: { ja: "カンナダ文字", en: "Kannada" },
  Kore: { ja: "ハングル・漢字", en: "Hangul" },
  Laoo: { ja: "ラーオ文字", en: "Lao" },
  Latn: { ja: "ラテン文字", en: "Latin" },
  Mlym: { ja: "マラヤーラム文字", en: "Malayalam" },
  Mtei: { ja: "マイテイ・マエク", en: "Meetei Mayek" },
  Mymr: { ja: "ミャンマー文字", en: "Myanmar" },
  Nkoo: { ja: "ンコ文字", en: "N'Ko" },
  Olck: { ja: "オル・チキ文字", en: "Ol Chiki" },
  Orya: { ja: "オリヤー文字", en: "Odia" },
  Sinh: { ja: "シンハラ文字", en: "Sinhala" },
  Tale: { ja: "タイ・レ文字", en: "Tai Le" },
  Taml: { ja: "タミル文字", en: "Tamil" },
  Telu: { ja: "テルグ文字", en: "Telugu" },
  Tfng: { ja: "ティフィナグ文字", en: "Tifinagh" },
  Thaa: { ja: "ターナ文字", en: "Thaana" },
  Thai: { ja: "タイ文字", en: "Thai" },
  Tibt: { ja: "チベット文字", en: "Tibetan" },
};

/** 文字ごとの代表の字。文字の見本帳に出す */
export const SCRIPT_GLYPHS: Record<string, string> = {
  Latn: "Aa",
  Cyrl: "Жж",
  Arab: "ع",
  Deva: "अ",
  Hani: "漢",
  Mymr: "မ",
  Beng: "অ",
  Hebr: "א",
  Geor: "ა",
  Ethi: "ሀ",
  Knda: "ಕ",
  Tibt: "ཀ",
  Grek: "Ωω",
  Taml: "த",
  Thai: "ก",
  Armn: "Աա",
  Jpan: "あ",
  Kore: "한",
  Telu: "త",
  Gujr: "ગ",
  Mlym: "മ",
  Guru: "ਗ",
  Orya: "ଓ",
  Sinh: "ස",
  Khmr: "ក",
  Laoo: "ກ",
  Olck: "ᱚ",
  Mtei: "ꯃ",
  Thaa: "ދ",
  Tale: "ᥖ",
  Tfng: "ⵜ",
  Nkoo: "ߒ",
};

export const LEVELS: Record<string, Label> = {
  beginner: { ja: "初級", en: "Beginner" },
  intermediate: { ja: "中級", en: "Intermediate" },
  advanced: { ja: "上級", en: "Advanced" },
};

const UI = {
  tagline: {
    ja: "世界の {n} の言語を、話されている地域の地図と一緒に",
    en: "{n} of the world's languages, mapped where they are spoken",
  },
  search: { ja: "言語の名前で探す（日本語・英語・コード）", en: "Search by name or code" },
  all: { ja: "すべて", en: "All" },
  allFamilies: { ja: "すべての語族", en: "All families" },
  allScripts: { ja: "すべての文字", en: "All scripts" },
  count: { ja: "{n} 言語", en: "{n} languages" },
  inCountry: { ja: "{country} で話される言語", en: "Languages of {country}" },
  clearCountry: { ja: "国の絞り込みを外す", en: "Clear country" },
  mapHint: {
    ja: "国を押すと、その国で話される言語に絞り込めます",
    en: "Tap a country to see the languages spoken there",
  },
  legendNote: {
    ja: "色は地域、濃いほど話される言語が多い",
    en: "Colored by area; darker means more languages",
  },
  statScripts: { ja: "文字", en: "scripts" },
  statFamilies: { ja: "語族・語派", en: "families" },
  statCountries: { ja: "国と地域", en: "countries and regions" },
  scriptsTitle: { ja: "文字から探す", en: "Browse by script" },
  scriptsHint: {
    ja: "字を押すと、その文字で書く言語に絞り込めます",
    en: "Tap a script to see the languages written in it",
  },
  surprise: { ja: "おまかせ", en: "Surprise me" },
  surpriseHint: { ja: "絞り込んだ言語から 1 つを開く", en: "Open a random language from this list" },
  noResults: { ja: "当てはまる言語がありません", en: "No languages match" },
  back: { ja: "← 一覧へ", en: "← All languages" },
  spokenIn: { ja: "話されている地域", en: "Where it is spoken" },
  script: { ja: "文字", en: "Script" },
  family: { ja: "語族・語派", en: "Family" },
  area: { ja: "地域", en: "Area" },
  level: { ja: "languessr の難易度", en: "Level in languessr" },
  tip: { ja: "見分け方のコツ", en: "How to recognize it" },
  clues: { ja: "目印", en: "Clues" },
  examples: { ja: "本文の例", en: "Sample text" },
  examplesNotice: {
    ja: "本文は Wikipedia の記事から抜粋したものです（CC BY-SA 4.0）。",
    en: "Excerpts from Wikipedia articles (CC BY-SA 4.0).",
  },
  countries: { ja: "国・地域", en: "Countries" },
  partOf: { ja: "一部", en: "part" },
  sameFamily: { ja: "同じ語族・語派の言語", en: "Same family" },
  neighbors: { ja: "同じ国で話される言語", en: "Spoken in the same countries" },
  mapLabel: { ja: "{name} が話されている地域の地図", en: "Map of where {name} is spoken" },
  worldLabel: { ja: "国ごとの言語の数の世界地図", en: "World map of languages per country" },
  languages: { ja: "言語", en: "languages" },
  zoomIn: { ja: "拡大", en: "Zoom in" },
  zoomOut: { ja: "縮小", en: "Zoom out" },
  zoomReset: { ja: "元の大きさに戻す", en: "Reset zoom" },
  zoomHint: {
    ja: "ホイール・ピンチ・ダブルクリックで拡大縮小、ドラッグで移動できます",
    en: "Scroll, pinch or double-click to zoom; drag to move",
  },
  theme: { ja: "表示の明るさを切り替える", en: "Toggle light or dark" },
  credit: {
    ja: "言語データ: languessr ／ 国境: iHideck/geojson（Made with Natural Earth）／ 州・省の境: Natural Earth",
    en: "Language data: languessr / Countries: iHideck/geojson (Made with Natural Earth) / Subdivisions: Natural Earth",
  },
  disclaimer: {
    ja: "地図の境界は法的な境界を示しません。塗った範囲は、その言語が主に話される所の目安です。",
    en: "Boundaries have no legal status. Shaded areas show roughly where each language is mainly spoken.",
  },
} satisfies Record<string, Label>;

export type UiKey = keyof typeof UI;

export function t(locale: Locale, key: UiKey, vars: Record<string, string | number> = {}): string {
  return UI[key][locale].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}

export function label(table: Record<string, Label>, key: string, locale: Locale): string {
  return table[key]?.[locale] ?? key;
}
