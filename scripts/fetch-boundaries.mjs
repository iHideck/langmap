// iHideck/geojson の国境を、boundaries.json で固定した版で取り、public/geojson/ に置く。
//
//   npm run boundaries               取って sha256 を確かめる（取り済みなら確かめるだけ）
//   npm run boundaries -- --update   版を上げたとき。取り直して sha256 を boundaries.json に書く
//
// GEOJSON_DIR に iHideck/geojson の作業フォルダを指すと、ネットにつながずにそこから写す。
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "boundaries.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const update = process.argv.includes("--update");
const outDir = join(root, "public", "geojson");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function load(path) {
  if (process.env.GEOJSON_DIR) {
    return readFile(join(process.env.GEOJSON_DIR, "data", path));
  }
  const url = `https://raw.githubusercontent.com/${config.repository}/${config.ref}/data/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

for (const [path, expected] of Object.entries(config.files)) {
  const out = join(outDir, path);
  if (!update && existsSync(out) && sha256(await readFile(out)) === expected) continue;
  const buf = await load(path);
  const actual = sha256(buf);
  if (update) {
    config.files[path] = actual;
  } else if (actual !== expected) {
    throw new Error(`${path}: sha256 が boundaries.json と違う（${actual}）`);
  }
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buf);
  console.log(`${path} (${config.ref})`);
}
if (update) await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
