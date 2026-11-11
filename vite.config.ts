import { defineConfig } from "vite";

// GitHub Pages（https://ihideck.github.io/langmap/）でも手元でも動くよう、相対のパスで書き出す
export default defineConfig({
  base: "./",
  build: { target: "es2022" },
});
