#!/usr/bin/env node
/**
 * PS-OS 상품 원장 → src/catalogData.js (2026-11-17 사용자 「키오스크 원장 데이터는 오늘 새로 개발한 상품 원장으로 맞춰」).
 *
 *   자리(어느 랙에 무엇이 있나)  catalog/pog.json    stores[guro].racks[코드].items[] — bc · 랙 카테고리
 *   상품 이름 · 브랜드 · 가격 · 상태  catalog/products.json  items[] — bc 로 잇는다(물류 · 진열 › 상품 원장)
 *
 * 판매 종료 상품은 뺀다. 상품 원장에 없는 바코드는 POG 에 적힌 이름 · 브랜드를 그대로 쓴다.
 * 자리가 없는(POG 에 없는) 구로 취급 상품은 위치 안내를 못 하므로 싣지 않고 개수만 알린다.
 *
 *   node scripts/sync-products.mjs           src/catalogData.js 갱신
 *   node scripts/sync-products.mjs --check   갱신 없이 어긋났는지만(어긋나면 1)
 *
 * 정본 위치는 sync-racks.mjs 와 같다 — PS_OS_RACKS 의 폴더(기본 ~/Projects/ps-os/catalog).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "src", "catalogData.js");
const STORE = "guro";
const DIR = dirname(process.env.PS_OS_RACKS || resolve(os.homedir(), "Projects", "ps-os", "catalog", "racks.json"));
const POG = resolve(DIR, "pog.json"), PRODUCTS = resolve(DIR, "products.json");

for (const f of [POG, PRODUCTS]) {
  if (!existsSync(f)) {
    if (process.argv.includes("--allow-missing")) { console.log(`정본이 없어 건너뜁니다(--allow-missing): ${f}`); process.exit(0); }
    console.error(`정본을 찾을 수 없습니다: ${f}`); process.exit(1);
  }
}

const pog = JSON.parse(readFileSync(POG, "utf8"));
const master = JSON.parse(readFileSync(PRODUCTS, "utf8"));
const byBc = new Map(master.items.map((x) => [x.bc, x]));
const store = pog.stores.find((s) => s.id === STORE);
if (!store) { console.error(`POG 에 '${STORE}' 지점이 없습니다.`); process.exit(1); }

const products = [], brands = [], seenBrand = new Set(), placed = new Set();
let dropped = 0;
for (const [rack, r] of Object.entries(store.racks)) {
  for (const it of r.items || []) {
    const m = it.bc ? byBc.get(it.bc) : null;
    if (m && m.st === "판매 종료") { dropped++; continue; }
    const name = (m?.n || it.n || "").trim(), brand = (m?.br || it.br || "").trim();
    if (!name) continue;
    const cat = r.cat || "";
    if (it.bc) placed.add(it.bc);
    products.push({ name, brand, cat, rack, zone: rack.replace(/[0-9].*$/, ""), en: "", benefit: `${cat} · 섹션 ${rack}`,
      spec: "", sale: 0, bc: it.bc || "", price: m?.p ?? it.p ?? 0 });
    if (brand && !seenBrand.has(brand)) { seenBrand.add(brand); brands.push(brand); }
  }
}
const unplaced = master.items.filter((x) => (x.s || []).includes("구로") && x.st !== "판매 종료" && !placed.has(x.bc)).length;

const body = `/* 자동 생성 — 직접 고치지 마세요. 갱신: node scripts/sync-products.mjs
 * 정본: PS-OS catalog/pog.json(구로 랙 자리) + catalog/products.json(상품 원장 ${master.meta?.updated || ""}).
 * 빌드할 때만 읽습니다. 앱 코드에서 import 하지 마세요 — scripts/publish-catalog.mjs 가 화면별 조각으로 나눕니다.
 */

export const ALL_BRANDS = ${JSON.stringify(brands, null, 2)};

export const ALL_PRODUCTS = ${JSON.stringify(products, null, 2)};
`;

const note = `상품 ${products.length} · 브랜드 ${brands.length} (판매 종료 ${dropped} 뺌, 자리 없는 구로 취급 ${unplaced} 은 싣지 않음)`;
if (process.argv.includes("--check")) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (cur !== body) { console.error("src/catalogData.js 가 상품 원장과 다릅니다 — node scripts/sync-products.mjs"); process.exit(1); }
  console.log("상품 원장과 같음 — " + note); process.exit(0);
}
writeFileSync(OUT, body);
console.log("src/catalogData.js 갱신 — " + note);
