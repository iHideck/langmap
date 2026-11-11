// 言語のデータの型と、一覧の絞り込み
import { countryOf } from "./geo";
import type { Locale } from "./labels";

export interface Example {
  text: string;
  title: string;
  url: string;
}

export interface Language {
  code: string;
  level: "beginner" | "intermediate" | "advanced";
  nameJa: string;
  nameEn: string;
  script: string;
  family: string;
  area: string;
  region: string;
  regionEn: string;
  tip?: string;
  tipEn?: string;
  clues?: { letters?: string[]; words?: string[] };
  /** 国（FR）と国の一部（FR-64）のコード */
  regions: string[];
  examples?: Example[];
}

export interface LanguageData {
  examplesLicense: { name: string; url: string; notice: string };
  languages: Language[];
}

export function name(language: Language, locale: Locale): string {
  return locale === "ja" ? language.nameJa : language.nameEn;
}

export function otherName(language: Language, locale: Locale): string {
  return locale === "ja" ? language.nameEn : language.nameJa;
}

/** 言語が話されている国（国の一部だけで話される言語も、その国に数える） */
export function countriesOf(language: Language): string[] {
  return [...new Set(language.regions.map(countryOf))];
}

/** 国 → その国で話される言語 */
export function indexByCountry(languages: Language[]): Map<string, Language[]> {
  const index = new Map<string, Language[]>();
  for (const language of languages) {
    for (const country of countriesOf(language)) {
      const list = index.get(country) ?? [];
      list.push(language);
      index.set(country, list);
    }
  }
  return index;
}

/** 言語の数が最も多い地域。同じ数なら order で先の地域。空なら null */
export function dominantArea(languages: Language[], order: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const language of languages) counts.set(language.area, (counts.get(language.area) ?? 0) + 1);
  let best: string | null = null;
  let most = 0;
  for (const area of order) {
    const n = counts.get(area) ?? 0;
    if (n > most) {
      best = area;
      most = n;
    }
  }
  return best;
}

export interface Filter {
  query: string;
  area: string | null;
  family: string | null;
  script: string | null;
  country: string | null;
}

export const EMPTY_FILTER: Filter = { query: "", area: null, family: null, script: null, country: null };

function normalize(s: string): string {
  return s.normalize("NFKC").toLowerCase().trim();
}

export function matches(language: Language, filter: Filter): boolean {
  if (filter.area && language.area !== filter.area) return false;
  if (filter.family && language.family !== filter.family) return false;
  if (filter.script && language.script !== filter.script) return false;
  if (filter.country && !countriesOf(language).includes(filter.country)) return false;
  const query = normalize(filter.query);
  if (!query) return true;
  return [language.code, language.nameJa, language.nameEn].some((s) => normalize(s).includes(query));
}

/** 同じ国で話される言語。共有する国が多い順 */
export function neighbors(language: Language, byCountry: Map<string, Language[]>, limit = 12): Language[] {
  const score = new Map<Language, number>();
  for (const country of countriesOf(language)) {
    for (const other of byCountry.get(country) ?? []) {
      if (other !== language) score.set(other, (score.get(other) ?? 0) + 1);
    }
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([other]) => other);
}
