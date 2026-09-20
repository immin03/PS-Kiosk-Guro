/* 상품 원장을 화면별 조각으로 나눠 냅니다.
 *
 *   node scripts/publish-catalog.mjs
 *
 * 앱 번들에 상품 1,600개를 넣지 않기 위한 단계입니다. 빌드 전에 돕니다(prebuild).
 *
 *   src/catalogStats.js            랙별 · 브랜드별 개수 — 홈과 카테고리 타일이 곧바로 씁니다
 *   public/data/manifest.json      지금 쓸 조각 묶음의 이름
 *   public/data/releases/<해시>/
 *     search-index.json            검색 · 브랜드 상세 · 위치 안내
 *     brands.json                  브랜드 색인
 *     categories/<첫 랙>.json      카테고리 상세
 *
 * 묶음 이름은 내용의 해시라, 상품이 바뀌면 새 폴더가 생기고 매장 기기의 캐시가
 * 옛 데이터를 붙들지 않습니다. 옛 묶음은 지웁니다.
 *
 * 구조는 보이미(Boim.e) 성능 개선 전달본(2026-09-18, scripts/publishCatalogData.mjs)
 * 과 같습니다. 달라진 점: 카테고리를 옛 HEALTH_CATS 가 아니라 배치 정본에서 만들고,
 * 개수 요약을 함께 냅니다.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_BRANDS, ALL_PRODUCTS } from "../src/catalogData.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (value) => `${JSON.stringify(value)}\n`;

/* 개수 요약을 먼저 씁니다. categories.js 가 이것을 읽기 때문입니다. */
export function buildStats(products, brands) {
  const byRack = {};
  const byBrand = {};
  for (const p of products) {
    if (p.rack) byRack[p.rack] = (byRack[p.rack] || 0) + 1;
    if (p.brand) byBrand[p.brand] = (byBrand[p.brand] || 0) + 1;
  }
  const stocked = brands.filter((b) => byBrand[b]);
  return { byRack, byBrand, stocked, total: products.length };
}

function statsModule(stats) {
  return `/* 자동 생성 — 직접 고치지 마세요. 갱신: node scripts/publish-catalog.mjs
 * 상품 원장(catalogData.js)에서 셉니다. 상품 목록 자체는 앱에 싣지 않고
 * 개수만 싣습니다 — 홈과 카테고리 타일이 켜자마자 숫자를 보여야 하므로.
 */
export const COUNT_BY_RACK = ${JSON.stringify(stats.byRack)};
export const COUNT_BY_BRAND = ${JSON.stringify(stats.byBrand)};

/* 상품이 한 개라도 있는 브랜드 — 브랜드 태그에 씁니다. 순서는 원장 순서입니다. */
export const STOCKED_BRANDS = ${JSON.stringify(stats.stocked)};

export const PRODUCT_TOTAL = ${stats.total};
export const BRAND_TOTAL = ${stats.stocked.length};
`;
}

export function buildRelease({ products, brands, categories, productsOf }) {
  const files = new Map();
  const byBrand = {};
  for (const p of products) if (p.brand) byBrand[p.brand] = (byBrand[p.brand] || 0) + 1;

  files.set("brands.json", json({ brands: brands.map((name) => ({ name, count: byBrand[name] || 0 })) }));
  files.set("search-index.json", json({ products }));
  for (const c of categories) {
    files.set(`categories/${c.fileId}.json`, json({ categoryId: c.fileId, products: productsOf(c, products) }));
  }

  const digest = createHash("sha256");
  for (const [name, body] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    digest.update(name).update("\0").update(body).update("\0");
  }
  const version = digest.digest("hex").slice(0, 16);
  const manifest = {
    schemaVersion: 1,
    currentVersion: version,
    baseUrl: `releases/${version}/`,
    resources: { brands: "brands.json", searchIndex: "search-index.json", categoryRoot: "categories/" },
  };
  return { version, manifest, files };
}

async function main() {
  const stats = buildStats(ALL_PRODUCTS, ALL_BRANDS);
  await writeFile(path.join(root, "src/catalogStats.js"), statsModule(stats), "utf8");

  /* 요약을 쓴 뒤에 불러와야 categories.js 가 새 개수를 읽습니다. */
  const { CATEGORIES, productsOf } = await import("../src/categories.js");
  const release = buildRelease({ products: ALL_PRODUCTS, brands: ALL_BRANDS, categories: CATEGORIES, productsOf });

  const dataRoot = path.join(root, "public/data");
  const releases = path.join(dataRoot, "releases");
  const target = path.join(releases, release.version);
  await rm(target, { recursive: true, force: true });
  for (const [name, body] of release.files) {
    const file = path.join(target, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf8");
  }
  await writeFile(path.join(dataRoot, "manifest.json"), `${JSON.stringify(release.manifest, null, 2)}\n`, "utf8");

  /* 옛 묶음을 지웁니다. 저장소에 쌓이면 배포 용량만 늘어납니다. */
  for (const name of await readdir(releases)) {
    if (name !== release.version) await rm(path.join(releases, name), { recursive: true, force: true });
  }

  const cats = CATEGORIES.length;
  console.log(`상품 조각 ${release.version} — 상품 ${stats.total}개 · 브랜드 ${stats.stocked.length}개 · 카테고리 ${cats}개`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
