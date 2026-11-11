LANGUESSR ?= ../languessr

.PHONY: help setup dev check data boundaries

help: ## コマンドの一覧を表示する
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

setup: ## 依存を入れ、国境を取る
	npm ci
	npm run boundaries

dev: ## 手元でサイトを開く（http://localhost:5173/）
	npm run dev

check: ## 型・単体テスト・ビルドを検査する（CI と同じ）
	npm run check

data: ## languessr の言語データを書き出し直す（LANGUESSR=languessr の作業フォルダ）
	python3 scripts/export_languages.py $(LANGUESSR)

boundaries: ## iHideck/geojson の国境を、boundaries.json の版で取り直す
	npm run boundaries
