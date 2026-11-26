/**
 * 프로모션 상세 페이지 한 벌 만들기 — 키오스크와 (장차) 웹 프로모션 페이지가 같이 쓴다.
 *
 * 값은 PS-OS 원장 셋에서만 온다. 여기서 문구를 새로 적지 않는다.
 *   catalog/promotions.json  기록의 page 칸(offer · products · points · where · notes) + meta.pageDefaults.notes
 *   catalog/benefits.json    혜택 카탈로그 — uses[{promo, role}] 와 giftUses(사은품 품목 id → uses)
 *   catalog/festa.json       사은품 품목(gifts) — 이름 · 만든 곳 · 사진
 *   catalog/gift-stock.json  사은품 배정(allocs[{item, promo}])
 *   catalog/products.json    상품 원장(바코드 · 이름 · 브랜드 · 판매가)
 *   catalog/product-img/index.json · catalog/pog.json  상품 사진
 *
 * 사진 파일은 PS-OS 미디어 폴더(PS_OS_MEDIA, 기본 ~/Projects/ps-os — catalog/assets 는 git 밖)에서
 * 키오스크 src/promo/ben · src/promo/p 로 복사한다. 원장에 사진이 없는 사은품은 키오스크에 손으로 둔
 * src/promo/ben/<혜택 id>.png 가 있으면 그것을 쓴다(행사 장표에서 오려 낸 컷).
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";

/* 손님에게 카드로 보이는 혜택 — 응모권 · 할인 쿠폰 · 체험은 「프로모션 내용」 줄이 맡는다 */
const CARD_KINDS = ["사은품", "브랜드 증정", "자체 브랜드", "굿즈", "금", "숙박권", "상품권 · 포인트"];

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

/* 역할 글에서 손님에게 보일 이름표만 — 「1등 1칸 58개 …」 → 「1등」. 수량 · 원가는 내보내지 않는다 */
function giftLabel(role) {
  const m = /(\d+)\s*등/.exec(String(role || ""));
  return m ? { label: m[1] + "등", rank: +m[1] } : { label: "사은품", rank: 99 };
}

export function loadLedgers(catalogDir) {
  const j = (f) => readJson(resolve(catalogDir, f));
  const products = j("products.json");
  const pog = j("pog.json");
  const pogImg = {};
  for (const st of (pog && pog.stores) || []) for (const r of Object.values(st.racks || {})) for (const it of r.items || []) if (it.img && !pogImg[it.bc]) pogImg[it.bc] = it.img;
  return {
    defaults: ((j("promotions.json") || {}).meta || {}).pageDefaults || {},
    benefits: j("benefits.json") || { items: [], giftUses: {} },
    festa: j("festa.json") || { gifts: [] },
    stock: j("gift-stock.json") || { allocs: [] },
    productByBc: Object.fromEntries(((products && products.items) || []).map((x) => [x.bc, x])),
    photoByBc: ((j("product-img/index.json") || {}).items) || {},
    pogImg,
  };
}

/**
 * 기록 하나 → 상세 페이지 값. 사진은 copy(srcPath, kind, key) 가 화면에서 쓸 파일 이름을 돌려준다.
 * 상세에 보일 것이 하나도 없으면 null(장표만 있는 행사는 예전처럼 장표 넘겨 보기).
 */
export function buildPage(r, L, copy) {
  /* page 칸을 둔 기록만 — 없는 행사의 사은품 사진까지 복사하지 않는다 */
  if (!r.page) return null;
  const pg = r.page;
  /* 사은품 · 혜택 — 혜택 카탈로그에서 이 프로모션을 쓰는 것만 */
  const gifts = [];
  const seen = new Set();
  const push = (id, it, role, img) => {
    if (seen.has(id)) return; seen.add(id);
    const { label, rank } = giftLabel(role);
    gifts.push({ id, name: it.name, maker: it.maker && it.maker !== "미정" ? it.maker : "", label, rank, img: copy(img, "ben", id) });
  };
  for (const it of L.benefits.items || []) {
    if (!CARD_KINDS.includes(it.kind)) continue;
    const u = (it.uses || []).find((x) => x.promo === r.id);
    if (u) push(it.id, it, u.role, it.img || null);
  }
  for (const g of L.festa.gifts || []) {
    const u = ((L.benefits.giftUses || {})[g.id] || []).find((x) => x.promo === r.id)
      || (L.stock.allocs || []).find((a) => a.item === g.id && a.promo === r.id && { role: "" });
    if (u) push(g.id, g, u.role || "", g.img || null);
  }
  gifts.sort((a, b) => a.rank - b.rank);
  /* 상품 — 기록이 바코드로 고른 것. 사진은 기록에 적은 컷 → 상품 원장 → POG 진열 사진 순 */
  const products = (pg.products || []).map((p) => {
    const x = L.productByBc[p.bc] || {};
    return { bc: p.bc, name: p.name || x.n || "", brand: x.br || "", price: x.p || null,
      img: copy([p.img, L.photoByBc[p.bc], L.pogImg[p.bc]], "p", p.bc) };
  }).filter((p) => p.name);
  const notes = [...(L.defaults.notes || []), ...(pg.notes || [])];
  return { offer: pg.offer || [], gifts, products, points: pg.points || [], where: pg.where || null, notes };
}

/* 사진 복사기 — PS-OS 경로(/catalog/…)를 미디어 폴더에서 찾아 키오스크 src/promo/<kind>/ 로. 없으면 손으로 둔 컷 */
export function makeCopier(mediaDir, kioskPromoDir) {
  return (src, kind, key) => {
    const dir = resolve(kioskPromoDir, kind);
    mkdirSync(dir, { recursive: true });
    /* 후보를 앞에서부터 — 원장 색인에 적혀 있어도 파일이 아직 안 받아졌으면 다음 후보로 */
    for (const one of [].concat(src || [])) {
      if (!one) continue;
      const from = resolve(mediaDir, one.replace(/^\//, ""));
      if (existsSync(from)) {
        const name = String(key).replace(/[^\w.-]/g, "_") + extname(from).toLowerCase();
        copyFileSync(from, resolve(dir, name));
        return kind + "/" + name;
      }
    }
    for (const ext of [".png", ".jpg", ".webp"]) {
      const own = resolve(dir, String(key) + ext);
      if (existsSync(own)) return kind + "/" + String(key) + ext;
    }
    return null;
  };
}
