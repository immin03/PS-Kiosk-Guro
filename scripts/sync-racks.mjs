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
const STORE = "guro";

const SOURCE =
  process.env.PS_OS_RACKS ||
  resolve(os.homedir(), "Projects", "ps-os", "catalog", "racks.json");

if (!existsSync(SOURCE)) {
  /* 배포 머신에는 PS-OS 저장소가 없습니다. 확인만 하는 실행이면 조용히 넘어갑니다. */
  if (process.argv.includes("--check")) {
    console.log(`정본이 없어 확인을 건너뜁니다: ${SOURCE}`);
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
 * 축척 도면이 아니라 이웃 관계와 구성이 맞는 개념도입니다.
 */
export const STORE_ID = ${JSON.stringify(store.id)};
export const STORE_NAME = ${JSON.stringify(store.name)};
export const GRID = ${JSON.stringify(store.grid)};

/* 매장 집기 — 입구 · 계산대 · 체험존처럼 상품이 놓이지 않는 자리 */
export const MARKS = ${JSON.stringify(store.marks, null, 2)};

/* 랙 — code 가 매출 히트맵 · SKU 시트와 공유하는 열쇠입니다 */
export const RACKS = ${JSON.stringify(racks, null, 2)};

export const RACK_BY_CODE = Object.fromEntries(RACKS.map((r) => [r.code, r]));

/* 랙 카테고리. 정본 기준이라 예전 rack-sections.json 보다 이쪽이 맞습니다. */
export const RACK_CAT = Object.fromEntries(RACKS.map((r) => [r.code, r.cat]));
export const RACK_ZONE = Object.fromEntries(RACKS.map((r) => [r.code, r.zone]));
`;

if (process.argv.includes("--check")) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (cur !== body) {
    console.error("src/rackLayout.js 가 PS-OS 정본과 어긋났습니다.");
    console.error("  node scripts/sync-racks.mjs 를 돌려 맞추세요.");
    process.exit(1);
  }
  console.log(`정본과 같습니다 — 랙 ${racks.length}개 · 집기 ${store.marks.length}개.`);
  process.exit(0);
}

writeFileSync(OUT, body);
console.log(
  `src/rackLayout.js 갱신 — ${store.name} · 랙 ${racks.length}개 · 집기 ${store.marks.length}개 · 격자 ${store.grid.rows}x${store.grid.cols}`
);
