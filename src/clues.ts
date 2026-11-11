// 本文の例の中の目印（languessr の clues）と、見分けにくい言語
import { countriesOf, type Language } from "./data";

/** 本文の区切り。hit は目印に当たる所 */
export interface Segment {
  text: string;
  hit: boolean;
}

type Range = [start: number, end: number];

const WORD = String.raw`[\p{L}\p{M}\p{N}]`;
const WORD_HEAD = new RegExp(`^${WORD}+`, "u");
const WORD_TAIL = new RegExp(`${WORD}+$`, "u");
const APOSTROPHES = "['’‘ʻʼ]";
// 字を離して書く文字。ほかの文字（アラビア文字・デーヴァナーガリーなど）は字をつなげて書くので、語の途中で色を切らず、当たった所を語全体に広げる
const SEPARATE_SCRIPTS = new Set(["Latn", "Cyrl", "Grek", "Armn", "Geor", "Hebr", "Ethi", "Hani", "Jpan", "Kore"]);
const LEVEL_ORDER: readonly Language["level"][] = ["beginner", "intermediate", "advanced"];
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** 目印をそのままの文字列として当てる。アポストロフィは、どの書き方のアポストロフィにも当てる */
function literal(clue: string): string {
  return clue.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(new RegExp(APOSTROPHES, "gu"), APOSTROPHES);
}

/** words の書き方。x は語全体、x- は語の頭、-x は語の尾に当てる */
function wordPattern(word: string): string {
  const head = word.endsWith("-");
  const tail = word.startsWith("-");
  const core = literal(word.slice(tail ? 1 : 0, head ? -1 : undefined));
  return `${tail ? `(?<=${WORD})` : `(?<!${WORD})`}${core}${head ? `(?=${WORD})` : `(?!${WORD})`}`;
}

/** 当たった所の端が語の文字で、その外側も語の文字なら、語の端まで広げる */
function toWord(text: string, [start, end]: Range): Range {
  const hit = text.slice(start, end);
  if (WORD_HEAD.test(hit)) start -= WORD_TAIL.exec(text.slice(0, start))?.[0].length ?? 0;
  if (WORD_TAIL.test(hit)) end += WORD_HEAD.exec(text.slice(end))?.[0].length ?? 0;
  return [start, end];
}

/** 本文を、目印に当たる所とそれ以外に分ける。全ての text をつなぐと、元の本文に戻る */
export function markClues(text: string, language: Pick<Language, "clues" | "script">): Segment[] {
  const { letters = [], words = [] } = language.clues ?? {};
  const joined = !SEPARATE_SCRIPTS.has(language.script);
  const bounds = new Set([text.length, ...Array.from(graphemes.segment(text), (g) => g.index)]);
  const ranges: Range[] = [];
  for (const pattern of [...letters.map(literal), ...words.map(wordPattern)]) {
    // 先読みの中で当てると、重なる当たり（aaa の中の aa など）も全て拾える
    for (const m of text.matchAll(new RegExp(`(?=(${pattern}))`, "giu"))) {
      const found: Range = [m.index, m.index + m[1].length];
      let [start, end] = joined ? toWord(text, found) : found;
      while (!bounds.has(start)) start--;
      while (!bounds.has(end)) end++;
      ranges.push([start, end]);
    }
  }

  const merged: Range[] = [];
  for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  const segments: Segment[] = [];
  let at = 0;
  for (const [start, end] of merged) {
    if (start > at) segments.push({ text: text.slice(at, start), hit: false });
    segments.push({ text: text.slice(start, end), hit: true });
    at = end;
  }
  if (at < text.length) segments.push({ text: text.slice(at), hit: false });
  return segments;
}

/** 見分けにくい言語。同じ文字で近い言語を先に、limit 個まで */
export function confusables(language: Language, languages: Language[], limit = 4): Language[] {
  const countries = new Set(countriesOf(language));
  const candidates = languages.flatMap((other) => {
    if (other === language) return [];
    const sameScript = other.script === language.script;
    const sameFamily = other.family === language.family;
    const sameCountry = countriesOf(other).some((c) => countries.has(c));
    const sameArea = other.area === language.area;
    // ラテン文字でない言語は、同じ地域の、ラテン文字でない別の文字の言語とも見分けにくい（タイ語とラーオ語など）
    const near = sameScript
      ? sameFamily || sameCountry || sameArea
      : sameArea && language.script !== "Latn" && other.script !== "Latn";
    return near ? [{ other, sameScript, sameFamily, sameCountry, sameArea }] : [];
  });
  const trueFirst = (a: boolean, b: boolean) => Number(b) - Number(a);
  return candidates
    .sort(
      (a, b) =>
        trueFirst(a.sameScript, b.sameScript) ||
        trueFirst(a.sameFamily, b.sameFamily) ||
        LEVEL_ORDER.indexOf(a.other.level) - LEVEL_ORDER.indexOf(b.other.level) ||
        trueFirst(a.sameCountry, b.sameCountry) ||
        trueFirst(a.sameArea, b.sameArea),
    )
    .slice(0, limit)
    .map((c) => c.other);
}
