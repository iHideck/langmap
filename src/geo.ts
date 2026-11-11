// 境界のデータを読み、言語ごとの塗る形と、映す範囲を求める
import {
  geoArea,
  geoAzimuthalEqualArea,
  geoBounds,
  geoCentroid,
  geoEqualEarth,
  type GeoProjection,
} from "d3-geo";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";

export interface Place {
  code: string;
  nameJa: string;
  nameEn: string;
  feature: Feature<Geometry>;
}

export interface Atlas {
  /** 国（ISO 3166-1 alpha-2）。iHideck/geojson の world/countries */
  countries: Map<string, Place>;
  /** コードの無い所も含めた全ての国の形。地図の下地に使う */
  land: Feature<Geometry>[];
  /** 国の一部の地域（ISO 3166-2 など）。languessr の regions */
  regions: Map<string, Feature<Geometry>>;
}

interface CountryProperties {
  iso_a2: string | null;
  name_ja: string;
  name_en: string;
}

// ISO 3166-1 にコードが無いため、iHideck/geojson が iso_a2 を空にしている国。languessr は XK を使う
const CODES_BY_NAME: Record<string, string> = { Kosovo: "XK" };

/**
 * d3-geo は、面の外周を時計回り（RFC 7946 と逆）で読む。向きが逆だと、地球からその面を除いた残りを塗ってしまうので、
 * 半球より広くなる輪を裏返す。
 */
export function rewind<G extends Geometry>(geometry: G): G {
  const fixPolygon = (rings: Position[][]): Position[][] =>
    rings.map((ring, i) => {
      const area = geoArea({ type: "Polygon", coordinates: [ring] });
      const tooBig = area > 2 * Math.PI;
      // 外周は小さく（半球未満）、穴は大きく（地球からその穴を除いた残り）なるように向ける
      return (i === 0) === tooBig ? [...ring].reverse() : ring;
    });
  if (geometry.type === "Polygon") {
    return { ...geometry, coordinates: fixPolygon((geometry as Polygon).coordinates) };
  }
  if (geometry.type === "MultiPolygon") {
    return { ...geometry, coordinates: (geometry as MultiPolygon).coordinates.map(fixPolygon) };
  }
  return geometry;
}

export function countriesFromTopology(topology: Topology): { countries: Map<string, Place>; land: Feature<Geometry>[] } {
  const name = Object.keys(topology.objects)[0];
  const collection = feature(topology, topology.objects[name]) as unknown as FeatureCollection<Geometry, CountryProperties>;
  const countries = new Map<string, Place>();
  const land: Feature<Geometry>[] = [];
  for (const f of collection.features) {
    if (!f.geometry) continue;
    const fixed = { ...f, geometry: rewind(f.geometry) };
    land.push(fixed);
    const code = f.properties.iso_a2 || CODES_BY_NAME[f.properties.name_en];
    if (code && !countries.has(code)) {
      countries.set(code, { code, nameJa: f.properties.name_ja, nameEn: f.properties.name_en, feature: fixed });
    }
  }
  return { countries, land };
}

export function regionsFromGeoJson(collection: FeatureCollection<Geometry, { code: string }>): Map<string, Feature<Geometry>> {
  return new Map(collection.features.map((f) => [f.properties.code, { ...f, geometry: rewind(f.geometry) }]));
}

/** 国のコード（FR）か、国の一部のコード（FR-64）か */
export function isSubdivision(code: string): boolean {
  return code.includes("-");
}

/** 地域のコードが属する国（FR-64 → FR） */
export function countryOf(code: string): string {
  return code.split("-")[0];
}

export function featuresFor(atlas: Atlas, codes: string[]): Feature<Geometry>[] {
  const out: Feature<Geometry>[] = [];
  for (const code of codes) {
    const f = isSubdivision(code) ? atlas.regions.get(code) : atlas.countries.get(code)?.feature;
    if (f) out.push(f);
  }
  return out;
}

export interface View {
  /** 映す範囲 [[西, 南], [東, 北]]。日付変更線をまたぐときは 西 > 東 */
  bounds: [[number, number], [number, number]];
  center: [number, number];
  /** 経度の幅（度） */
  span: number;
}

const MIN_SPAN_LON = 14;
const MIN_SPAN_LAT = 9;
const MARGIN = 0.25;

export function viewOf(features: Feature<Geometry>[]): View {
  const collection: FeatureCollection = { type: "FeatureCollection", features };
  let [[west, south], [east, north]] = geoBounds(collection);
  let spanLon = east >= west ? east - west : east + 360 - west;
  let spanLat = north - south;
  const centerLon = normalizeLon(west + spanLon / 2);
  const centerLat = (north + south) / 2;
  spanLon = Math.min(360, Math.max(MIN_SPAN_LON, spanLon * (1 + 2 * MARGIN)));
  spanLat = Math.min(170, Math.max(MIN_SPAN_LAT, spanLat * (1 + 2 * MARGIN)));
  west = normalizeLon(centerLon - spanLon / 2);
  east = normalizeLon(centerLon + spanLon / 2);
  south = Math.max(-85, centerLat - spanLat / 2);
  north = Math.min(85, centerLat + spanLat / 2);
  return { bounds: [[west, south], [east, north]], center: [centerLon, centerLat], span: spanLon };
}

export function normalizeLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** 映す範囲の格子の点。投影を範囲に合わせるのに使う（範囲の縁は、投影すると曲がるため） */
function boundsPoints(view: View): Position[] {
  const [[west, south], [east, north]] = view.bounds;
  const spanLon = east >= west ? east - west : east + 360 - west;
  const points: Position[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = 0; j <= 6; j++) {
      points.push([normalizeLon(west + (spanLon * i) / 6), south + ((north - south) * j) / 6]);
    }
  }
  return points;
}

/** 世界の大半にわたる言語は世界地図、それ以外は、その中心から見た正積方位図法で映す */
export function projectionFor(view: View, width: number, height: number, pad = 0): GeoProjection {
  if (view.span > 150) {
    return geoEqualEarth()
      .rotate([view.span >= 300 ? -10 : -view.center[0], 0])
      .fitExtent(
        [
          [pad, pad],
          [width - pad, height - pad],
        ],
        { type: "Sphere" },
      );
  }
  const projection = geoAzimuthalEqualArea()
    .rotate([-view.center[0], -view.center[1]])
    .clipAngle(90);
  projection.fitExtent(
    [
      [pad, pad],
      [width - pad, height - pad],
    ],
    { type: "MultiPoint", coordinates: boundsPoints(view) },
  );
  return projection.clipExtent([
    [0, 0],
    [width, height],
  ]);
}

export function worldProjection(width: number, height: number): GeoProjection {
  return geoEqualEarth()
    .rotate([-10, 0])
    .fitExtent(
      [
        [1, 1],
        [width - 1, height - 1],
      ],
      { type: "Sphere" },
    );
}

export { geoCentroid };
