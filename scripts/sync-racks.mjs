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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
/* 지점별로 따로 만든다(2026-11-17 하남 키오스크) — src/stores/<지점>/rackLayout.js · promotions.js.
   화면은 src/rackLayout.js · src/promotions.js(고르는 파일)를 거쳐 그 주소의 지점 것을 읽는다 */
const STORES = { guro: "구로", hanam: "하남" };

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
let bad = 0;
for (const STORE of Object.keys(STORES)) {
  const OUT = resolve(HERE, "..", "src", "stores", STORE, "rackLayout.js");
  const OUT_PROMO = resolve(HERE, "..", "src", "stores", STORE, "promotions.js");
  const store = doc.stores.find((s) => s.id === STORE);
  if (!store) { console.error(`정본에 '${STORE}' 지점이 없습니다.`); process.exit(1); }

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

  /* 매대 안내 문구 — 카테고리마다 영문 이름 · 한 줄 소개 · 이런 분께 · 고르는 기준.
     하남 매대 안내(QR 손님 페이지)와 같은 정본(racks.json cats[].sign)이라 두 화면 문구가 같습니다(2026-11-13). */
  export const CAT_SIGN = ${JSON.stringify(Object.fromEntries(Object.entries(store.cats || {}).filter(([, c]) => c.sign && (c.sign.head || c.sign.who)).map(([k, c]) => [k, {
    en: c.sign.en || c.en || "", head: c.sign.head || "", sub: c.sign.headB || "", who: c.sign.who || [],
    /* 「성분 — 설명」 이 쉼표로 이어져 있음. 설명에 이미 — 가 나온 뒤에 오는 「— 」 있는 조각만 새 줄로
       (「비타민C, E — …」 가 「비타민C」 · 「E — …」 로 쪼개지던 것) */
    why: String(c.sign.why || "").split(/,\s*/).reduce((out, part) => {
      const last = out[out.length - 1];
      if (last !== undefined && !(last.includes("—") && part.includes("—"))) out[out.length - 1] = last + ", " + part;
      else out.push(part);
      return out;
    }, []).map((w) => w.trim()).filter(Boolean),
  }])), null, 2)};
  `;

  /* 프로모션 — 무엇을 먼저 보여줄지는 정본이 정하고, 생김새는 화면이 정합니다. */
  let promoBody = null;
  if (existsSync(SOURCE_PROMO)) {
    const pdoc = JSON.parse(readFileSync(SOURCE_PROMO, "utf8"));
    /* 슬라이드 = 프로모션 캘린더(프칼, records) — 2026-11-13 사용자 「여기 들어가는 슬라이드는 프칼이랑 연동」.
       구로가 걸린 건(구로 · 하남 · 구로 · 전체) 중 진행 중 · 기획 · 확정인 것만, 기간(period)을 그대로 실어
       키오스크가 그날 날짜로 거릅니다(다시 빌드하지 않아도 끝난 건은 내려가고 시작한 건은 뜸).
       프칼에 걸린 건이 하나도 없을 때만 예전 상시 목록(running)을 씁니다. */
    /* 키오스크에는 현황 「확정」 인 행사만(2026-11-19 사용자 「무조건 진행 중인 것만」 → 현황 두 축: 확정 + 기간 안 = 운영 중).
       기간은 키오스크가 그날 날짜로 거른다. 옛 현황(진행 중 · 완료)은 PS-OS 와 같이 확정으로 접는다.
       PS-OS 화면에서 고친 현황 · 이름(psos_policy.promoEd)은 PS_SUPABASE_URL · PS_SUPABASE_KEY 가 있을 때 덮는다 */
    const SHOW = ["확정"];
    const ST_OLD = { "진행": "확정", "진행 중": "확정", "완료": "확정" };
    let ed = {};
    const sbUrl = (process.env.PS_SUPABASE_URL || "").replace(/\/$/, ""), sbKey = process.env.PS_SUPABASE_KEY || "";
    if (sbUrl && sbKey) {
      try {
        const res = await fetch(sbUrl + "/rest/v1/psos_policy?select=value&key=eq.promoEd", { headers: { apikey: sbKey, Authorization: "Bearer " + sbKey } });
        if (res.ok) { const rows = await res.json(); ed = (rows[0] && rows[0].value) || {}; console.log(`프로모션 화면 고친 값 ${Object.keys(ed).length}건 덮음`); }
      } catch (e) { console.log("프로모션 고친 값 못 읽음 — 카탈로그만 씀"); }
    } else console.log("프로모션 고친 값 건너뜀(PS_SUPABASE_URL · PS_SUPABASE_KEY 없음) — 카탈로그만 씀");
    (pdoc.records || []).forEach((r, i, arr) => {
      const o = ed[r.id]; if (o && typeof o === "object") arr[i] = r = Object.assign({}, r, o);
      if (ST_OLD[r.status]) r.status = ST_OLD[r.status];
    });
    const forStore = (s) => new RegExp(STORES[STORE] + "|전체").test(String(s || ""));
    const span = (p) => String(p || "").split("~").map((v) => v.trim());
    const cal = (pdoc.records || [])
      .filter((r) => SHOW.includes(r.status) && forStore(r.store) && span(r.period)[0])
      .map((r) => {
        let [from, to] = span(r.period);
        /* 연월만 적힌 기간(2026-11)은 그 달 1일 ~ 말일로 — 끝이 비면 키오스크에 끝없이 남았다 */
        if (/^\d{4}-\d{2}$/.test(from)) { if (!to) to = from + "-31"; from = from + "-01"; }
        if (to && /^\d{4}-\d{2}$/.test(to)) to = to + "-31";
        const [title, sub] = String(r.name).split(/\s+—\s+/);
        return { id: r.id, src: "프칼", status: r.status, from, to: to || null, tag: r.type || "기획전",
          title, sub: sub || "", link: "https://www.phamasquare.com/event.html",
          /* 이벤트 목록 페이지(?view=events) 카드 아래 설명 — 손님용 한 줄(kioskDesc). 요약(summary)은 안쪽 말이라 쓰지 않는다(2026-11-19) */
          desc: r.kioskDesc || "",
          /* 장표(2026-11-19 사용자 「대표 한 장만 배너에, 누르면 나머지 장표가 슬라이드」) — kioskImages 첫 장이 배너, 전부가 상세 넘겨 보기.
             장표는 문구가 박힌 디자인이라 글자를 얹지 않는다(imageHasText) */
          image: (r.kioskImages && r.kioskImages[0]) || r.kioskImage || null,
          /* 누르면 열리는 상세는 피드(4:5) 장표가 있으면 그것(2026-11-19 사용자 「피드 있잖아」), 없으면 키오스크 장표 */
          images: r.kioskDetail || r.kioskImages || (r.kioskImage ? [r.kioskImage] : []),
          detailVideo: r.kioskDetailVideo || null,
          video: r.kioskVideo || null,
          imageHasText: !!(r.kioskImages && r.kioskImages.length) };
      })
      /* 이미 끝난 행사는 싣지 않는다(키오스크도 그날 날짜로 한 번 더 거른다) */
      .filter((p) => !p.to || p.to >= new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10))
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
    if ((promoBody && curP !== promoBody) || cur !== body) { console.error(`${STORE}: PS-OS 정본과 어긋났습니다 — node scripts/sync-racks.mjs`); bad++; }
    else console.log(`${STORE}: 정본과 같습니다 — 랙 ${racks.length}개 · 집기 ${store.marks.length}개.`);
    continue;
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, body);
  if (promoBody) writeFileSync(OUT_PROMO, promoBody);
  console.log(`${STORE}: rackLayout 갱신 — ${store.name} · 랙 ${racks.length}개 · 집기 ${store.marks.length}개 · 프로모션 ${promoBody ? (promoBody.match(/"id":/g) || []).length : 0}건`);
}
if (bad) process.exit(1);
