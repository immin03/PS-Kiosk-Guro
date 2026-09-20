import assert from "node:assert/strict";
import test from "node:test";

import { getVirtualRange, filterProducts, productKey, PRODUCT_ROW_HEIGHT } from "../src/catalogPerformance.js";
import { buildStats, buildRelease } from "../scripts/publish-catalog.mjs";
import { createCatalogClient } from "../src/data/catalogClient.js";
import { resolveBaseRelativeUrl } from "../src/baseRelativeUrl.js";
import { ALL_PRODUCTS, ALL_BRANDS } from "../src/catalogData.js";
import { CATEGORIES, categoriesOf, productsOf } from "../src/categories.js";
import { COUNT_BY_RACK, COUNT_BY_BRAND, STOCKED_BRANDS } from "../src/catalogStats.js";
import { RACK_BY_CODE } from "../src/rackLayout.js";

/* ── 목록을 보이는 만큼만 그리는 계산 ───────────────────────────────── */

test("보이는 줄만 셉니다", () => {
  const r = getVirtualRange(1000, 0, 700);
  assert.equal(r.startIndex, 0);
  assert.ok(r.endIndex >= Math.ceil(700 / PRODUCT_ROW_HEIGHT));
  assert.equal(r.topSpacerHeight, 0);
  assert.equal(r.bottomSpacerHeight, (1000 - r.endIndex) * PRODUCT_ROW_HEIGHT);
});

test("빈 자리 높이를 합치면 언제나 전체 높이입니다", () => {
  for (const scroll of [0, 500, 5000, 50000, 999999]) {
    const r = getVirtualRange(1000, scroll, 700);
    const drawn = (r.endIndex - r.startIndex) * PRODUCT_ROW_HEIGHT;
    assert.equal(r.topSpacerHeight + drawn + r.bottomSpacerHeight, 1000 * PRODUCT_ROW_HEIGHT);
  }
});

test("끝까지 내려도 마지막 줄이 나옵니다", () => {
  const total = 1000;
  const r = getVirtualRange(total, total * PRODUCT_ROW_HEIGHT, 700);
  assert.equal(r.endIndex, total);
  assert.equal(r.bottomSpacerHeight, 0);
});

test("상품이 없으면 그릴 것도 없습니다", () => {
  const r = getVirtualRange(0, 0, 700);
  assert.deepEqual(r, { startIndex: 0, endIndex: 0, topSpacerHeight: 0, bottomSpacerHeight: 0 });
});

/* ── 검색 ───────────────────────────────────────────────────────────── */

const SAMPLE = [
  { name: "비타민C 1000", brand: "뉴트리", cat: "비타민C", rack: "A18", en: "Vitamin C", benefit: "비타민C · 섹션 A18" },
  { name: "펫 사료", brand: "페스룸", cat: "펫 사료 · 간식", rack: "A6", en: "", benefit: "펫 사료 · 간식 · 섹션 A6" },
];

test("이름 · 브랜드 · 영문 · 랙 번호로 찾습니다", () => {
  for (const q of ["비타민", "뉴트리", "vitamin", "A18"]) {
    assert.equal(filterProducts(SAMPLE, q).length, 1, q);
  }
});

test("앞뒤 공백은 떼고 찾습니다", () => {
  assert.equal(filterProducts(SAMPLE, "  비타민 ").length, 1);
});

test("공백만 치면 아무것도 나오지 않습니다", () => {
  /* 전에는 공백 한 칸에 상품 1,600개가 전부 나왔습니다. */
  for (const q of ["", " ", "\t"]) assert.deepEqual(filterProducts(SAMPLE, q), []);
});

test("상품마다 목록 열쇠가 다릅니다", () => {
  const keys = new Set(ALL_PRODUCTS.map((p, i) => `${productKey(p)}|${i}`));
  assert.equal(keys.size, ALL_PRODUCTS.length);
});

/* ── 배치 정본과 상품이 어긋나지 않는지 ─────────────────────────────── */

test("모든 상품의 랙이 배치 정본에 있습니다", () => {
  const unknown = [...new Set(ALL_PRODUCTS.filter((p) => !RACK_BY_CODE[p.rack]).map((p) => p.rack))];
  assert.deepEqual(unknown, [], `정본에 없는 랙: ${unknown.join(", ")}`);
});

test("개수 요약이 원장과 같습니다", () => {
  const stats = buildStats(ALL_PRODUCTS, ALL_BRANDS);
  assert.deepEqual(stats.byRack, COUNT_BY_RACK);
  assert.deepEqual(stats.byBrand, COUNT_BY_BRAND);
  assert.deepEqual(stats.stocked, STOCKED_BRANDS);
});

test("카테고리 개수가 실제 상품 수와 같습니다", () => {
  for (const c of CATEGORIES) {
    assert.equal(c.count, productsOf(c, ALL_PRODUCTS).length, c.name);
  }
});

test("카테고리에 든 상품은 그 카테고리의 랙에 있습니다", () => {
  for (const c of categoriesOf("pet")) {
    for (const p of productsOf(c, ALL_PRODUCTS)) {
      assert.ok(c.rackList.includes(p.rack), `${p.name} 이 ${c.name} 랙 밖(${p.rack})에 있습니다`);
    }
  }
});

/* ── 화면별 조각 ────────────────────────────────────────────────────── */

test("조각 묶음에 화면마다 필요한 파일이 있습니다", () => {
  const r = buildRelease({ products: ALL_PRODUCTS, brands: ALL_BRANDS, categories: CATEGORIES, productsOf });
  assert.ok(r.files.has("search-index.json"));
  assert.ok(r.files.has("brands.json"));
  for (const c of CATEGORIES) assert.ok(r.files.has(`categories/${c.fileId}.json`), c.name);
  assert.match(r.manifest.baseUrl, /^releases\/[0-9a-f]{16}\/$/);
});

test("내용이 같으면 묶음 이름도 같고, 바뀌면 달라집니다", () => {
  const args = { products: ALL_PRODUCTS, brands: ALL_BRANDS, categories: CATEGORIES, productsOf };
  assert.equal(buildRelease(args).version, buildRelease(args).version);
  const moved = ALL_PRODUCTS.map((p, i) => (i ? p : { ...p, rack: "Z9" }));
  assert.notEqual(buildRelease({ ...args, products: moved }).version, buildRelease(args).version);
});

/* ── 조각을 불러오는 쪽 ─────────────────────────────────────────────── */

const MANIFEST = {
  currentVersion: "v1",
  baseUrl: "releases/v1/",
  resources: { brands: "brands.json", searchIndex: "search-index.json", categoryRoot: "categories/" },
};

function fakeServer() {
  const calls = [];
  const fetchJson = async (url) => {
    calls.push(url);
    if (url.endsWith("manifest.json")) return MANIFEST;
    return { url };
  };
  return { calls, fetchJson };
}

test("같은 조각을 여러 번 불러도 요청은 한 번입니다", async () => {
  const { calls, fetchJson } = fakeServer();
  const client = createCatalogClient({ dataRoot: "./data", fetchJson });
  await Promise.all([client.loadSearchIndex(), client.loadSearchIndex(), client.loadSearchIndex()]);
  assert.deepEqual(calls, ["./data/manifest.json", "./data/releases/v1/search-index.json"]);
});

test("카테고리 조각은 첫 랙 번호로 찾습니다", async () => {
  const { calls, fetchJson } = fakeServer();
  const client = createCatalogClient({ dataRoot: "./data", fetchJson });
  await client.loadCategory("A31");
  assert.ok(calls.includes("./data/releases/v1/categories/a31.json"));
});

test("실패하면 기억하지 않고 다음에 다시 부릅니다", async () => {
  let n = 0;
  const fetchJson = async (url) => {
    if (url.endsWith("manifest.json")) return MANIFEST;
    if (++n === 1) throw new Error("끊김");
    return { ok: true };
  };
  const client = createCatalogClient({ dataRoot: "./data", fetchJson });
  await assert.rejects(() => client.loadBrands());
  assert.deepEqual(await client.loadBrands(), { ok: true });
});

test("하위 경로에 올려도 주소가 맞습니다", () => {
  assert.equal(resolveBaseRelativeUrl("/", "data"), "/data");
  assert.equal(resolveBaseRelativeUrl("/guro/", "data"), "/guro/data");
  assert.equal(resolveBaseRelativeUrl("./", "assets/logo-wordmark.png"), "./assets/logo-wordmark.png");
});
