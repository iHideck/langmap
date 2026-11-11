import "./styles.css";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { confusables, markClues, type Segment } from "./clues";
import {
  EMPTY_FILTER,
  countriesOf,
  dominantArea,
  indexByCountry,
  matches,
  name,
  neighbors,
  otherName,
  type Filter,
  type Language,
  type LanguageData,
} from "./data";
import { countriesFromTopology, regionsFromGeoJson, type Atlas } from "./geo";
import { AREAS, AREA_ORDER, FAMILIES, LEVELS, SCRIPTS, SCRIPT_GLYPHS, label, t, type Locale } from "./labels";
import { detailMap, drawMini, palette, worldMap } from "./map";

const BASE = import.meta.env.BASE_URL;

interface State {
  locale: Locale;
  data: LanguageData;
  byCode: Map<string, Language>;
  byCountry: Map<string, Language[]>;
  atlas: Atlas;
  detailAtlas: Atlas | null;
  filter: Filter;
}

// ---- 小さな道具 ----

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function storage(key: string, value?: string): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    // 保存できない環境（プライベートブラウズなど）では、覚えずに続ける
  }
  return null;
}

function areaColor(area: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--area-${area}`).trim() || "#888";
}

async function json<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function loadAtlas(resolution: "110m" | "50m", regions: FeatureCollection<Geometry, { code: string }>): Promise<Atlas> {
  const topology = await json<Topology>(`geojson/world/countries/${resolution}.topojson`);
  return { ...countriesFromTopology(topology), regions: regionsFromGeoJson(regions) };
}

function countryName(state: State, code: string): string | undefined {
  const place = state.atlas.countries.get(code);
  if (!place) return undefined;
  return state.locale === "ja" ? place.nameJa : place.nameEn;
}

// ---- 一覧の小さな地図は、見えたときに描く ----

const minis = new Map<HTMLCanvasElement, { codes: string[]; area: string }>();
let miniObserver: IntersectionObserver | null = null;

function observeMini(state: State, canvas: HTMLCanvasElement, language: Language) {
  minis.set(canvas, { codes: language.regions, area: language.area });
  miniObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLCanvasElement;
        const info = minis.get(target);
        miniObserver?.unobserve(target);
        if (info) drawMini(target, state.atlas, info.codes, palette(areaColor(info.area)));
      }
    },
    { rootMargin: "300px" },
  );
  miniObserver.observe(canvas);
}

// ---- 一覧 ----

function card(state: State, language: Language): HTMLElement {
  const { locale } = state;
  const canvas = h("canvas", { class: "mini", "aria-hidden": "true" });
  observeMini(state, canvas, language);
  const specimen = language.examples?.[0];
  const a = h(
    "a",
    { class: "card", href: `#/${language.code}`, style: `--hl: var(--area-${language.area})` },
    canvas,
    h(
      "div",
      { class: "card-body" },
      // 本文は長いので、リンクの名前に入れない
      specimen && h("p", { class: "specimen", lang: language.code, dir: "auto", "aria-hidden": "true" }, specimen.text),
      h("div", { class: "card-head" }, h("h3", {}, name(language, locale)), h("span", { class: "code" }, language.code)),
      h("p", { class: "other" }, otherName(language, locale)),
      h("p", { class: "region" }, locale === "ja" ? language.region : language.regionEn),
      h(
        "p",
        { class: "tags" },
        h("span", { class: "tag" }, label(SCRIPTS, language.script, locale)),
        h("span", { class: "tag" }, label(FAMILIES, language.family, locale)),
      ),
    ),
  );
  return a;
}

function chip(text: string, active: boolean, onClick: () => void, color?: string): HTMLButtonElement {
  const b = h("button", { class: `chip${active ? " active" : ""}`, type: "button", "aria-pressed": String(active) }, text);
  if (color) b.style.setProperty("--hl", color);
  b.addEventListener("click", onClick);
  return b;
}

function select(options: [string, string][], value: string | null, allLabel: string, onChange: (v: string | null) => void) {
  const s = h("select", {});
  s.append(h("option", { value: "" }, allLabel));
  for (const [v, text] of options) {
    const o = h("option", { value: v }, text);
    if (v === value) o.selected = true;
    s.append(o);
  }
  s.addEventListener("change", () => onChange(s.value || null));
  return s;
}

function renderHome(state: State, root: HTMLElement) {
  const { locale, data } = state;
  const filtered = data.languages.filter((l) => matches(l, state.filter));
  const max = Math.max(...[...state.byCountry.values()].map((l) => l.length));

  const update = (patch: Partial<Filter>, keepFocus = false) => {
    state.filter = { ...state.filter, ...patch };
    const active = document.activeElement as HTMLInputElement | null;
    const caret = active?.selectionStart ?? null;
    render(state);
    if (keepFocus) {
      const input = document.querySelector<HTMLInputElement>("#search");
      input?.focus();
      if (input && caret !== null) input.setSelectionRange(caret, caret);
    }
  };

  // 絞り込んだ一覧が見えるところまで送る（スマートフォンでは地図や文字の見本帳の下に隠れるため）
  const revealList = () => {
    const status = document.querySelector(".status");
    if (status && status.getBoundingClientRect().top > window.innerHeight * 0.6) {
      status.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const families = [...new Set(data.languages.map((l) => l.family))]
    .map((f): [string, string] => [f, label(FAMILIES, f, locale)])
    .sort((a, b) => a[1].localeCompare(b[1], locale));
  const scripts = [...new Set(data.languages.map((l) => l.script))]
    .map((s): [string, string] => [s, label(SCRIPTS, s, locale)])
    .sort((a, b) => a[1].localeCompare(b[1], locale));

  // 世界地図
  const filtering = state.filter.area || state.filter.family || state.filter.script || state.filter.query;
  const shown = filtering ? indexByCountry(filtered) : state.byCountry;
  const world = worldMap(state.atlas, {
    label: t(locale, "worldLabel"),
    intensity: (code) => {
      const n = shown.get(code)?.length ?? 0;
      return n === 0 ? 0 : 0.25 + 0.75 * Math.sqrt(n / max);
    },
    color: (code) => `var(--area-${dominantArea(shown.get(code) ?? [], AREA_ORDER)})`,
    title: (code) => `${countryName(state, code) ?? code} — ${t(locale, "count", { n: shown.get(code)?.length ?? 0 })}`,
    selected: state.filter.country,
    onSelect: (code) => {
      update({ country: state.filter.country === code ? null : code });
      revealList();
    },
  });

  const stats: [number, string][] = [
    [data.languages.length, t(locale, "languages")],
    [scripts.length, t(locale, "statScripts")],
    [families.length, t(locale, "statFamilies")],
    [state.byCountry.size, t(locale, "statCountries")],
  ];
  const hero = h(
    "section",
    { class: "hero" },
    h(
      "div",
      { class: "hero-text" },
      h("h1", {}, "langmap"),
      h("p", { class: "tagline" }, t(locale, "tagline")),
      h("ul", { class: "stats" }, ...stats.map(([n, text]) => h("li", {}, h("strong", {}, String(n)), h("span", {}, text)))),
    ),
    h("div", { class: "world" }, world),
    h(
      "div",
      { class: "legend" },
      h(
        "ul",
        { class: "legend-areas" },
        ...AREA_ORDER.map((area) => h("li", { style: `--hl: var(--area-${area})` }, label(AREAS, area, locale))),
      ),
      h("span", {}, t(locale, "legendNote")),
      h("span", { class: "hint" }, t(locale, "mapHint")),
    ),
  );

  // 文字の見本帳。漢字・かな・ハングルは、言語によって字の形が変わるので lang を付ける
  const glyphLang: Record<string, string> = { Hani: "zh", Jpan: "ja", Kore: "ko" };
  const tiles = h(
    "div",
    { class: "script-tiles" },
    ...scripts
      .map(([script, text]) => ({ script, text, languages: data.languages.filter((l) => l.script === script) }))
      .sort((a, b) => b.languages.length - a.languages.length || a.text.localeCompare(b.text, locale))
      .map(({ script, text, languages }) => {
        const pressed = state.filter.script === script;
        const title = `${text} — ${t(locale, "count", { n: languages.length })}`;
        const glyph = h("span", { class: "glyph", "aria-hidden": "true" }, SCRIPT_GLYPHS[script]);
        if (glyphLang[script]) glyph.lang = glyphLang[script];
        const tile = h(
          "button",
          {
            class: "script-tile",
            type: "button",
            "aria-pressed": String(pressed),
            "aria-label": title,
            title,
            style: `--hl: var(--area-${dominantArea(languages, AREA_ORDER)})`,
          },
          glyph,
          h("span", { class: "script-name" }, text),
          h("span", { class: "count" }, String(languages.length)),
        );
        tile.addEventListener("click", () => {
          update({ script: pressed ? null : script });
          revealList();
        });
        return tile;
      }),
  );
  const scriptBook = h(
    "section",
    { class: "scripts" },
    h("div", { class: "scripts-head" }, h("h2", {}, t(locale, "scriptsTitle")), h("span", {}, t(locale, "scriptsHint"))),
    tiles,
  );

  // 絞り込み
  const search = h("input", {
    id: "search",
    type: "search",
    placeholder: t(locale, "search"),
    "aria-label": t(locale, "search"),
    value: state.filter.query,
  });
  search.addEventListener("input", () => update({ query: search.value }, true));

  const areas = h(
    "div",
    { class: "chips", role: "group" },
    chip(t(locale, "all"), !state.filter.area, () => update({ area: null })),
    ...AREA_ORDER.map((area) =>
      chip(label(AREAS, area, locale), state.filter.area === area, () => update({ area: state.filter.area === area ? null : area }), `var(--area-${area})`),
    ),
  );

  const controls = h(
    "section",
    { class: "controls" },
    search,
    areas,
    h(
      "div",
      { class: "selects" },
      select(families, state.filter.family, t(locale, "allFamilies"), (v) => update({ family: v })),
      select(scripts, state.filter.script, t(locale, "allScripts"), (v) => update({ script: v })),
    ),
  );

  const surprise = h("button", { class: "surprise", type: "button", title: t(locale, "surpriseHint") }, t(locale, "surprise"));
  surprise.addEventListener("click", () => {
    location.hash = `#/${filtered[Math.floor(Math.random() * filtered.length)].code}`;
  });

  const country = state.filter.country;
  const status = h(
    "div",
    { class: "status" },
    country
      ? h("strong", {}, t(locale, "inCountry", { country: countryName(state, country) ?? country }))
      : null,
    h("span", { class: "count" }, t(locale, "count", { n: filtered.length })),
    country ? chip(`× ${t(locale, "clearCountry")}`, false, () => update({ country: null })) : null,
    filtered.length ? surprise : null,
  );

  // 言語の一覧（地域ごと）
  const list = h("section", { class: "list" });
  if (filtered.length === 0) list.append(h("p", { class: "empty" }, t(locale, "noResults")));
  for (const area of AREA_ORDER) {
    const inArea = filtered.filter((l) => l.area === area);
    if (inArea.length === 0) continue;
    list.append(
      h(
        "h2",
        { class: "area-title", style: `--hl: var(--area-${area})` },
        label(AREAS, area, locale),
        h("span", { class: "count" }, String(inArea.length)),
      ),
      h("div", { class: "grid" }, ...inArea.map((l) => card(state, l))),
    );
  }

  // 作り直すと横に送った見本帳が先頭に戻るので、前の位置を引き継ぐ
  const tilesLeft = root.querySelector(".script-tiles")?.scrollLeft ?? 0;
  root.replaceChildren(hero, scriptBook, controls, status, list);
  tiles.scrollLeft = tilesLeft;
}

// ---- 言語のページ ----

function linkChips(state: State, languages: Language[]): HTMLElement {
  return h(
    "div",
    { class: "chips" },
    ...languages.map((l) =>
      h("a", { class: "chip", href: `#/${l.code}`, style: `--hl: var(--area-${l.area})` }, name(l, state.locale)),
    ),
  );
}

function segmentNodes(segments: Segment[]): (HTMLElement | string)[] {
  return segments.map((s) => (s.hit ? h("mark", { class: "clue-mark" }, s.text) : s.text));
}

function similarCard(state: State, language: Language): HTMLElement {
  const { locale } = state;
  const tip = locale === "ja" ? language.tip : language.tipEn;
  const sample = language.examples?.[0];
  return h(
    "a",
    { class: "similar-card", href: `#/${language.code}`, style: `--hl: var(--area-${language.area})` },
    h("h3", {}, name(language, locale), h("span", { class: "other" }, otherName(language, locale))),
    tip ? h("p", { class: "similar-tip" }, tip) : null,
    sample
      ? h("p", { class: "similar-sample", lang: language.code, dir: "auto" }, ...segmentNodes(markClues(sample.text, language)))
      : null,
  );
}

function renderDetail(state: State, root: HTMLElement, language: Language) {
  const { locale } = state;
  const atlas = state.detailAtlas ?? state.atlas;
  const color = areaColor(language.area);
  const map = detailMap(atlas, state.atlas, language.regions, {
    label: t(locale, "mapLabel", { name: name(language, locale) }),
    color,
    countryName: (code) => countryName(state, code),
    zoomIn: t(locale, "zoomIn"),
    zoomOut: t(locale, "zoomOut"),
    zoomReset: t(locale, "zoomReset"),
  });

  const countries = countriesOf(language).map((code) => {
    const partial = !language.regions.includes(code);
    const text = `${countryName(state, code) ?? code}${partial ? (locale === "ja" ? `（${t(locale, "partOf")}）` : ` (${t(locale, "partOf")})`) : ""}`;
    const a = h("a", { class: "chip", href: "#/" }, text);
    a.addEventListener("click", () => {
      state.filter = { ...EMPTY_FILTER, country: code };
      homeScroll = 0;
    });
    return a;
  });

  const clues = [...(language.clues?.letters ?? []), ...(language.clues?.words ?? [])];
  const tip = locale === "ja" ? language.tip : language.tipEn;
  const order = state.data.languages;
  const index = order.indexOf(language);
  const prev = order[(index - 1 + order.length) % order.length];
  const next = order[(index + 1) % order.length];
  const family = order.filter((l) => l.family === language.family && l !== language);
  const near = neighbors(language, state.byCountry);
  const similar = confusables(language, state.data.languages);

  const facts = h(
    "dl",
    { class: "facts" },
    h("dt", {}, t(locale, "spokenIn")),
    h("dd", {}, locale === "ja" ? language.region : language.regionEn),
    h("dt", {}, t(locale, "countries")),
    h("dd", {}, h("div", { class: "chips" }, ...countries)),
    h("dt", {}, t(locale, "script")),
    h("dd", {}, `${label(SCRIPTS, language.script, locale)}（${language.script}）`),
    h("dt", {}, t(locale, "family")),
    h("dd", {}, label(FAMILIES, language.family, locale)),
    h("dt", {}, t(locale, "area")),
    h("dd", {}, label(AREAS, language.area, locale)),
    h("dt", {}, t(locale, "level")),
    h("dd", {}, label(LEVELS, language.level, locale)),
  );

  const examples = (language.examples ?? []).map((e) =>
    h(
      "figure",
      { class: "example", lang: language.code },
      h("blockquote", { dir: "auto" }, ...segmentNodes(markClues(e.text, language))),
      h("figcaption", { dir: "auto" }, h("a", { href: e.url, rel: "noopener", target: "_blank" }, e.title)),
    ),
  );

  root.replaceChildren(
    h(
      "article",
      { class: "detail", style: `--hl: ${color}` },
      h(
        "nav",
        { class: "detail-nav" },
        h("a", { href: "#/" }, t(locale, "back")),
        h(
          "span",
          {},
          h("a", { href: `#/${prev.code}`, "aria-label": name(prev, locale) }, `← ${name(prev, locale)}`),
          " ",
          h("a", { href: `#/${next.code}`, "aria-label": name(next, locale) }, `${name(next, locale)} →`),
        ),
      ),
      h(
        "header",
        { class: "detail-head" },
        h("p", { class: "eyebrow" }, label(AREAS, language.area, locale)),
        h("h1", {}, name(language, locale)),
        h("p", { class: "other" }, otherName(language, locale), h("span", { class: "code" }, language.code)),
      ),
      h(
        "div",
        { class: "detail-grid" },
        h("div", { class: "detail-map-wrap" }, map, h("p", { class: "zoom-hint" }, t(locale, "zoomHint"))),
        h(
          "div",
          { class: "detail-side" },
          facts,
          tip
            ? h(
                "section",
                { class: "tip" },
                h("h2", {}, t(locale, "tip")),
                h("p", {}, tip),
                clues.length
                  ? h("p", { class: "clues", lang: language.code }, ...clues.map((c) => h("span", { class: "clue", dir: "auto" }, c)))
                  : null,
                examples.some((e) => e.querySelector(".clue-mark"))
                  ? h("p", { class: "clues-note" }, t(locale, "cluesMarked"))
                  : null,
              )
            : null,
        ),
      ),
      examples.length
        ? h(
            "section",
            { class: "examples" },
            h("h2", {}, t(locale, "examples")),
            ...examples,
            h("p", { class: "notice" }, t(locale, "examplesNotice")),
          )
        : null,
      similar.length
        ? h(
            "section",
            { class: "related" },
            h("h2", {}, t(locale, "similar")),
            h("div", { class: "similar-grid" }, ...similar.map((l) => similarCard(state, l))),
          )
        : null,
      near.length ? h("section", { class: "related" }, h("h2", {}, t(locale, "neighbors")), linkChips(state, near)) : null,
      family.length ? h("section", { class: "related" }, h("h2", {}, t(locale, "sameFamily")), linkChips(state, family)) : null,
    ),
  );
  document.title = `${name(language, locale)} — langmap`;
}

// ---- 全体 ----

function renderChrome(state: State) {
  const { locale } = state;
  document.documentElement.lang = locale;
  const toggle = h("div", { class: "locale", role: "group" });
  for (const l of ["ja", "en"] as Locale[]) {
    const b = h("button", { type: "button", "aria-pressed": String(l === locale) }, l === "ja" ? "日本語" : "English");
    b.addEventListener("click", () => {
      state.locale = l;
      storage("langmap.locale", l);
      render(state);
    });
    toggle.append(b);
  }
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = h(
    "button",
    { type: "button", class: "theme", "aria-label": t(locale, "theme"), title: t(locale, "theme") },
    dark ? "☀" : "☾",
  );
  theme.addEventListener("click", () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    storage("langmap.theme", next);
    render(state);
  });
  document.querySelector("#top")!.replaceChildren(
    h("a", { class: "brand", href: "#/" }, h("span", { class: "logo", "aria-hidden": "true" }), "langmap"),
    h("div", { class: "top-actions" }, toggle, theme),
  );
  document.querySelector("#credit")!.replaceChildren(
    h("p", {}, t(locale, "credit")),
    h("p", {}, t(locale, "disclaimer")),
  );
}

function render(state: State) {
  minis.clear();
  miniObserver?.disconnect();
  renderChrome(state);
  const root = document.querySelector<HTMLElement>("#app")!;
  const language = currentLanguage(state);
  if (language) {
    renderDetail(state, root, language);
    if (!state.detailAtlas) void loadDetail(state);
  } else {
    document.title = "langmap";
    renderHome(state, root);
  }
}

let detailLoading: Promise<void> | null = null;
/** 一覧のスクロールの位置。言語のページから戻ったときに使う */
let homeScroll = 0;
let regionsCache: FeatureCollection<Geometry, { code: string }> | null = null;

function loadDetail(state: State): Promise<void> {
  detailLoading ??= loadAtlas("50m", regionsCache!).then((atlas) => {
    state.detailAtlas = atlas;
    if (currentLanguage(state)) render(state);
  });
  return detailLoading;
}

function currentLanguage(state: State): Language | undefined {
  return state.byCode.get(decodeURIComponent(location.hash.replace(/^#\/?/, "")));
}

async function main() {
  const saved = storage("langmap.theme");
  if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  const savedLocale = storage("langmap.locale");
  const locale: Locale =
    savedLocale === "ja" || savedLocale === "en" ? savedLocale : navigator.language.startsWith("ja") ? "ja" : "en";

  const [data, regions] = await Promise.all([
    json<LanguageData>("data/languages.json"),
    json<FeatureCollection<Geometry, { code: string }>>("data/regions.geojson"),
  ]);
  regionsCache = regions;
  const atlas = await loadAtlas("110m", regions);
  const state: State = {
    locale,
    data,
    byCode: new Map(data.languages.map((l) => [l.code, l])),
    byCountry: indexByCountry(data.languages),
    atlas,
    detailAtlas: null,
    filter: { ...EMPTY_FILTER },
  };
  // 一覧から言語のページへ行って戻ったときは、一覧のもとの位置に戻す
  let onDetail = Boolean(currentLanguage(state));
  window.addEventListener("hashchange", () => {
    if (!onDetail) homeScroll = window.scrollY;
    render(state);
    const wasDetail = onDetail;
    onDetail = Boolean(currentLanguage(state));
    if (onDetail) window.scrollTo(0, 0);
    else if (wasDetail) window.scrollTo(0, homeScroll);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => render(state));
  render(state);
}

main().catch((error: unknown) => {
  document.querySelector("#app")!.textContent = String(error);
  console.error(error);
});
