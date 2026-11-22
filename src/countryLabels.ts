// 地図に国名を載せる。国の大きさと拡大の度合いから、字が国に収まり、ほかの国名と重ならないものだけを出す
import { geoContains, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, Geometry, Polygon } from "geojson";

export interface LabelAnchor {
  code: string;
  text: string;
  /** 字を置く位置（地図の座標） */
  x: number;
  y: number;
  /** 国の一番大きな島の、外接する四角の幅と高さ（地図の座標） */
  w: number;
  h: number;
  /** 一番大きな島の面積（地図の座標）。大きい国から先に置く */
  area: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 字の幅のおよそ（字の大きさを 1 としたとき）。かな・漢字は 1、ラテン文字などは 0.58 */
export function textWidth(text: string, size: number): number {
  let em = 0;
  for (const ch of text) em += (ch.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : 0.58;
  return em * size;
}

function polygonsOf(geometry: Geometry): Polygon[] {
  if (geometry.type === "Polygon") return [geometry];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }));
  return [];
}

/**
 * 国名を置く位置を、国の一番大きな島（フランスなら本土）の中ほどに決める。
 * 重心が国の外に出る形（三日月形など）では、外接する四角の中の格子から、国の中で重心に一番近い点を選ぶ。
 */
export function anchorOf(projection: GeoProjection, code: string, text: string, feature: Feature<Geometry>): LabelAnchor | null {
  const path = geoPath(projection);
  let best: { polygon: Polygon; area: number } | null = null;
  for (const polygon of polygonsOf(feature.geometry)) {
    const area = path.area(polygon);
    if (area > 0 && (!best || area > best.area)) best = { polygon, area };
  }
  if (!best) return null;
  const { polygon, area } = best;
  const [[x0, y0], [x1, y1]] = path.bounds(polygon);
  let [x, y] = path.centroid(polygon);
  if (![x, y, x0, y0, x1, y1].every(Number.isFinite)) return null;
  const inside = (px: number, py: number) => {
    const lonLat = projection.invert?.([px, py]);
    return !!lonLat && geoContains(polygon, lonLat);
  };
  if (!inside(x, y)) {
    let nearest = Infinity;
    const steps = 12;
    for (let i = 1; i < steps; i++) {
      for (let j = 1; j < steps; j++) {
        const px = x0 + ((x1 - x0) * i) / steps;
        const py = y0 + ((y1 - y0) * j) / steps;
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < nearest && inside(px, py)) {
          nearest = d;
          [x, y] = [px, py];
        }
      }
    }
    if (nearest === Infinity) return null;
  }
  return { code, text, x, y, w: x1 - x0, h: y1 - y0, area };
}

/** 字がどれだけ国からはみ出してよいか（字の幅に対する、国の幅の割合の下限） */
const FIT = 0.85;
/** 国名どうしの間に空ける幅（字の大きさに対する割合） */
const GAP = 0.3;

/**
 * 出す国名を選ぶ。size は字の大きさ（地図の座標）、view は今見えている範囲。
 * 国が字より狭いもの、見えている範囲の外のもの、先に置いた国名と重なるものは出さない。
 */
export function placeLabels(anchors: LabelAnchor[], size: number, view: Rect): LabelAnchor[] {
  const placed: Rect[] = [];
  const out: LabelAnchor[] = [];
  const gap = size * GAP;
  for (const a of [...anchors].sort((p, q) => q.area - p.area)) {
    const w = textWidth(a.text, size);
    if (a.w < w * FIT || a.h < size) continue;
    const rect = { x: a.x - w / 2 - gap, y: a.y - size / 2 - gap, w: w + 2 * gap, h: size + 2 * gap };
    if (rect.x < view.x || rect.y < view.y || rect.x + rect.w > view.x + view.w || rect.y + rect.h > view.y + view.h) continue;
    if (placed.some((r) => r.x < rect.x + rect.w && rect.x < r.x + r.w && r.y < rect.y + rect.h && rect.y < r.y + r.h)) continue;
    placed.push(rect);
    out.push(a);
  }
  return out;
}
