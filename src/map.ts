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
  zoomIn: string;
  zoomOut: string;
  zoomReset: string;
}

/** 言語のページの大きな地図。塗る範囲に合わせて映し、片隅に世界のどのあたりかを示す小さな図を添える。拡大縮小と移動ができる */
export function detailMap(atlas: Atlas, world: Atlas, codes: string[], options: DetailOptions): HTMLDivElement {
  const width = 800;
  const height = 560;
  const frame = document.createElement("div");
  frame.className = "map-frame";
  frame.style.setProperty("--hl", options.color);
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": options.label, class: "detail-map" });
  frame.append(svg);
  const highlight = highlightOf(atlas, codes);
  if (!highlight) return frame;
  // 縮小したときに周りも見えるよう、画面の外も切らずに描く
  const projection = projectionFor(highlight.view, width, height, 8).clipExtent(null);
  const path = geoPath(projection);

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
  const marks = smallMarks(projection, highlight.features).map(([x, y]) => el("circle", { cx: x, cy: y, r: 9, class: "mark" }));
  svg.append(...marks);

  if (highlight.view.span <= 150) frame.append(locator(world, highlight));
  frame.append(zoomControls(svg, marks, { width, height }, options));
  return frame;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MAX_ZOOM = 12;
const MIN_ZOOM = 1 / 3;

/** ホイール・ピンチで拡大縮小し、ドラッグで動かす。viewBox を変えるので、描き直さない */
function zoomControls(
  svg: SVGSVGElement,
  marks: SVGCircleElement[],
  size: { width: number; height: number },
  options: DetailOptions,
): HTMLDivElement {
  const initial: Box = { x: 0, y: 0, w: size.width, h: size.height };
  let box = { ...initial };
  let frame = 0;

  const apply = () => {
    frame = 0;
    svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
    const r = (9 * box.w) / size.width;
    for (const m of marks) m.setAttribute("r", r.toFixed(3));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(apply);
  };

  /** 画面の点を、地図の座標にする */
  const toMap = (clientX: number, clientY: number): [number, number] => {
    const rect = svg.getBoundingClientRect();
    return [box.x + ((clientX - rect.left) / rect.width) * box.w, box.y + ((clientY - rect.top) / rect.height) * box.h];
  };

  const clamp = () => {
    // 地図の中心が、元の範囲から大きく外れないようにする
    const cx = Math.min(Math.max(box.x + box.w / 2, -size.width / 2), size.width * 1.5);
    const cy = Math.min(Math.max(box.y + box.h / 2, -size.height / 2), size.height * 1.5);
    box.x = cx - box.w / 2;
    box.y = cy - box.h / 2;
  };

  /** 地図の点 (px, py) を動かさずに、factor 倍に拡大する */
  const zoomAt = (factor: number, px: number, py: number) => {
    const zoom = size.width / box.w;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    const k = zoom / next;
    box = { x: px - (px - box.x) * k, y: py - (py - box.y) * k, w: box.w * k, h: box.h * k };
    clamp();
    schedule();
  };
  const zoomCenter = (factor: number) => zoomAt(factor, box.x + box.w / 2, box.y + box.h / 2);

  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const [px, py] = toMap(e.clientX, e.clientY);
      zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.002)), px, py);
    },
    { passive: false },
  );
  svg.addEventListener("dblclick", (e) => {
    const [px, py] = toMap(e.clientX, e.clientY);
    zoomAt(e.shiftKey ? 0.5 : 2, px, py);
  });

  // ドラッグ（指 1 本・マウス）で移動、指 2 本で拡大縮小
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { dist: number; mid: { x: number; y: number } } | null = null;
  const pinchOf = () => {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  svg.addEventListener("pointerdown", (e) => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch = pointers.size === 2 ? pinchOf() : null;
    svg.classList.add("dragging");
  });
  svg.addEventListener("pointermove", (e) => {
    const last = pointers.get(e.pointerId);
    if (!last) return;
    const rect = svg.getBoundingClientRect();
    if (pointers.size === 1) {
      box.x -= ((e.clientX - last.x) / rect.width) * box.w;
      box.y -= ((e.clientY - last.y) / rect.height) * box.h;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      clamp();
      schedule();
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const now = pinchOf();
      box.x -= ((now.mid.x - pinch.mid.x) / rect.width) * box.w;
      box.y -= ((now.mid.y - pinch.mid.y) / rect.height) * box.h;
      const [px, py] = toMap(now.mid.x, now.mid.y);
      if (pinch.dist > 0) zoomAt(now.dist / pinch.dist, px, py);
      pinch = now;
    }
  });
  const release = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    pinch = pointers.size === 2 ? pinchOf() : null;
    if (pointers.size === 0) svg.classList.remove("dragging");
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);

  const button = (text: string, label: string, onClick: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-label", label);
    b.title = label;
    b.addEventListener("click", onClick);
    return b;
  };
  const controls = document.createElement("div");
  controls.className = "zoom-controls";
  controls.append(
    button("+", options.zoomIn, () => zoomCenter(1.6)),
    button("−", options.zoomOut, () => zoomCenter(1 / 1.6)),
    button("⟲", options.zoomReset, () => {
      box = { ...initial };
      schedule();
    }),
  );
  return controls;
}

function locator(world: Atlas, highlight: Highlight): SVGSVGElement {
  const w = 190;
  const h = 100;
  const svg = el("svg", { viewBox: `-4 -4 ${w + 8} ${h + 8}`, class: "locator", "aria-hidden": "true" });
  const projection = worldProjection(w, h);
  const path = geoPath(projection);
  const sphere = pathEl(path({ type: "Sphere" }), "locator-sphere");
  if (sphere) svg.append(sphere);
  const land = pathEl(path({ type: "FeatureCollection", features: world.land } as GeoPermissibleObjects), "locator-land");
  if (land) svg.append(land);
  const shapes = pathEl(
    path({ type: "FeatureCollection", features: highlight.features } as GeoPermissibleObjects),
    "locator-hl",
  );
  if (shapes) svg.append(shapes);
  const c = projection(highlight.view.center);
  if (c) svg.append(el("circle", { cx: c[0], cy: c[1], r: 7, class: "locator-ring" }));
  return svg;
}

export interface WorldOptions {
  label: string;
  /** 国ごとの値（0〜1）。塗りの濃さ */
  intensity: (code: string) => number;
  /** 塗りの色（CSS の色。例: "var(--area-europe)"）。intensity が 0 より大きい国だけに使う */
  color: (code: string) => string;
  title: (code: string) => string;
  selected: string | null;
  onSelect: (code: string) => void;
}

/** 一覧の上の世界地図。国ごとに色と言語の数の濃さで塗り分け、押すとその国で絞り込む */
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
      p.style.setProperty("--hl", options.color(code));
      p.setAttribute("tabindex", "0");
      p.dataset.code = code;
      p.dataset.key = `country:${code}`;
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
