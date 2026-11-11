import { geoArea } from "d3-geo";
import type { Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { countryOf, isSubdivision, normalizeLon, rewind, viewOf } from "./geo";

// RFC 7946 の向き（外周は反時計回り）の 1 度四方
const square: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

describe("rewind", () => {
  it("外周を d3-geo の向きにして、小さい面にする", () => {
    expect(geoArea(square)).toBeGreaterThan(2 * Math.PI);
    const fixed = rewind(square);
    expect(geoArea(fixed)).toBeLessThan(0.001);
    expect(rewind(fixed)).toEqual(fixed);
  });
});

describe("codes", () => {
  it("国と国の一部を見分ける", () => {
    expect(isSubdivision("FR")).toBe(false);
    expect(isSubdivision("FR-64")).toBe(true);
    expect(countryOf("LV-LATGALE")).toBe("LV");
  });
});

describe("viewOf", () => {
  it("小さい所は、まわりも映るよう広げる", () => {
    const view = viewOf([{ type: "Feature", properties: {}, geometry: rewind(square) }]);
    const [[west, south], [east, north]] = view.bounds;
    expect(east - west).toBeGreaterThanOrEqual(14);
    expect(north - south).toBeGreaterThanOrEqual(9);
    expect(view.center[0]).toBeCloseTo(0.5);
  });

  it("日付変更線をまたぐ所は、またいだ側を中心にする", () => {
    const fiji: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [179, -18],
          [179, -16],
          [-179, -16],
          [-179, -18],
          [179, -18],
        ],
      ],
    };
    const view = viewOf([{ type: "Feature", properties: {}, geometry: rewind(fiji) }]);
    expect(Math.abs(view.center[0])).toBeCloseTo(180);
    expect(view.span).toBeLessThan(30);
  });

  it("経度をそろえる", () => {
    expect(normalizeLon(190)).toBe(-170);
    expect(normalizeLon(-190)).toBe(170);
  });
});
