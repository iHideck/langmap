# langmap

世界の言語を、話されている地域の地図と一緒に見るサイトです。言語当てクイズ [languessr](https://github.com/iHideck/languessr) の言語データ（274 言語）を、地図とともに紹介します。

A map of where the world's languages are spoken, built from the language data of the quiz app languessr. [English](#english)

https://ihideck.github.io/langmap/

## できること

- 世界地図で、国ごとに話される言語の数を色の濃さで示す。国を押すと、その国で話される言語に絞り込む
- 言語の一覧を、地域（東アジア・ヨーロッパなど）ごとのカードで並べる。カードには、その言語が話されている所を塗った小さな地図を出す
- 名前（日本語・英語・コード）・地域・語族・文字で絞り込む
- 言語のページで、話されている国・地域を大きな地図で示し、地域・文字・語族・見分け方のコツ・本文の例・同じ国や同じ語族の言語を出す
- 国の一部だけで話される言語（バスク語・広東語・インドの各州の言語など）は、その地域だけを塗る。小さくて見えない所（香港・マルタなど）には、丸い印を付ける
- 日本語と英語、ライトとダークに対応する

## データ

| データ | 置き場所 | 出典 |
| --- | --- | --- |
| 言語（名前・地域・文字・語族・コツ・塗る国と地域のコード） | `public/data/languages.json` | languessr の `question-bank/languages.json` |
| 本文の例 | `public/data/languages.json` の `examples` | languessr の言語ガイド（Wikipedia の記事から抜粋。CC BY-SA 4.0） |
| 国の一部の地域の形 | `public/data/regions.geojson` | languessr の `app/assets/maps/speaker_map.json`（Natural Earth の州・省境から作ったもの） |
| 国境 | `public/geojson/`（コミットしない） | [iHideck/geojson](https://github.com/iHideck/geojson) の `world/countries`（Natural Earth の日本の視点の版） |

- 塗る所のコードは、国が ISO 3166-1 alpha-2（`FR`）、国の一部が ISO 3166-2（`FR-64`）など。コードは languessr で決め、ここでは書き直さない
- 国境は、`boundaries.json` で iHideck/geojson の版（タグ）と sha256 を固定し、`npm run boundaries`（`npm run dev`・`npm run build` の前にも動く）で取る
- 境界は法的な境界を示しません

## 開発

必要なものは Node.js 22 以上と Python 3（データを書き出すときだけ）です。

| コマンド | すること |
| --- | --- |
| `make setup` | 依存を入れ、国境を取る |
| `make dev` | 手元でサイトを開く（http://localhost:5173/） |
| `make check` | 型・単体テスト・ビルドを検査する（CI と同じ） |
| `make data LANGUESSR=../languessr` | languessr の作業フォルダから、言語データと地域の形を書き出し直す |
| `make boundaries` | 国境を取り直す。iHideck/geojson の版を上げたら `npm run boundaries -- --update` で sha256 を書き直す |

- languessr で言語や地域のコードを直したら、`make data` で書き出し直してコミットする
- main に push すると、GitHub Actions がビルドして GitHub Pages に公開する

## ライセンス

- コード: [MIT](LICENSE)
- 本文の例: Wikipedia の各記事の著者（CC BY-SA 4.0）。各例に元の記事へのリンクがある
- 境界: Made with Natural Earth（パブリックドメイン）。iHideck/geojson の [DATA_LICENSE.md](https://github.com/iHideck/geojson/blob/main/DATA_LICENSE.md) も参照

## English

langmap shows 274 languages from languessr on maps of where they are spoken.

- World map shaded by the number of languages per country; tap a country to list its languages.
- Cards grouped by area, each with a small map. Filter by name, area, family and script.
- Each language page has a large map, region, script, family, recognition tips, sample text from Wikipedia (CC BY-SA 4.0) and related languages.
- Languages spoken in only part of a country (Basque, Cantonese, Indian state languages…) shade just that region. Tiny places get a ring marker.
- Country boundaries come from [iHideck/geojson](https://github.com/iHideck/geojson), pinned by tag and sha256 in `boundaries.json`. Subdivisions come from Natural Earth via languessr. Boundaries have no legal status.
- Develop with `make setup`, `make dev`, `make check`. Code is MIT licensed.
