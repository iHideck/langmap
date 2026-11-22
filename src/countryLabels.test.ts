import { geoEquirectangular } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import { describe, expect, it } from "vitest";
import { rewind } from "./geo";
import { anchorOf, placeLabels, textWidth, type LabelAnchor } from "./countryLabels";

const box = (x0: number, y0: number, x1: number, y1: number): number[][][] => [
  [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ],
];

const feature = (geometry: Geometry): Feature<Geometry> => ({ type: "Feature", properties: {}, geometry: rewind(geometry) });

describe("textWidth", () => {
  it("かな・漢字は 1 字、ラテン文字は半分ほどの幅にする", () => {
    expect(textWidth("日本", 10)).toBe(20);
    expect(textWidth("Japan", 10)).toBeCloseTo(29);
  });
});

describe("anchorOf", () => {
  const projection = geoEquirectangular().scale(180 / Math.PI).translate([0, 0]);

  it("一番大きな島の中ほどに置く", () => {
    const f = feature({ type: "MultiPolygon", coordinates: [box(0, 0, 20, 10), box(50, 0, 51, 1)] });
    const a = anchorOf(projection, "XX", "国", f);
    expect(a).not.toBeNull();
    expect(a!.x).toBeCloseTo(10, 0);
    expect(a!.y).toBeCloseTo(-5, 0);
    expect(a!.w).toBeCloseTo(20, 0);
  });

  it("重心が国の外に出る形では、国の中の点を選ぶ", () => {
    // コの字形。重心は口の開いた所に落ちる
    const f = feature({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 2],
          [2, 2],
          [2, 8],
          [10, 8],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    });
    const a = anchorOf(projection, "XX", "国", f)!;
    const lon = a.x;
    const lat = -a.y;
    const inBar = lon <= 2 || lat <= 2 || lat >= 8;
    expect(inBar).toBe(true);
  });
});

describe("placeLabels", () => {
  const anchor = (code: string, x: number, w: number, area: number): LabelAnchor => ({ code, text: "国名", x, y: 50, w, h: 30, area });
  const view = { x: 0, y: 0, w: 200, h: 100 };

  it("字が収まらない国には出さない", () => {
    expect(placeLabels([anchor("A", 50, 10, 1)], 10, view)).toEqual([]);
    expect(placeLabels([anchor("A", 50, 30, 1)], 10, view).map((a) => a.code)).toEqual(["A"]);
  });

  it("重なるときは大きい国を残す", () => {
    const out = placeLabels([anchor("S", 55, 30, 1), anchor("L", 50, 40, 9), anchor("F", 150, 30, 1)], 10, view);
    expect(out.map((a) => a.code)).toEqual(["L", "F"]);
  });

  it("見えている範囲の外には出さない", () => {
    expect(placeLabels([anchor("A", 300, 30, 1)], 10, view)).toEqual([]);
  });

  it("拡大して字が小さくなると、小さな国にも出す", () => {
    expect(placeLabels([anchor("A", 50, 10, 1)], 5, view).map((a) => a.code)).toEqual(["A"]);
  });
});
