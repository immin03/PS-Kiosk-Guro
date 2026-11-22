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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORES = { guro: "구로", hanam: "하남" };
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

/* 화면에서 고친 값 · POS 값 덮기(2026-11-17 사용자 「알아서 해 줘, 어차피 더미 데이터」).
 * PS-OS 물류 · 진열 › 상품 원장(/products)에서 고친 칸(psos_product_edit_now: 브랜드 · 현황 · 취급 매장 …)과
 * 「엑셀 › POS 올리기」 의 가장 최근 기준일 상품 벌(psos_pos_product: 상품명 · 브랜드 · 판매가)을 products.json 위에 덮는다.
 * 순서는 화면과 같다 — products.json → POS 칸 → 고친 칸.
 * 읽기는 본사 권한이라 빌드 환경에 PS_SUPABASE_URL · PS_SUPABASE_KEY 가 있을 때만 한다. 없거나 표가 아직 없으면 건너뛰고 말만 남긴다 */
async function overlay() {
  const url = (process.env.PS_SUPABASE_URL || "").replace(/\/$/, ""), key = process.env.PS_SUPABASE_KEY || "";
  if (!url || !key) return "덮기 건너뜀(PS_SUPABASE_URL · PS_SUPABASE_KEY 없음)";
  const get = async (path) => {
    const r = await fetch(url + "/rest/v1/" + path, { headers: { apikey: key, Authorization: "Bearer " + key } });
    if (!r.ok) throw new Error(path.split("?")[0] + " " + r.status);
    return r.json();
  };
  const notes = [];
  try {
    const last = await get("psos_pos_product?select=as_of&order=as_of.desc&limit=1");
    if (last[0]) {
      let off = 0, n = 0;
      for (;;) {
        const rows = await get(`psos_pos_product?select=barcode,name,brand,price&as_of=eq.${last[0].as_of}&order=barcode&limit=1000&offset=${off}`);
        rows.forEach((r) => { const m = byBc.get(r.barcode); if (!m) return; if (r.name) m.n = r.name; if (r.brand) m.br = r.brand; if (r.price != null) m.p = r.price; n++; });
        if (rows.length < 1000) break; off += 1000;
      }
      notes.push(`POS ${last[0].as_of} ${n}줄`);
    } else notes.push("POS 벌 없음");
  } catch (e) { notes.push("POS 못 읽음(" + e.message + ")"); }
  try {
    let off = 0, n = 0;
    for (;;) {
      const rows = await get(`psos_product_edit_now?select=barcode,value&order=barcode&limit=1000&offset=${off}`);
      rows.forEach((r) => { const m = byBc.get(r.barcode); if (!m || !r.value) return; Object.assign(m, r.value); n++; });
      if (rows.length < 1000) break; off += 1000;
    }
    notes.push(`고친 칸 ${n}줄`);
  } catch (e) { notes.push("고친 칸 못 읽음(" + e.message + ")"); }
  return "덮기 — " + notes.join(" · ");
}
const overlayNote = await overlay();
let bad = 0;
for (const STORE of Object.keys(STORES)) {
const OUT = resolve(HERE, "..", "src", "stores", STORE, "catalogData.js");
const store = pog.stores.find((s) => s.id === STORE);
if (!store) { console.error(`POG 에 '${STORE}' 지점이 없습니다.`); bad++; continue; }

const products = [], brands = [], seenBrand = new Set(), placed = new Set();
let dropped = 0;
for (const [rack, r] of Object.entries(store.racks)) {
  for (const it of r.items || []) {
    const m = it.bc ? byBc.get(it.bc) : null;
    if (m && m.st === "판매 종료") { dropped++; continue; }
    /* 상품 원장에서 구로를 취급 매장에서 뺀 상품은 진열이 남아 있어도 싣지 않는다 */
    if (m && Array.isArray(m.s) && m.s.length && !m.s.includes(STORES[STORE])) { dropped++; continue; }
    const name = (m?.n || it.n || "").trim(), brand = (m?.br || it.br || "").trim();
    if (!name) continue;
    const cat = r.cat || "";
    if (it.bc) placed.add(it.bc);
    products.push({ name, brand, cat, rack, zone: rack.replace(/[0-9].*$/, ""), en: "", benefit: `${cat} · 섹션 ${rack}`,
      spec: "", sale: 0, bc: it.bc || "", price: m?.p ?? it.p ?? 0,
      /* 상품 원장 사진 — scripts/sync-thumbs.py 가 만든 public/thumbs/<바코드>.webp 가 있으면(2026-11-22) */
      ...(it.bc && existsSync(resolve(HERE, "..", "public", "thumbs", it.bc + ".webp")) ? { img: "./thumbs/" + it.bc + ".webp" } : {}) });
    if (brand && !seenBrand.has(brand)) { seenBrand.add(brand); brands.push(brand); }
  }
}
const unplaced = master.items.filter((x) => (x.s || []).includes(STORES[STORE]) && x.st !== "판매 종료" && !placed.has(x.bc)).length;

const body = `/* 자동 생성 — 직접 고치지 마세요. 갱신: node scripts/sync-products.mjs
 * 정본: PS-OS catalog/pog.json(구로 랙 자리) + catalog/products.json(상품 원장 ${master.meta?.updated || ""}).
 * 빌드할 때만 읽습니다. 앱 코드에서 import 하지 마세요 — scripts/publish-catalog.mjs 가 화면별 조각으로 나눕니다.
 */

export const ALL_BRANDS = ${JSON.stringify(brands, null, 2)};

export const ALL_PRODUCTS = ${JSON.stringify(products, null, 2)};
`;

const note = overlayNote + " · " + `상품 ${products.length} · 브랜드 ${brands.length} (판매 종료 ${dropped} 뺌, 자리 없는 ${STORES[STORE]} 취급 ${unplaced} 은 싣지 않음)`;
if (process.argv.includes("--check")) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (cur !== body) { console.error("src/catalogData.js 가 상품 원장과 다릅니다 — node scripts/sync-products.mjs"); bad++; continue; }
  console.log(STORE + " 상품 원장과 같음 — " + note); continue;
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, body);
console.log(STORE + " catalogData 갱신 — " + note);
}
if (bad) process.exit(1);
