#!/usr/bin/env node
/**
 * PS-OS 의 catalog/racks.json(정본) → src/rackLayout.js 를 만듭니다.
 *
 * 배치는 PS-OS 한 곳에만 적습니다. 키오스크는 매장 WebView 에서 오프라인으로도
 * 돌아야 해서 런타임에 받아오지 않고, 빌드 전에 복사해 둡니다.
 *
 *   node scripts/sync-racks.mjs           src/rackLayout.js 갱신
 *   node scripts/sync-racks.mjs --check   갱신 없이 정본과 어긋났는지만 확인
 *
 * 정본 경로는 PS_OS_RACKS 환경변수로 바꿀 수 있습니다.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "src", "rackLayout.js");
const OUT_PROMO = resolve(HERE, "..", "src", "promotions.js");
const STORE = "guro";

const SOURCE =
  process.env.PS_OS_RACKS ||
  resolve(os.homedir(), "Projects", "ps-os", "catalog", "racks.json");
const SOURCE_PROMO = resolve(dirname(SOURCE), "promotions.json");

if (!existsSync(SOURCE)) {
  /* 조용히 넘어가면 배치가 어긋나도 아무도 모릅니다. 실제로 손님을 네 칸 떨어진
     매대로 보내고 있었는데 확인은 계속 통과하고 있었습니다. 넘어가려면 그렇게
     하겠다고 적어야 합니다. */
  if (process.argv.includes("--allow-missing")) {
    console.log(`정본이 없어 확인을 건너뜁니다(--allow-missing): ${SOURCE}`);
    process.exit(0);
  }
  console.error(`정본을 찾을 수 없습니다: ${SOURCE}`);
  console.error("PS-OS 저장소 위치가 다르면 PS_OS_RACKS 로 알려주세요.");
  console.error("  PS_OS_RACKS=/경로/ps-os/catalog/racks.json node scripts/sync-racks.mjs");
  process.exit(1);
}

const doc = JSON.parse(readFileSync(SOURCE, "utf8"));
const store = doc.stores.find((s) => s.id === STORE);
if (!store) {
  console.error(`정본에 '${STORE}' 지점이 없습니다.`);
  process.exit(1);
}

const racks = [...store.racks].sort((a, b) =>
  a.code.localeCompare(b.code, "en", { numeric: true })
);

const body = `/* 자동 생성 — 직접 고치지 마세요.
 * 정본: PS-OS catalog/racks.json (${doc.meta?.updated || "날짜 미상"} 기준)
 * 갱신: node scripts/sync-racks.mjs
 *
 * 좌표는 격자 기준입니다. c=왼쪽 열, r=위쪽 행, w=너비, h=높이.
 * 판매장 비례는 도면과 맞습니다 (44,030 × 14,250mm · 3.09:1). 한 칸은 250mm 입니다.
 */
export const STORE_ID = ${JSON.stringify(store.id)};
export const STORE_NAME = ${JSON.stringify(store.name)};
export const GRID = ${JSON.stringify(store.grid)};

/* 판매장 외곽과 축척. 벽이 없으면 매대 덩어리만 허공에 떠 보입니다. */
export const OUTLINE = ${JSON.stringify(store.outline?.points || null)};
export const SCALE = ${JSON.stringify(store.scale || null)};

/* 매장 집기 — 입구 · 계산대 · 체험존처럼 상품이 놓이지 않는 자리 */
export const MARKS = ${JSON.stringify(store.marks, null, 2)};

/* 랙 — code 가 매출 히트맵 · SKU 시트와 공유하는 열쇠입니다 */
export const RACKS = ${JSON.stringify(racks, null, 2)};

export const RACK_BY_CODE = Object.fromEntries(RACKS.map((r) => [r.code, r]));

/* 랙 카테고리. 정본 기준이라 예전 rack-sections.json 보다 이쪽이 맞습니다. */
export const RACK_CAT = Object.fromEntries(RACKS.map((r) => [r.code, r.cat]));
export const RACK_ZONE = Object.fromEntries(RACKS.map((r) => [r.code, r.zone]));
`;

/* 프로모션 — 무엇을 먼저 보여줄지는 정본이 정하고, 생김새는 화면이 정합니다. */
let promoBody = null;
if (existsSync(SOURCE_PROMO)) {
  const pdoc = JSON.parse(readFileSync(SOURCE_PROMO, "utf8"));
  /* 슬라이드 = 프로모션 캘린더(프칼, records) — 2026-11-13 사용자 「여기 들어가는 슬라이드는 프칼이랑 연동」.
     구로가 걸린 건(구로 · 하남 · 구로 · 전체) 중 진행 중 · 기획 · 확정인 것만, 기간(period)을 그대로 실어
     키오스크가 그날 날짜로 거릅니다(다시 빌드하지 않아도 끝난 건은 내려가고 시작한 건은 뜸).
     프칼에 걸린 건이 하나도 없을 때만 예전 상시 목록(running)을 씁니다. */
  const SHOW = ["진행 중", "기획", "확정"];
  const forStore = (s) => /구로|전체/.test(String(s || ""));
  const span = (p) => String(p || "").split("~").map((v) => v.trim());
  const cal = (pdoc.records || [])
    .filter((r) => SHOW.includes(r.status) && forStore(r.store) && span(r.period)[0])
    .map((r) => {
      const [from, to] = span(r.period);
      const [title, sub] = String(r.name).split(/\s+—\s+/);
      return { id: r.id, src: "프칼", status: r.status, from, to: to || null, tag: r.type || "기획전",
        title, sub: sub || "", link: "https://www.phamasquare.com/event.html", image: r.kioskImage || null };
    })
    .sort((a, b) => a.from.localeCompare(b.from));
  const running = (pdoc.running || pdoc.promotions || [])
    .filter((p) => p.status === "live")
    .filter((p) => (p.channels || []).includes("kiosk"))
    .filter((p) => !p.stores || p.stores.includes(STORE))
    .sort((a, b) => (a.rank || 99) - (b.rank || 99))
    .map((p) => ({ ...p, src: "상시" }));
  const list = cal.concat(running);
  promoBody = `/* 자동 생성 — 직접 고치지 마세요.
 * 정본: PS-OS catalog/promotions.json (${pdoc.meta?.updated || "날짜 미상"} 기준)
 * 갱신: node scripts/sync-racks.mjs
 *
 * 프칼(records) 건이 먼저, 상시(running) 건은 프칼 건이 그날 하나도 없을 때만 뜹니다(src 로 가름).
 * 날짜(from · to)는 키오스크가 그날 기준으로 거릅니다.
 */
export const PROMOTIONS = ${JSON.stringify(list, null, 2)};
`;
}

if (process.argv.includes("--check")) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  const curP = existsSync(OUT_PROMO) ? readFileSync(OUT_PROMO, "utf8") : "";
  if (promoBody && curP !== promoBody) {
    console.error("src/promotions.js 가 PS-OS 정본과 어긋났습니다.");
    console.error("  node scripts/sync-racks.mjs 를 돌려 맞추세요.");
    process.exit(1);
  }
  if (cur !== body) {
    console.error("src/rackLayout.js 가 PS-OS 정본과 어긋났습니다.");
    console.error("  node scripts/sync-racks.mjs 를 돌려 맞추세요.");
    process.exit(1);
  }
  console.log(`정본과 같습니다 — 랙 ${racks.length}개 · 집기 ${store.marks.length}개.`);
  process.exit(0);
}

writeFileSync(OUT, body);
if (promoBody) writeFileSync(OUT_PROMO, promoBody);
console.log(
  `src/rackLayout.js 갱신 — ${store.name} · 랙 ${racks.length}개 · 집기 ${store.marks.length}개 · 격자 ${store.grid.rows}x${store.grid.cols}`
);
if (promoBody) {
  const n = (promoBody.match(/"id":/g) || []).length;
  console.log(`src/promotions.js 갱신 — 키오스크에 걸 프로모션 ${n}건`);
} else {
  console.log(`프로모션 정본이 없어 건너뜁니다: ${SOURCE_PROMO}`);
}
