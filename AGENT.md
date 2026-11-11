# エージェント向けの作業手順

- 構成とコマンドは `README.md` にある
- push の前に `make check` を通す（CI も PR で同じ検査を流す）
- 言語データ（`public/data/`）は手で直さない。languessr で直してから `make data LANGUESSR=<languessr の作業フォルダ>` で書き出す
- 国境のファイル（`public/geojson/`）はコミットしない。`boundaries.json` の版と sha256 で取る
- 画面の文言は `src/labels.ts` に、日本語と英語の両方を書く
- `git add` は、ファイルやディレクトリを明示する（`git add -A` は使わない）
