import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { confusables, markClues, type Segment } from "./clues";
import type { Language, LanguageData } from "./data";

const data = JSON.parse(readFileSync(new URL("../public/data/languages.json", import.meta.url), "utf8")) as LanguageData;
const byCode = new Map(data.languages.map((l) => [l.code, l]));
const get = (code: string) => byCode.get(code) as Language;
const hits = (segments: Segment[]) => segments.filter((s) => s.hit).map((s) => s.text);
const codes = (languages: Language[]) => languages.map((l) => l.code);

describe("markClues", () => {
  it("全ての本文の例で、区切りをつなぐと元の本文に戻り、空の区切りが無く、当たりと外れが交互に並ぶ", () => {
    for (const l of data.languages) {
      for (const e of l.examples ?? []) {
        const segments = markClues(e.text, l);
        expect(segments.map((s) => s.text).join(""), l.code).toBe(e.text);
        segments.forEach((s, i) => {
          expect(s.text, l.code).not.toBe("");
          if (i > 0) expect(s.hit, l.code).not.toBe(segments[i - 1].hit);
        });
      }
    }
  });

  it("語の目印は、語全体のときだけ当てる（英語の the は The に当たり、theory には当たらない）", () => {
    expect(hits(markClues("The cat and the theory of", get("en")))).toEqual(["The", "and", "the", "of"]);
  });

  it("大文字にも当てる（ポーランド語の ł は Ł に当たる）", () => {
    expect(markClues("Łódź", get("pl"))).toEqual([
      { text: "Ł", hit: true },
      { text: "ódź", hit: false },
    ]);
  });

  it("語の頭と尾の目印は、その部分だけに当て、それだけの語には当てない", () => {
    expect(markClues("hv husene hvor", get("no"))).toEqual([
      { text: "hv hus", hit: false },
      { text: "ene", hit: true },
      { text: " ", hit: false },
      { text: "hv", hit: true },
      { text: "or", hit: false },
    ]);
    expect(markClues("та книгата", get("bg"))).toEqual([
      { text: "та книга", hit: false },
      { text: "та", hit: true },
    ]);
    expect(markClues("הבית של בה", get("he"))).toEqual([
      { text: "ה", hit: true },
      { text: "בית של בה", hit: false },
    ]);
  });

  it("字をつなげて書く文字では、目印を含む語全体に当てる", () => {
    expect(hits(markClues("قرأت الكتاب والقلم", get("ar")))).toEqual(["الكتاب"]);
    expect(hits(markClues("ಇದನ್ನು ೧೯೫೭ರಲ್ಲಿ", get("kn")))).toEqual(["ಇದನ್ನು"]);
    expect(hits(markClues("वह अच्छा है। वे हैं", get("hi")))).toEqual(["है"]);
    expect(hits(markClues("करंगळी म्हणतात", get("mr")))).toEqual(["करंगळी"]);
  });

  it("ペルシア語の目印は語全体に当て、ZWNJ（字をつなげない印）の所では区切る", () => {
    expect(markClues("این پدر من بوده‌است", get("fa"))).toEqual([
      { text: "این ", hit: false },
      { text: "پدر", hit: true },
      { text: " من بوده‌", hit: false },
      { text: "است", hit: true },
    ]);
  });

  it("句読点の目印は、その字だけに当てる（ミャンマー語の ။）", () => {
    expect(markClues("ဖြစ်သည်။", get("my"))).toEqual([
      { text: "ဖြစ်သည်", hit: false },
      { text: "။", hit: true },
    ]);
  });

  it("目印のアポストロフィは、本文のどの書き方のアポストロフィにも当てる", () => {
    expect(hits(markClues("is 'n stad en ’n dorp", get("af")))).toEqual(["is", "'n", "en", "’n"]);
    expect(hits(markClues("Qirg‘izistonda videooʻyin", get("uz")))).toEqual(["g‘", "oʻ"]);
  });

  it("重なったり接したりする当たりは、1 つにまとめる", () => {
    expect(markClues("Szczecin", get("pl"))).toEqual([
      { text: "Szcz", hit: true },
      { text: "ecin", hit: false },
    ]);
    expect(markClues("il-ħut", get("mt"))).toEqual([
      { text: "il-ħ", hit: true },
      { text: "ut", hit: false },
    ]);
    expect(markClues("kaaa", get("fi"))).toEqual([
      { text: "k", hit: false },
      { text: "aaa", hit: true },
    ]);
  });

  it("結合文字を切り離さない", () => {
    expect(markClues("ą́b", get("pl"))).toEqual([
      { text: "ą́", hit: true },
      { text: "b", hit: false },
    ]);
  });

  it("目印の無い言語は、区切り 1 つ（当たりなし）", () => {
    expect(markClues("ภาษาไทย", get("th"))).toEqual([{ text: "ภาษาไทย", hit: false }]);
  });
});

describe("confusables", () => {
  it("似た言語を出す（チェコ語にスロバキア語、タイ語にラーオ語）", () => {
    expect(codes(confusables(get("cs"), data.languages))).toContain("sk");
    expect(codes(confusables(get("th"), data.languages))).toContain("lo");
  });

  it("自分は入らず、limit 個まで", () => {
    for (const l of data.languages) expect(confusables(l, data.languages), l.code).not.toContain(l);
    expect(confusables(get("pl"), data.languages)).toHaveLength(4);
    expect(confusables(get("hi"), data.languages, 2)).toHaveLength(2);
  });

  it("同じ文字の言語を先に並べ、ラテン文字の言語には別の文字の言語を入れない", () => {
    expect(codes(confusables(get("he"), data.languages))[0]).toBe("yi");
    for (const l of data.languages) {
      const same = confusables(l, data.languages).map((o) => o.script === l.script);
      expect(same, l.code).toEqual([...same].sort((a, b) => Number(b) - Number(a)));
      if (l.script === "Latn") expect(same.every(Boolean), l.code).toBe(true);
    }
  });
});
