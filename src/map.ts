// 地図を描く。一覧の小さな地図は canvas、言語のページと世界地図は SVG
import { geoGraticule10, geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import { featuresFor, projectionFor, viewOf, worldProjection, type Atlas, type View } from "./geo";

const SVG_NS = "http://www.w3.org/2000/svg";
/** 塗っても見えないほど小さい所（画面の面積が、この px² より小さい）には、丸い印を付ける */
const SMALL_AREA = 40;

export interface Palette {
  ocean: string;
  land: string;
  border: string;
  highlight: string;
  ink: string;
}

export function palette(highlight: string): Palette {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return { ocean: v("--ocean"), land: v("--land"), border: v("--border"), highlight, ink: v("--ink") };
}

interface Highlight {
  features: Feature<Geometry>[];
  view: View;
}

function highlightOf(atlas: Atlas, codes: string[]): Highlight | null {
  const features = featuresFor(atlas, codes);
  if (features.length === 0) return null;
  return { features, view: viewOf(features) };
}

/** 小さすぎて塗っても見えない所の、印を置く位置 */
function smallMarks(projection: GeoProjection, features: Feature<Geometry>[]): [number, number][] {
  const path = geoPath(projection);
  const marks: [number, number][] = [];
  for (const f of features) {
    if (path.area(f) < SMALL_AREA) {
      const c = path.centroid(f);
      if (Number.isFinite(c[0]) && Number.isFinite(c[1])) marks.push(c);
    }
  }
  return marks;
}

export function drawMini(canvas: HTMLCanvasElement, atlas: Atlas, codes: string[], colors: Palette): void {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  const highlight = highlightOf(atlas, codes);
  if (!highlight) return;
  const projection = projectionFor(highlight.view, width, height);
  const path = geoPath(projection, ctx);

  ctx.fillStyle = colors.ocean;
  ctx.fillRect(0, 0, width, height);
  ctx.beginPath();
  path({ type: "Sphere" });
  ctx.fillStyle = colors.ocean;
  ctx.fill();

  ctx.beginPath();
  for (const f of atlas.land) path(f);
  ctx.fillStyle = colors.land;
  ctx.fill();

  ctx.beginPath();
  for (const f of highlight.features) path(f);
  ctx.fillStyle = colors.highlight;
  ctx.fill();

  ctx.beginPath();
  for (const f of atlas.land) path(f);
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  for (const [x, y] of smallMarks(projection, highlight.features)) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.strokeStyle = colors.highlight;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function pathEl(d: string | null, cls: string, title?: string): SVGPathElement | null {
  if (!d) return null;
  const p = el("path", { d, class: cls });
  if (title) {
    const t = el("title");
    t.textContent = title;
    p.append(t);
  }
  return p;
}

export interface DetailOptions {
  label: string;
  color: string;
  countryName: (code: string) => string | undefined;
}

/** 言語のページの大きな地図。塗る範囲に合わせて映し、片隅に世界のどのあたりかを示す小さな図を添える */
export function detailMap(atlas: Atlas, world: Atlas, codes: string[], options: DetailOptions): SVGSVGElement {
  const width = 800;
  const height = 560;
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": options.label, class: "detail-map" });
  svg.style.setProperty("--hl", options.color);
  const highlight = highlightOf(atlas, codes);
  if (!highlight) return svg;
  const projection = projectionFor(highlight.view, width, height, 8);
  const path = geoPath(projection);

  svg.append(el("rect", { width, height, class: "ocean" }));
  const sphere = pathEl(path({ type: "Sphere" }), "sphere");
  if (sphere) svg.append(sphere);
  const graticule = pathEl(path(geoGraticule10()), "graticule");
  if (graticule) svg.append(graticule);

  const land = el("g", { class: "land" });
  for (const [code, place] of atlas.countries) {
    const p = pathEl(path(place.feature), "country", options.countryName(code) ?? place.nameEn);
    if (p) land.append(p);
  }
  for (const f of atlas.land) {
    const props = f.properties as { iso_a2?: string | null } | null;
    if (props?.iso_a2) continue;
    const p = pathEl(path(f), "country");
    if (p) land.append(p);
  }
  svg.append(land);

  const hl = el("g", { class: "hl" });
  for (const f of highlight.features) {
    const p = pathEl(path(f), "hl-shape");
    if (p) hl.append(p);
  }
  svg.append(hl);
  for (const [x, y] of smallMarks(projection, highlight.features)) {
    svg.append(el("circle", { cx: x, cy: y, r: 9, class: "mark" }));
  }

  if (highlight.view.span <= 150) svg.append(locator(world, highlight, width, height));
  return svg;
}

function locator(world: Atlas, highlight: Highlight, width: number, height: number): SVGGElement {
  const w = 190;
  const h = 100;
  const g = el("g", { class: "locator", transform: `translate(${width - w - 14}, ${height - h - 14})` });
  const projection = worldProjection(w, h);
  const path = geoPath(projection);
  g.append(el("rect", { x: -4, y: -4, width: w + 8, height: h + 8, rx: 8, class: "locator-bg" }));
  const sphere = pathEl(path({ type: "Sphere" }), "locator-sphere");
  if (sphere) g.append(sphere);
  const land = pathEl(path({ type: "FeatureCollection", features: world.land } as GeoPermissibleObjects), "locator-land");
  if (land) g.append(land);
  const shapes = pathEl(
    path({ type: "FeatureCollection", features: highlight.features } as GeoPermissibleObjects),
    "locator-hl",
  );
  if (shapes) g.append(shapes);
  const c = projection(highlight.view.center);
  if (c) g.append(el("circle", { cx: c[0], cy: c[1], r: 7, class: "locator-ring" }));
  return g;
}

export interface WorldOptions {
  label: string;
  /** 国ごとの値（0〜1）。塗りの濃さ */
  intensity: (code: string) => number;
  title: (code: string) => string;
  selected: string | null;
  onSelect: (code: string) => void;
}

/** 一覧の上の世界地図。国ごとの言語の数で塗り分け、押すとその国で絞り込む */
export function worldMap(atlas: Atlas, options: WorldOptions): SVGSVGElement {
  const width = 960;
  const height = 470;
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": options.label, class: "world-map" });
  const projection = worldProjection(width, height);
  const path = geoPath(projection);
  const sphere = pathEl(path({ type: "Sphere" }), "sphere");
  if (sphere) svg.append(sphere);
  const graticule = pathEl(path(geoGraticule10()), "graticule");
  if (graticule) svg.append(graticule);
  const g = el("g", { class: "land" });
  for (const f of atlas.land) {
    const props = f.properties as { iso_a2?: string | null } | null;
    if (!props?.iso_a2 || props.iso_a2 === "AQ") {
      const p = pathEl(path(f), "country");
      if (p) g.append(p);
    }
  }
  for (const [code, place] of atlas.countries) {
    if (code === "AQ") continue;
    const value = options.intensity(code);
    const p = pathEl(path(place.feature), "country", options.title(code));
    if (!p) continue;
    if (value > 0) {
      p.classList.add("has-lang");
      p.style.setProperty("--v", value.toFixed(3));
      p.setAttribute("tabindex", "0");
      p.dataset.code = code;
      p.addEventListener("click", () => options.onSelect(code));
      p.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          options.onSelect(code);
        }
      });
    }
    if (code === options.selected) p.classList.add("selected");
    g.append(p);
  }
  svg.append(g);
  return svg;
}
