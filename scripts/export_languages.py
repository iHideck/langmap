"""languessr の言語データから、langmap が読むデータを書き出す。

    python3 scripts/export_languages.py ../languessr

読むもの（languessr の作業フォルダ）:
- question-bank/languages.json: 言語の名前・文字・語族・地域・コツ・地域のコード（regions）
- hosting/guide/*.json: 言語ガイドの本文の例（Wikipedia から抜粋。CC BY-SA 4.0）
- app/assets/maps/speaker_map.json: 国の一部の地域（州・省など）の形

書くもの:
- public/data/languages.json: サイトに出す項目だけ。languessr にしかない項目（nameForms など）は出さない
- public/data/regions.geojson: 国の一部の地域の形（RFC 7946 の GeoJSON）。国の形は iHideck/geojson から読む

同じ入力からは、同じファイルができる。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_LANGUAGES = ROOT / "public" / "data" / "languages.json"
OUT_REGIONS = ROOT / "public" / "data" / "regions.geojson"

LEVELS = ["beginner", "intermediate", "advanced"]
FIELDS = ["nameJa", "nameEn", "script", "family", "area", "region", "regionEn", "tip", "tipEn", "clues", "regions"]
MAX_EXAMPLES = 3


def _level(code: str, levels: dict[str, list[str] | str]) -> str:
    for level in LEVELS:
        members = levels.get(level)
        if members == "all" or (isinstance(members, list) and code in members):
            return level
    return "advanced"


def _examples(languessr: Path) -> tuple[dict[str, list[dict]], dict]:
    examples: dict[str, list[dict]] = {}
    license_ = {}
    for level in LEVELS:
        path = languessr / "hosting" / "guide" / f"{level}.json"
        if not path.exists():
            continue
        guide = json.loads(path.read_text(encoding="utf-8"))
        license_ = guide.get("license", license_)
        for entry in guide["languages"]:
            found = examples.setdefault(entry["code"], [])
            urls = {e["url"] for e in found}
            for example in entry.get("examples", []):
                if example["url"] not in urls and len(found) < MAX_EXAMPLES:
                    found.append({k: example[k] for k in ("text", "title", "url")})
                    urls.add(example["url"])
    return examples, license_


def _signed_area(ring: list[list[float]]) -> float:
    total = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        total += x1 * y2 - x2 * y1
    return total / 2


def _polygons(rings: list[list[int]], scale: int) -> list[list[list[list[float]]]]:
    """speaker_map の輪（外周は反時計回り、穴は時計回り）を、GeoJSON の MultiPolygon の座標にする。"""
    polygons: list[list[list[list[float]]]] = []
    for flat in rings:
        ring = [[flat[i] / scale, flat[i + 1] / scale] for i in range(0, len(flat), 2)]
        closed = ring + [ring[0]]
        if _signed_area(ring) >= 0 or not polygons:
            polygons.append([closed])
        else:
            polygons[-1].append(closed)
    return polygons


def export(languessr: Path) -> None:
    master = json.loads((languessr / "question-bank" / "languages.json").read_text(encoding="utf-8"))
    examples, license_ = _examples(languessr)
    languages = []
    for code, meta in master["languages"].items():
        entry = {"code": code, "level": _level(code, master["levels"])}
        entry.update({k: meta[k] for k in FIELDS if k in meta and meta[k] not in ("", [], {})})
        if examples.get(code):
            entry["examples"] = examples[code]
        languages.append(entry)
    OUT_LANGUAGES.parent.mkdir(parents=True, exist_ok=True)
    OUT_LANGUAGES.write_text(
        json.dumps({"examplesLicense": license_, "languages": languages}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )

    speaker_map = json.loads((languessr / "app" / "assets" / "maps" / "speaker_map.json").read_text(encoding="utf-8"))
    scale = speaker_map["scale"]
    features = [
        {
            "type": "Feature",
            "properties": {"code": code},
            "geometry": {"type": "MultiPolygon", "coordinates": _polygons(rings, scale)},
        }
        for code, rings in sorted(speaker_map["regions"].items())
    ]
    collection = {"type": "FeatureCollection", "source": speaker_map["source"], "features": features}
    OUT_REGIONS.write_text(json.dumps(collection, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(languages)} languages, {len(features)} regions")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("使い方: python3 scripts/export_languages.py <languessr の作業フォルダ>")
    export(Path(sys.argv[1]).resolve())
