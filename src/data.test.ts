import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMPTY_FILTER, countriesOf, indexByCountry, matches, neighbors, type Language, type LanguageData } from "./data";
import { AREAS, FAMILIES, LEVELS, SCRIPTS } from "./labels";

const data = JSON.parse(readFileSync(new URL("../public/data/languages.json", import.meta.url), "utf8")) as LanguageData;
const regions = JSON.parse(readFileSync(new URL("../public/data/regions.geojson", import.meta.url), "utf8")) as {
  features: { properties: { code: string } }[];
};
const byCode = new Map(data.languages.map((l) => [l.code, l]));
const get = (code: string) => byCode.get(code) as Language;

describe("languages.json", () => {
  it("全ての言語に、名前・地域・塗る所がある", () => {
    expect(data.languages.length).toBeGreaterThan(200);
    for (const l of data.languages) {
      expect(l.nameJa && l.nameEn && l.region && l.regionEn, l.code).toBeTruthy();
      expect(l.regions.length, l.code).toBeGreaterThan(0);
    }
  });

  it("地域・語族・文字・難易度の名前が、全て日本語と英語である", () => {
    for (const l of data.languages) {
      expect(AREAS[l.area], l.area).toBeDefined();
      expect(FAMILIES[l.family], l.family).toBeDefined();
      expect(SCRIPTS[l.script], l.script).toBeDefined();
      expect(LEVELS[l.level], l.level).toBeDefined();
    }
  });

  it("国の一部のコードは、全て regions.geojson に形がある", () => {
    const shapes = new Set(regions.features.map((f) => f.properties.code));
    for (const l of data.languages) {
      for (const code of l.regions.filter((c) => c.includes("-"))) expect(shapes.has(code), `${l.code} ${code}`).toBe(true);
    }
  });
});

describe("絞り込み", () => {
  it("名前（日本語・英語）とコードで探せる", () => {
    expect(matches(get("eu"), { ...EMPTY_FILTER, query: "バスク" })).toBe(true);
    expect(matches(get("eu"), { ...EMPTY_FILTER, query: "basque" })).toBe(true);
    expect(matches(get("eu"), { ...EMPTY_FILTER, query: "EU" })).toBe(true);
    expect(matches(get("eu"), { ...EMPTY_FILTER, query: "french" })).toBe(false);
  });

  it("国の一部で話される言語も、その国で絞り込める", () => {
    expect(countriesOf(get("eu")).sort()).toEqual(["ES", "FR"]);
    expect(matches(get("eu"), { ...EMPTY_FILTER, country: "FR" })).toBe(true);
    expect(matches(get("eu"), { ...EMPTY_FILTER, country: "DE" })).toBe(false);
  });

  it("同じ国で話される言語を、共有する国の多い順に出す", () => {
    const byCountry = indexByCountry(data.languages);
    const near = neighbors(get("eu"), byCountry);
    expect(near.map((l) => l.code)).toContain("es");
    expect(near).not.toContain(get("eu"));
  });
});
