import { useState, useCallback, useEffect, useMemo, useRef } from "react";

import {
  HEALTH_CATS, BEAUTY_CATS, PET_CATS, TOP_CATS, ZONES_MAP,
} from "./storeData.js";
/* 상품 원장은 앱에 싣지 않습니다. 개수만 싣고, 목록은 필요할 때 불러옵니다. */
import { COUNT_BY_BRAND, STOCKED_BRANDS, BRAND_TOTAL } from "./catalogStats.js";
import { catalogClient } from "./data/catalogClient.js";
import { resolveBaseRelativeUrl } from "./baseRelativeUrl.js";
import { filterProducts, productKey, PRODUCT_ROW_HEIGHT } from "./catalogPerformance.js";
import VirtualProductList from "./VirtualProductList.jsx";
import {
  detectLang, persistLang, t, catLabel, zoneLabel, topCatLabel, topCatSub, markLabel } from "./i18n.js";
import FloorPlan, { routeSteps } from "./FloorPlan.jsx";
import PromoBanner from "./PromoBanner.jsx";
import EntryGate from "./EntryGate.jsx";
import GuideFrame from "./GuideFrame.jsx";
import { GUIDE_PAGES, CONCERNS } from "./guide.js";
import { EMOJI as CAT_EMOJI, key as catKey } from "./categories.js";
import { UI_CSS, Section, Row, Rows, Thumb, Tile, Chip, ChipRow, Btn, Seg, Badge, Dot, GAP, PAD, INK, MUTED, MINT } from "./ui.jsx";

/* 건강 고민 칩 그림 — 카테고리 카드처럼 이모지 한 글자 */
/* 홈 묶음 제목 — 샘플(PS-OS 시안) 카드 머리 값: 15 / 600 / 제목색, 아래 12(2026-11-13 「타이틀 신규로 · 간격 여유 있게」) */
const SECTION_TITLE = { fontSize:15, fontWeight:600, color:"#2D373D", margin:"0 0 12px", lineHeight:1.45 };
const SECTION_GAP = 32;
/* 목록 · 카드 글자 한 벌(2026-11-13 「다 다르잖아, 통일」) — 제목 14 / 600 검정, 아랫줄 12 / 400 옅은 회색 */
const LIST_T = { margin:"0 0 2px", fontSize:14, fontWeight:600, color:"#2D373D", lineHeight:1.4 };
const LIST_S = { margin:0, fontSize:12, fontWeight:400, color:"#98A2AE", lineHeight:1.4 };
/* 칩 한 꼴 — 건강 고민(누름) · 이런 분께(읽기) 같은 크기 · 테 · 글자(2026-11-13) */
const CHIP = { display:"inline-flex", alignItems:"center", gap:4, padding:"7px 12px", borderRadius:999, border:"1px solid #E2E5E8",
  background:"#FFFFFF", fontSize:13, fontWeight:500, color:"#2D373D", whiteSpace:"nowrap", fontFamily:"inherit", lineHeight:1.4 };
const SECTION_COUNT = { fontSize:13, fontWeight:400, color:"#98A2AE", marginLeft:6 };
/* 매장 지도 아래 구역 목록 — 원장 구역 차례(브랜드 존은 맨 아래), 칸 수는 원장 랙 수 */
const ZONE_ORDER = ["건기식", "뷰티", "라이프", "펫", "키즈", "식품·음료", "프로모션", "브랜드존"];
const ZONE_TYPE = { "건기식":"health", "뷰티":"beauty", "라이프":"life", "펫":"pet", "키즈":"kids", "식품·음료":"life", "프로모션":"life", "브랜드존":"brand" };
const MAP_ZONES = (() => {
  const n = {};
  RACKS.forEach((r) => { n[r.zone] = (n[r.zone] || 0) + 1; });
  return ZONE_ORDER.filter((z) => n[z]).map((z) => ({ zone: z, n: n[z], type: ZONE_TYPE[z] }));
})();
const CONCERN_EMOJI = { fatigue:"⚡", sleep_stress:"😴", probiotics:"🦠", immunity:"🛡️", joint:"🦴", liver_hangover:"🍺" };
import { categoriesOf, countOf } from "./categories.js";
import { RACK_BY_CODE, RACKS, CAT_SIGN } from "./rackLayout.js";
import { BRAND, ZONE_COLOR, ZONE_FALLBACK } from "./theme.js";

/* 옛 존 코드(A~E)는 랙 코드 앞글자에서 나옵니다. 카테고리 화면 이동에 그대로 씁니다. */
/* 화면 폭. 세로 키오스크(보통 540 CSS px)는 꽉 채우고, 넓은 화면에서는 적당히 멈춥니다.
   예전 420px 은 휴대폰 기준이라 키오스크에서 양옆 120px 이 비었습니다. */
const SHELL_MAX = "min(100%, 640px)";

/* 존 칩 색 — 지도와 같은 값을 씁니다.
 *
 * storeData 에 색이 따로 박혀 있어서 지도 존 색을 바꿔도 목록의 칩은 옛 색으로
 * 남았습니다. 존이 거느린 랙을 배치 정본에서 찾아 그 구역 색을 씁니다.
 *
 * 칩 글자(A~E)와 랙 코드의 앞 글자는 다릅니다 — 펫은 칩이 E 인데 랙은
 * A1~A6 입니다. 그래서 앞 글자가 아니라 desc 에 적힌 랙 범위로 찾습니다. */
const chipColor = (zone) => {
  /* 첫 랙 하나만 보면 안 됩니다 — D존은 D1 이 뷰티 매대라 칩이 분홍으로
     나왔습니다. 범위 전체에서 가장 많은 구역을 씁니다. */
  const [from, to] = String(zone?.desc || "").split("~").map((v) => v.trim());
  const letter = (from.match(/^[A-Z]+/) || [""])[0];
  const start = Number(from.slice(letter.length));
  const end = Number((to || from).slice(letter.length)) || start;

  const tally = {};
  for (let n = start; n <= end; n += 1) {
    const rack = RACK_BY_CODE[`${letter}${n}`];
    if (rack) tally[rack.zone] = (tally[rack.zone] || 0) + 1;
  }
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return (top && ZONE_COLOR[top[0]]) || ZONE_FALLBACK;
};

/* 아무도 만지지 않으면 처음 화면으로 되돌리기까지의 시간. 0 이면 끕니다.
   매장에서 재보고 조정하세요 — 너무 짧으면 읽는 중에 화면이 날아갑니다. */
const IDLE_RESET_MS = 90_000;
const DEFAULT_LANG = "ko";

/* 홈 카테고리 부제. 예전 문구는 "A·B 섹션 · 796종" 처럼 옛 구역 표기라
   지금 랙 코드와 맞지 않았습니다. 정본에서 센 숫자를 씁니다. */
const topSub = (lang, type) =>
  t(lang, "productsCount", { n: countOf(type).toLocaleString() });

/* 홈 카테고리 카드. 브랜드존은 예전에 건기식 목록에 섞여 있었는데,
   정본 기준으로 갈라내면 갈 곳이 없어져서 자기 자리를 줍니다. */
const BRAND_CARD = { label: "브랜드 존", emoji: "💎", type: "brand" };
const FIND_BRAND_CARD = { label: "브랜드 찾기", emoji: "🔎", type: "findBrand" };
/* 다섯이면 한 칸이 비어 어색합니다. 브랜드 찾기를 더해 세 칸씩 두 줄로 맞춥니다. */
const HOME_CATS = [...TOP_CATS, BRAND_CARD, FIND_BRAND_CARD];

const legacyZoneOf = (code) => {
  const c = String(code || "");
  if (c[0] === "A" && parseInt(c.slice(1), 10) >= 31) return "E";
  return c[0];
};


/* 로고는 파일로 둡니다. JS 안에 base64 로 박아 두면 36KB 가 첫 화면
   코드와 함께 실려 와 그만큼 늦게 그려집니다. */
const LOGO_IMG = resolveBaseRelativeUrl(import.meta.env.BASE_URL, "assets/logo-wordmark.png");

const C = {
  /* 메인은 브랜드 accent1 밝은 민트입니다. 딥그린은 글자 대비가 필요한 자리에만 씁니다. */
  /* 화면의 민트는 929 C 한 값입니다. 딥그린(7722 C)과 7716 C 청록은
     화면에서 뺐습니다 — 민트 옆에 놓이면 혼자 가라앉습니다. */
  pri: BRAND.accent, priL: BRAND.accent, priD: BRAND.accent, priM: BRAND.accent,
  acc: BRAND.accent, bgL: BRAND.tint, bgF: BRAND.bg, dk: BRAND.ink,
  t1: "#2D373D", t2: "#2D373D", t3: BRAND.gray, wh: "#FFFFFF", bd: BRAND.border,
};

/* ── 판매수량 → 소셜 프루프 문구 ── */
function getSocialProof(lang, sale) {
  if (sale >= 800) return { label: t(lang, "socialHot"), hot: true };
  if (sale >= 400) return { label: t(lang, "socialFound", { n: Math.round(sale / 60) }), hot: true };
  if (sale >= 200) return { label: t(lang, "socialMonth", { n: Math.round(sale / 6) }), hot: false };
  if (sale >= 100) return { label: t(lang, "socialRepurchase"), hot: false };
  if (sale >= 50) return { label: t(lang, "socialSteady"), hot: false };
  return { label: t(lang, "socialNew"), hot: false };
}

/* ── 쉐브론 SVG ── */
function ChevronIcon({ open, size=14, color }) {
  const col = color || C.t3;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ display:"block", transition:"transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

const CARD_W = 152;

/* ── 라인 아이콘 (이모지 대체) ── */
const CAT_ICONS = {
  search:(<><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></>),
  x:(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
  pill:(<g transform="rotate(-45 12 12)"><rect x="3" y="9" width="18" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g>),
  droplet:(<path d="M12 3.5s6 6 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3.5 12 3.5z"/>),
  paw:(<><circle cx="6.5" cy="11.5" r="1.7"/><circle cx="9.8" cy="8" r="1.7"/><circle cx="14.2" cy="8" r="1.7"/><circle cx="17.5" cy="11.5" r="1.7"/><path d="M8.6 15.2c1-1.7 5.8-1.7 6.8 0 .8 1.5-.7 3.3-3.4 3.3s-4.2-1.8-3.4-3.3z"/></>),
  home:(<><path d="M4 11l8-6 8 6"/><path d="M6 10.5V19h12v-8.5"/></>),
};
function Icon({ name, size=22, color="currentColor", sw=1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      {CAT_ICONS[name] || null}
    </svg>
  );
}
const TYPE_ICON = { health:"pill", beauty:"droplet", pet:"paw", life:"home" };
const catGroupIcon = (cat) =>
  PET_CATS.some(c=>c.id===cat.id) ? "paw"
  : BEAUTY_CATS.some(c=>c.id===cat.id) ? "droplet"
  : "pill";
/* v3 프로토타입의 이모지 방식. 데이터에는 계속 emoji 가 있었는데 v8 이
   단색 아이콘으로 바꾸면서 안 쓰고 있었습니다. 카테고리는 이모지가 훨씬 빨리 읽힙니다. */
const EmojiChip = ({ e, d = 46, s = 30, mb }) => (
  <span style={{ width:d, height:d, display:"inline-flex", alignItems:"center",
    justifyContent:"center", flexShrink:0, marginBottom:mb, fontSize:s, lineHeight:1 }}
    aria-hidden="true">{e}</span>
);

const IconChip = ({ name, d=44, s=22, mb }) => (
  <span style={{ width:d, height:d, borderRadius:999, background:C.bgL, display:"inline-flex",
    alignItems:"center", justifyContent:"center", flexShrink:0, marginBottom:mb }}>
    <Icon name={name} size={s} color={C.priM} />
  </span>
);

/* ── ThumbCard: 홈 베스트 & 위치 추천 공통 (로고·가격 없이 텍스트만) ── */
function ThumbCard({ p, onPress, rank, lang = "ko" }) {
  const sp = getSocialProof(lang, p.sale);
  return (
    <div className="kiosk-card" onClick={onPress} style={{
      width:CARD_W, minWidth:CARD_W, flexShrink:0, background:C.wh, borderRadius:8, padding:14,
      border:`1px solid ${C.bd}`, cursor:"pointer", position:"relative",
      display:"flex", flexDirection:"column", gap:6, minHeight:118
    }}>
      {rank && (
        <div style={{
          width:20, height:20, borderRadius:8, flexShrink:0,
          background: rank===1 ? C.priD : rank<=3 ? C.priM : C.bgL,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:10, fontWeight:800,
          color: rank<=3 ? C.wh : C.t3,
        }}>{rank}</div>
      )}
      <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.t1, lineHeight:1.4,
        display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{p.name}</p>
      <p style={{ margin:0, fontSize:11, color:C.t2 }}>{p.brand}</p>
      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:"auto" }}>
        {sp.hot && <span style={{ fontSize:9 }}>🔥</span>}
        <span style={{ fontSize:9, color: sp.hot ? C.priM : C.t3, fontWeight: sp.hot ? 600 : 400 }}>{sp.label}</span>
      </div>
    </div>
  );
}

/* ── COMPONENTS ── */
/* 언어 — 고르기 칸 한 꼴(옅은 회색 판 · 고른 칸 흰색), 글자는 위아래 가운데(2026-11-17 「KO 위로 쏠림 · 너무 튀니 그레이로」) */
function LangToggle({ lang, setLang }) {
  return <Seg small value={lang} onChange={setLang} items={[["ko","KO"],["en","EN"],["zh","中"]]} />;
}

/* 첫 화면(매장 지도 · 상품 검색 · 이벤트 · 홈페이지 고르는 화면)으로 — 모든 화면 머리에 하나(2026-11-13 사용자).
   홈에서는 왼쪽 끝, 다른 화면에서는 언어 바로 앞. */
function StartButton({ onStart, lang }) {
  if (!onStart) return null;
  return (
    <button type="button" onClick={onStart} className="kiosk-start-btn" style={{ background:"none", border:"none", cursor:"pointer",
      padding:"6px 8px", borderRadius:8, fontFamily:"inherit", fontSize:12, fontWeight:500, color:C.t3, flexShrink:0, whiteSpace:"nowrap" }}>
      {t(lang,"gateBack")}
    </button>
  );
}

/* 머리줄 한 꼴 — 높이 56 · 흰 바탕 · 아래 선 하나. 홈은 가운데 로고(키움), 다른 화면은 ← + 제목(카테고리 상세는 매대 번호 + 영문 작게) */
function TopBar({ title, onBack, isHome, lang, setLang, onStart, badge, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", height:56, boxSizing:"border-box", padding:"0 12px 0 " + (isHome ? 12 : 8) + "px", gap:8,
      background:"#FFFFFF", position:"sticky", top:0, zIndex:100, borderBottom:"1px solid #E2E5E8" }}>
      {!isHome && onBack && (
        <button onClick={onBack} aria-label="뒤로" style={{ background:"none", border:"none", cursor:"pointer", width:36, height:36, display:"grid", placeItems:"center", borderRadius:8, flexShrink:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      )}
      {isHome ? (
        <>
          <StartButton onStart={onStart} lang={lang} />
          <div style={{ flex:1, minWidth:0, display:"flex", justifyContent:"center" }}>
            <img src={LOGO_IMG} alt="PHAMA SQUARE" style={{ height:15, maxWidth:"100%", objectFit:"contain", display:"block" }} />
          </div>
          <LangToggle lang={lang} setLang={setLang} />
        </>
      ) : (
        <>
          {badge && <Badge>{badge}</Badge>}
          <span style={{ flex:1, minWidth:0, fontSize:17, fontWeight:600, color:INK, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {title}{sub && <small style={{ marginLeft:6, fontSize:12, fontWeight:400, color:MUTED }}>{sub}</small>}
          </span>
          <StartButton onStart={onStart} lang={lang} />
          <LangToggle lang={lang} setLang={setLang} />
        </>
      )}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder, onFocus }) {
  return (
    /* 샘플 홈 검색칸 꼴(2026-11-13): 그림자 없음 · 회색 돋보기 · 올리거나 누르면 테두리 민트 */
    <div className="kiosk-search" style={{
      display:"flex", alignItems:"center", background:"#FFFFFF", borderRadius:8, boxSizing:"border-box",
      height:48, padding:"0 14px", border:"1px solid #E2E5E8", gap:8, transition:"border-color .15s",
    }}>
      <span style={{ flexShrink:0, display:"flex" }}><Icon name="search" size={18} color="#98A2AE" /></span>
      <input type="text" placeholder={placeholder || "Search"}
        value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus}
        className="kiosk-input"
        style={{ border:"none", outline:"none", flex:1, minWidth:0, fontSize:15, fontFamily:"inherit", background:"transparent", color:"#2D373D" }} />
      {value && (
        <button onClick={() => onChange("")} style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 4px",
          display:"flex", color:C.t3 }}><Icon name="x" size={16} color={C.t3} /></button>
      )}
    </div>
  );
}

/* 상품 조각을 받는 동안. 매장 서버에서 오므로 대개 한순간입니다. */
function Loading({ lang }) {
  return <p style={{ textAlign:"center", padding:"32px 0", fontSize:13, color:C.t3, margin:0 }}>{t(lang,"catalogLoading")}</p>;
}

/* 상품 줄 — 목록 줄(Row) 한 꼴: 그림 칸 · 제품명 · 브랜드(회색) · 매대 번호(글자). 카테고리는 섞여 나오는 검색 결과에만(showCat),
   매대 번호는 한 매대짜리 화면에서는 뺌(hideRack). 높이 고정(PRODUCT_ROW_HEIGHT) — 긴 목록은 보이는 줄만 그리며 이 높이로 셈 */
function ProductCard({ p, onLocate, showCat, hideRack }) {
  return (
    <div style={{ height:PRODUCT_ROW_HEIGHT, boxSizing:"border-box", borderBottom:"1px solid #EFF1F3" }}>
      <Row height={PRODUCT_ROW_HEIGHT - 1} onClick={() => onLocate?.(p)} chevron={false}
        lead={<Thumb emoji={CAT_EMOJI[catKey(p.cat || "")] || "🛍️"} img={p.img} />}
        title={p.name} sub={(p.brand || "") + (showCat && p.cat ? " · " + p.cat : "")} trail={hideRack ? null : p.rack} />
    </div>
  );
}

/* ── MAIN APP ── */
export default function KioskApp() {
  const [lang, setLangState] = useState(() => detectLang());
  const setLang = useCallback((next) => {
    setLangState(next);
    persistLang(next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : next;
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  }, [lang]);
  /* 첫 화면 — 매장 지도 · 이벤트 · 홈페이지 중에 고릅니다.
     ?start=app 을 붙이면 건너뜁니다(설치·점검용). */
  const [entered, setEntered] = useState(
    () => new URLSearchParams(window.location.search).get("start") === "app"
  );
  const [nav, setNav] = useState([{ page:"home" }]);
  const cur = nav[nav.length - 1];
  const push = useCallback((pg) => setNav(p => [...p, pg]), []);
  const pop = useCallback(() => setNav(p => p.length > 1 ? p.slice(0,-1) : p), []);
  const [activeTab, setActiveTab] = useState("home");
  const [searchQ, setSearchQ] = useState("");
  const [brandQ, setBrandQ] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchFacet, setSearchFacet] = useState("cat");
  const [recentSearch, setRecentSearch] = useState(["비타민C","오메가3","유산균","밀크씨슬"]);

  /* ── 상품 조각 ──
   * 검색 색인(상품 전체)과 카테고리별 조각을 필요할 때 불러옵니다.
   * 「ready」 가 따로 있는 이유 — 불러오는 동안 목록이 비어 있다고 「상품 준비 중」
   * 을 띄우면 안 됩니다. */
  const [searchIndex, setSearchIndex] = useState({ ready:false, products:[] });
  const [catalogByCat, setCatalogByCat] = useState({});
  /* 화면이 떠 있는 동안만 받은 조각을 씁니다. 개발 모드는 일부러 두 번
     붙였다 떼므로, 붙을 때 다시 켜 두어야 합니다 — 떼기만 하면 한 번 뗀
     뒤로 받은 조각을 전부 버립니다. */
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const ensureSearchIndex = useCallback(() =>
    catalogClient.loadSearchIndex()
      .then((d) => { if (alive.current) setSearchIndex((cur) => cur.ready ? cur : { ready:true, products:d.products }); return d.products; })
      .catch((e) => { console.error("상품 검색 색인을 불러오지 못했습니다", e); return []; }),
  []);

  const ensureCategory = useCallback((fileId) =>
    catalogClient.loadCategory(fileId)
      .then((d) => { if (alive.current) setCatalogByCat((cur) => cur[fileId]?.ready ? cur : { ...cur, [fileId]: { ready:true, products:d.products } }); })
      .catch((e) => console.error("카테고리 상품을 불러오지 못했습니다", fileId, e)),
  []);

  /* 첫 화면이 그려진 뒤, 손님이 검색창을 누르기 전에 색인을 미리 받아 둡니다.
     켤 때 싣지 않으니 첫 화면은 가볍고, 검색은 칠 때 바로 나옵니다. */
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    const id = idle(() => { ensureSearchIndex(); });
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, [ensureSearchIndex]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("locate");
    if (!q) return;
    ensureSearchIndex().then((all) => {
      const prod = all.find(p => p.name === q)
        || all.find(p => p.name.includes(q) || (p.en||"").toLowerCase().includes(q.toLowerCase()));
      if (prod && alive.current) setNav([{ page:"location", product:prod }]);
    });
  }, [ensureSearchIndex]);

  // 화면 폭에 맞춰 비율 확대 — 43/50/75인치 DID·웹에서 420px 기둥이 작게 보이지 않게
  //
  // 배율은 딱 떨어지는 값으로 깎습니다. 1080px 화면에서 폭을 그대로 나누면
  // 1080/420 = 2.571428… 이 되고, 레이아웃 1px 이 화면에서 2.571px 로 그려집니다.
  // 테두리와 글자 가장자리가 화면 픽셀 사이에 걸치면서 7픽셀 주기로 번지는
  // 자리와 선명한 자리가 번갈아 생기고, 그 주기가 화면 폭을 따라 어긋나 어느
  // 구역은 유독 더 깨져 보입니다. 2.5 처럼 0.5 단위로 깎으면 어긋남이 2픽셀
  // 주기로 고르게 반복되어 무늬로 뭉치지 않습니다. 대신 폭을 조금 덜 쓰는데,
  // 1080px 에서 30px(2.8%) 입니다. 너무 많이 버리는 폭에서는 0.25 단위로 깎습니다.
  useEffect(() => {
    const DESIGN_W = 420;
    const snap = (s) => {
      const half = Math.floor(s * 2) / 2;
      if (half >= 1 && (s - half) / s <= 0.08) return half;
      return Math.max(1, Math.floor(s * 4) / 4);
    };
    const fit = () => {
      const s = snap(Math.min(window.innerWidth / DESIGN_W, 2.6));
      document.documentElement.style.zoom = s > 1 ? String(s) : "";
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const navTo = (page, data) => push({ page, ...data });
  const tabTo = (tab) => { setActiveTab(tab); setNav([{ page:tab }]); };
  const goBack = () => { if (nav.length > 1) pop(); else if (activeTab !== "home") tabTo("home"); };

  /* 매장에 놓인 공용 단말입니다. 손님이 떠난 자리에 앞사람이 보던 화면이
     남아 있으면 다음 손님은 그 화면부터 시작하게 됩니다.
     한동안 아무도 만지지 않으면 처음으로 되돌립니다. 언어도 함께 돌립니다. */
  useEffect(() => {
    if (IDLE_RESET_MS <= 0) return;
    let timer;
    const atHome = () => nav.length === 1 && nav[0].page === "home" && !searchQ;
    const reset = () => {
      if (atHome()) return;
      setNav([{ page: "home" }]);
      setActiveTab("home");
      setSearchQ("");
      setLang(DEFAULT_LANG);
      window.scrollTo({ top: 0 });
    };
    const arm = () => { clearTimeout(timer); timer = setTimeout(reset, cur.page === "guide" ? 300_000 : IDLE_RESET_MS); };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [nav, searchQ]);
  useEffect(() => {
    if (cur.page === "catDetail" && cur.cat?.fileId) ensureCategory(cur.cat.fileId);
    if (["search","brandDetail","location"].includes(cur.page)) ensureSearchIndex();
  }, [cur.page, cur.cat?.fileId, ensureCategory, ensureSearchIndex]);
  useEffect(() => { if (searchQ) ensureSearchIndex(); }, [searchQ, ensureSearchIndex]);
  /* 다른 화면을 다녀와 홈으로 돌아오면 홈 검색칸을 비웁니다 — 전에 친 글자가 남아
     「검색 결과가 없습니다」 상자가 그대로 떠 있었습니다(2026-11-13 사용자). */
  const prevPage = useRef(cur.page);
  useEffect(() => {
    if (cur.page === "home" && prevPage.current !== "home") setSearchQ("");
    prevPage.current = cur.page;
  }, [cur.page]);

  const doSearch = (q) => {
    if (!q.trim()) return;
    setRecentSearch(prev => [q, ...prev.filter(r => r !== q)].slice(0,8));
  };

  /* 검색어가 바뀔 때만 다시 거릅니다. 전에는 화면이 다시 그려질 때마다
     1,600개를 새로 훑었습니다. 쓰이지 않던 「베스트」 정렬도 걷었습니다. */
  const searchResults = useMemo(
    () => filterProducts(searchIndex.products, searchQ),
    [searchIndex.products, searchQ]
  );
  const searchPending = !!searchQ.trim() && !searchIndex.ready;

  const homeCatLabel = (item) => item.type === "brand" ? zoneLabel(lang,"브랜드존") : item.type === "findBrand" ? t(lang,"brandFind") : topCatLabel(lang,item.type);
  const homeCatSub = (item) => item.type === "findBrand" ? t(lang,"brandFindSub",{ n: BRAND_TOTAL }) : topSub(lang, item.type);
  const openCat = (item) => item.type === "findBrand" ? navTo("brand") : navTo("catList",{catType:item.type});

  /* ── HOME ── 부품 한 벌(ui.jsx)만 씀. 묶음 사이 여백 GAP 한 값 */
  const renderHome = () => (
    <div style={{ padding:`16px ${PAD}px 24px` }}>
      <PromoBanner bleed={PAD}/>

      <div style={{ marginBottom:GAP, position:"relative" }}>
        <SearchBar value={searchQ} onChange={setSearchQ} placeholder={t(lang,"searchPlaceholder")}/>
        {searchQ && (
          <div style={{ marginTop:8, background:"#FFFFFF", borderRadius:10, border:"1px solid #E2E5E8",
            boxShadow:"0 6px 20px rgba(45,55,61,0.10)", overflow:"hidden", position:"relative", zIndex:50, padding:`4px ${PAD}px 16px` }}>
            {searchPending ? <Loading lang={lang}/> : searchResults.length > 0 ? (
              <>
                {searchResults.slice(0,5).map((p,i) => (
                  <ProductCard key={i} p={p} showCat onLocate={(prod) => { doSearch(searchQ); setSearchQ(""); navTo("location",{product:prod}); }}/>
                ))}
                <div style={{ marginTop:12 }}><Btn kind="secondary" onClick={() => { doSearch(searchQ); tabTo("search"); }}>{t(lang,"viewAllResults",{n:searchResults.length})}</Btn></div>
              </>
            ) : <p style={{ padding:"16px 0 0", textAlign:"center", fontSize:13, color:MUTED, margin:0 }}>{t(lang,"noResults")}</p>}
          </div>
        )}
      </div>

      <Section title={t(lang,"concernTitle")}>
        <ChipRow swipe>
          {CONCERNS.map((c) => (
            <Chip key={c.id} emoji={CONCERN_EMOJI[c.id]} onClick={() => { setActiveTab("guide"); setNav([{ page:"guide", path: GUIDE_PAGES.topic(c.id) }]); }}>{t(lang, c.key)}</Chip>
          ))}
        </ChipRow>
      </Section>

      <Section title={t(lang,"catShortcut")} count={HOME_CATS.length}>
        <div className="ui-swipe" style={{ display:"flex", gap:8, overflowX:"auto", margin:`0 -${PAD}px`, padding:`0 ${PAD}px` }}>
          {HOME_CATS.map(item => <Tile key={item.label} width={104} emoji={item.emoji} title={homeCatLabel(item)} onClick={() => openCat(item)} />)}
        </div>
      </Section>

      <Section>
        <FloorPlan lang={lang} heading={t(lang,"storeMap")} onRackClick={(rack) => { const ty = ZONE_TYPE[rack.zone]; if (ty) navTo("catList", { catType: ty }); }}/>
        {zoneRows()}
      </Section>
    </div>
  );

  const renderCatList = () => {
    const cats = categoriesOf(cur.catType);
    return (
      <div style={{ padding:`16px ${PAD}px 24px` }}>
        <Section title={t(lang,"catAll")} count={cats.length}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:8 }}>
            {cats.map(cat => <Tile key={cat.id} emoji={cat.emoji} title={catLabel(lang,cat)} onClick={() => navTo("catDetail",{cat})} />)}
          </div>
        </Section>
      </div>
    );
  };

  /* 매대 안내 한 틀 — 키오스크 카테고리 상세 · 하남 매대 안내가 같은 차례 · 같은 부품(2026-11-17 「매대 안내랑 카테고리 상세를 합쳐야 함」).
     한 줄 소개(큰 글씨) → 이런 분께(칩) → 고르는 기준(줄) → 매장 내 위치(지도) → 상품(줄). 문구는 PS-OS racks.json(CAT_SIGN) */
  const renderCatDetail = () => {
    const cat = cur.cat;
    const loaded = catalogByCat[cat.fileId];
    const prods = loaded?.products || [];
    const sg = CAT_SIGN[cat.name] || {};
    const firstRack = String(cat.racks || "").split(",")[0].trim();
    const oneRack = !String(cat.racks || "").includes(",");
    return (
      <div style={{ padding:`20px ${PAD}px 24px` }}>
        {(sg.head || sg.sub) && (
          <div style={{ marginBottom:GAP }}>
            {sg.head && <p style={{ margin:0, fontSize:20, fontWeight:600, color:INK, lineHeight:1.4, wordBreak:"keep-all" }}>{sg.head}</p>}
            {sg.sub && <p style={{ margin:"6px 0 0", fontSize:14, color:"#626E7C", lineHeight:1.6, wordBreak:"keep-all" }}>{sg.sub}</p>}
          </div>
        )}
        {sg.who && sg.who.length > 0 && (
          <Section title={t(lang,"whoFor")}><ChipRow>{sg.who.map((w) => <Chip key={w}>{w}</Chip>)}</ChipRow></Section>
        )}
        {sg.why && sg.why.length > 0 && (
          <Section title={t(lang,"howToPick")}>
            <Rows>{sg.why.map((w, i) => { const m = /^(.+?)\s+[—-]\s+(.+)$/.exec(w); return <Row key={i} title={m ? m[1] : w} sub={m ? m[2] : null} clamp={false} />; })}</Rows>
          </Section>
        )}
        <Section>
          <FloorPlan lang={lang} heading={t(lang,"inStoreLocation")} highlightRack={RACK_BY_CODE[firstRack] ? firstRack : undefined} detail="target"/>
        </Section>
        <Section title={t(lang,"productList")} count={prods.length || null} gap={0}>
          {!loaded ? <Loading lang={lang}/>
            : prods.length>0 ? (
              <VirtualProductList items={prods} itemKey={(p,i) => `${productKey(p)}|${i}`}
                renderItem={(p) => <ProductCard p={p} hideRack={oneRack} onLocate={(prod) => navTo("location",{product:prod})}/>}/>
            ) : <p style={{ textAlign:"center", padding:24, fontSize:13, color:MUTED }}>{t(lang,"skuNote")}</p>}
        </Section>
      </div>
    );
  };

  const renderBrand = () => {
    const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    const LABELS = ["ㄱ","ㄴ","ㄷ","ㄹ","ㅁ","ㅂ","ㅅ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ","A-Z"];
    const getInitial = (str) => {
      const c = str.charCodeAt(0);
      if (c>=0xAC00&&c<=0xD7A3) {
        const idx = Math.floor((c-0xAC00)/(21*28));
        const cho = CHO[idx];
        if(cho==="ㄲ")return"ㄱ"; if(cho==="ㄸ")return"ㄷ";
        if(cho==="ㅃ")return"ㅂ"; if(cho==="ㅆ")return"ㅅ"; if(cho==="ㅉ")return"ㅈ";
        return cho;
      }
      return "A-Z";
    };
    const filtered = brandQ ? STOCKED_BRANDS.filter(b => b.toLowerCase().includes(brandQ.toLowerCase())) : STOCKED_BRANDS;
    const grouped = {};
    filtered.forEach(b => { const k=getInitial(b); if(!grouped[k])grouped[k]=[]; grouped[k].push(b); });
    const activeLabels = LABELS.filter(l => grouped[l]?.length>0);
    return (
      <div style={{ padding:"16px 20px 24px" }}>
        <div style={{ marginBottom:16 }}><SearchBar value={brandQ} onChange={setBrandQ} placeholder={t(lang,"brandSearch")}/></div>
        {/* 초성 줄 — 누르면 그 묶음으로. 밑줄 · 민트 글자 걷고 글자만(있는 초성 검정 · 없는 초성 옅게) */}
        <div className="ui-swipe" style={{ display:"flex", gap:2, overflowX:"auto", margin:`0 -${PAD}px ${GAP - 8}px`, padding:`0 ${PAD - 8}px`,
          position:"sticky", top:56, zIndex:50, background:"#FFFFFF", borderBottom:"1px solid #EFF1F3" }}>
          {LABELS.map(l => {
            const hasB = grouped[l]?.length>0;
            return (
              <button key={l} type="button" onClick={() => { if(hasB) document.getElementById(`brand-${l}`)?.scrollIntoView({behavior:"smooth",block:"start"}); }}
                style={{ flexShrink:0, minWidth:36, height:40, padding:"0 8px", border:"none", background:"none", fontFamily:"inherit", fontSize:15,
                  fontWeight:hasB?600:400, color:hasB?INK:"#D9DDE1", cursor:hasB?"pointer":"default" }}>{l}</button>
            );
          })}
        </div>
        {activeLabels.map(label => (
          <div key={label} id={`brand-${label}`} style={{ scrollMarginTop:110 }}>
            <Section title={label} count={grouped[label].length}>
              <Rows>{grouped[label].map(b => {
                const cnt = COUNT_BY_BRAND[b] || 0;
                return <Row key={b} title={b} trail={cnt ? t(lang,"productsCount",{n:cnt}) : null} onClick={() => navTo("brandDetail",{brandName:b})} />;
              })}</Rows>
            </Section>
          </div>
        ))}
      </div>
    );
  };

  const renderBrandDetail = () => {
    const name = cur.brandName;
    const prods = searchIndex.products.filter(p => p.brand===name);
    return (
      <div style={{ padding:`16px ${PAD}px 24px` }}>
        <Section title={t(lang,"productList")} count={prods.length || null} gap={0}>
          {!searchIndex.ready ? <Loading lang={lang}/> : prods.length ? (
            <VirtualProductList items={prods} itemKey={(p,i) => `${productKey(p)}|${i}`}
              renderItem={(p) => <ProductCard p={p} showCat onLocate={(prod) => navTo("location",{product:prod})}/>}/>
          ) : <p style={{ textAlign:"center", padding:32, fontSize:13, color:MUTED }}>{t(lang,"dataPreparing")}</p>}
        </Section>
      </div>
    );
  };

  const renderSearch = () => {
    return (
      <div style={{ padding:`16px ${PAD}px 24px` }}>
        <div style={{ marginBottom:16 }}><SearchBar value={searchQ} onChange={setSearchQ} placeholder={t(lang,"searchPlaceholder")}/></div>
        {searchQ ? (
          searchPending ? <Loading lang={lang}/> :
          searchResults.length>0 ? (
            <Section title={`"${searchQ}"`} count={searchResults.length} gap={0}>
              <VirtualProductList items={searchResults} itemKey={(p,i) => `${productKey(p)}|${i}`}
                renderItem={(p) => <ProductCard p={p} showCat onLocate={(prod) => { doSearch(searchQ); navTo("location",{product:prod}); }}/>}/>
            </Section>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <p style={{ fontSize:15, fontWeight:600, color:INK, margin:"0 0 6px" }}>{t(lang,"noResults")}</p>
              <p style={{ fontSize:13, color:MUTED, margin:0 }}>{t(lang,"noResultsHint")}</p>
            </div>
          )
        ) : (
          <>
            <div style={{ marginBottom:GAP - 8 }}>
              <Seg full value={searchFacet} onChange={setSearchFacet} items={[["cat",t(lang,"filterCat")],["brand",t(lang,"filterBrand")]]} />
            </div>
            {searchFacet==="cat" ? (
              <Rows>{HOME_CATS.map(item => (
                <Row key={item.label} lead={<Thumb emoji={item.emoji} />} title={homeCatLabel(item)} sub={homeCatSub(item)}
                  onClick={() => item.type === "findBrand" ? setSearchFacet("brand") : openCat(item)} />
              ))}</Rows>
            ) : (
              <ChipRow>{STOCKED_BRANDS.map(b => <Chip key={b} onClick={() => navTo("brandDetail",{brandName:b})}>{b}</Chip>)}</ChipRow>
            )}
          </>
        )}
      </div>
    );
  };

  /* 구역 목록 — 홈 · 매장 지도 화면이 같이 씀(PS-OS 원장 구역, 브랜드 존 맨 아래). 목록 줄 한 꼴 */
  const zoneRows = () => (
    <div style={{ marginTop:12 }}>
      <Rows>{MAP_ZONES.map((z) => (
        <Row key={z.zone} lead={<Dot color={ZONE_COLOR[z.zone] || ZONE_FALLBACK} />} title={zoneLabel(lang, z.zone) || z.zone}
          trail={t(lang,"rackCount",{n:z.n})} onClick={z.type ? () => navTo("catList",{catType:z.type}) : undefined} />
      ))}</Rows>
    </div>
  );

  const renderMap = () => (
    <div style={{ padding:`16px ${PAD}px 24px` }}>
      <FloorPlan lang={lang} heading={t(lang,"storeFloor")} onRackClick={(rack) => { const ty = ZONE_TYPE[rack.zone]; if (ty) navTo("catList", { catType: ty }); }}/>
      {zoneRows()}
    </div>
  );

  const renderLocation = () => {
    const p = cur.product;
    const zone = p.zone || (() => {
      const r = p.rack || "";
      if (r[0]==="A") { const n = parseInt(r.slice(1),10); if (n>=31) return "E"; }
      return r[0] || "A";
    })();
    const zoneInfo = ZONES_MAP.find(z => z.id===zone);
    /* 랙이 무엇을 담고 있는지는 PS-OS 배치 정본이 정합니다.
       상품 데이터의 cat 은 예전 엑셀 기준이라 어긋난 랙이 있습니다. */
    const rackInfo = RACK_BY_CODE[p.rack];
    const guide = routeSteps(p.rack);
    const related = searchIndex.products.filter(r => r.cat===p.cat && r.name!==p.name).slice(0,6);
    /* 존 이름도 정본을 먼저 봅니다. 정본에 없는 랙일 때만 옛 A~E 라벨로 물러섭니다. */
    const zLbl = rackInfo
      ? (zoneLabel(lang, rackInfo.zone) || rackInfo.zone)
      : (zoneLabel(lang, zone) || zoneInfo?.label || zone);
    /* 안내는 경로에서 뽑습니다. 예전에는 존마다 "약 10m" 를 박아뒀는데
       축척 도면이 아니라 근거가 없었고, 같은 존이면 전부 같은 문구가 나왔습니다. */
    const steps = [];
    const redDot = t(lang, "step.redDot");
    steps.push({ n:1, t: t(lang, "step.start"), sub: guide?.origin ? markLabel(lang, guide.origin) + " · " + redDot : redDot });
    (guide?.passed || []).forEach((mark) => {
      steps.push({ n: steps.length + 1, t: t(lang, "step.pass", { mark: markLabel(lang, mark) }), sub: t(lang, "step.passSub") });
    });
    steps.push({
      n: steps.length + 1,
      t: t(lang, "step.arrive", { rack: p.rack }),
      sub: rackInfo ? rackInfo.cat + " · " + (zoneLabel(lang, rackInfo.zone) || rackInfo.zone) : undefined,
    });
    /* 상세 항목은 값이 실제로 있는 것만 남깁니다. 지금 데이터에서 en·spec 은
       1,606개 전부 비어 있고 benefit 은 "{카테고리} · 섹션 {랙}" 이라 위치의 사본입니다. */
    const derivedBenefit = `${p.cat} · 섹션 ${p.rack}`;
    const detailRows = [
      { label: t(lang,"labelEn"), value: (p.en || "").trim() },
      { label: t(lang,"labelBenefit"), value: (p.benefit || "").trim() === derivedBenefit ? "" : (p.benefit || "").trim() },
      { label: t(lang,"labelSpec"), value: (p.spec || "").trim() },
    ].filter((row) => row.value);

    /* 제품 위치 — 같은 부품: 큰 제목(제품명) · 회색 브랜드 → 위치 줄(매대 번호 칸) → 찾아가는 길(지도) → 단계 줄 → 주 버튼 → 함께 본 제품 줄 */
    return (
      <div style={{ padding:`20px ${PAD}px 24px` }}>
        <div style={{ marginBottom:GAP }}>
          <p style={{ margin:"0 0 4px", fontSize:13, color:"#626E7C" }}>{p.brand}</p>
          <p style={{ margin:0, fontSize:20, fontWeight:600, color:INK, lineHeight:1.4, wordBreak:"keep-all" }}>{p.name}</p>
          {detailRows.length > 0 && (
            <div style={{ marginTop:12 }}><Rows>{detailRows.map((info) => <Row key={info.label} title={info.value} sub={info.label} clamp={false} />)}</Rows></div>
          )}
        </div>
        <Section title={t(lang,"locTitle")}>
          <Row lead={<Badge size={36}>{p.rack}</Badge>} title={rackInfo ? rackInfo.cat : zLbl} sub={zLbl} />
        </Section>
        <Section>
          <FloorPlan lang={lang} heading={t(lang,"directions")} highlightRack={p.rack} showPath detail="target"/>
          <div style={{ marginTop:8 }}>
            <Rows>{steps.map((st) => <Row key={st.n} lead={<Badge>{st.n}</Badge>} title={st.t} sub={st.sub} clamp={false} />)}</Rows>
          </div>
        </Section>
        <div style={{ marginBottom:GAP }}><Btn onClick={pop}>{t(lang,"seeOther")}</Btn></div>
        {related.length>0 && (
          <Section title={t(lang,"relatedAlso")} gap={0}>
            {related.slice(0,4).map((r,i) => (
              <ProductCard key={i} p={r} onLocate={() => { window.scrollTo({ top:0, behavior:"instant" }); setNav(prev => [...prev.slice(0,-1), { page:"location", product:r }]); }} />
            ))}
          </Section>
        )}
      </div>
    );
  };

  const PAGE_TITLES = {
    home:"",
    catList: cur.catType === "brand" ? BRAND_CARD.label : topCatLabel(lang, cur.catType || "life"),
    catDetail: cur.cat ? catLabel(lang, cur.cat) : "",
    brand: t(lang,"filterBrand"),
    brandDetail: cur.brandName || "",
    search: t(lang,"tabSearch"),
    map: t(lang,"storeMap"),
    location: t(lang,"locationTitle"),
    guide: t(lang,"tabGuide"),
  };

  const renderPage = () => {
    switch(cur.page) {
      case "home": return renderHome();
      case "catList": return renderCatList();
      case "catDetail": return renderCatDetail();
      case "brand": return renderBrand();
      case "brandDetail": return renderBrandDetail();
      case "search": return renderSearch();
      case "map": return renderMap();
      case "guide": return <GuideFrame path={cur.path || GUIDE_PAGES.survey} lang={lang} />;
      case "location": return renderLocation();
      default: return renderHome();
    }
  };

  const tabs = [
    { id:"home", label:t(lang,"tabHome") },
    { id:"search", label:t(lang,"tabSearch") },
    { id:"guide", label:t(lang,"tabGuide") },
    { id:"map", label:t(lang,"storeMap") },
  ];

  if (!entered) {
    return (
      <>
      <style>{`
        .kiosk-card{transition:transform 0.15s,box-shadow 0.15s!important}
        .kiosk-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(45,55,61,0.10)!important}
        .kiosk-card:active{transform:translateY(0);box-shadow:none!important}
        html,body{background:${C.bgF};font-family:Pretendard,'Pretendard Variable',-apple-system,'Noto Sans KR','Noto Sans SC',sans-serif}
      `}</style>
      <EntryGate
        lang={lang} setLang={setLang} logo={LOGO_IMG} LangToggle={LangToggle}
        onEnter={(tab) => { setEntered(true); tabTo(tab); }}
      />
      </>
    );
  }

  return (
    <>
    <style>{`
      .kiosk-card{transition:transform 0.15s,box-shadow 0.15s,background 0.15s!important}
      .kiosk-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(45,55,61,0.10)!important}
      .kiosk-card:active{transform:translateY(0);box-shadow:none!important}
      .kiosk-tag{transition:background 0.15s,border-color 0.15s,transform 0.1s!important}
      html,body{background:${C.bgF}}
      .kiosk-swipe::-webkit-scrollbar{display:none}
      ${UI_CSS}
      .kiosk-chip{transition:border-color .15s,color .15s}
      .kiosk-map-btn{transition:border-color .15s}
      @media (hover:hover){.kiosk-map-btn:not(:disabled):hover{border-color:#01C0A4!important}.kiosk-zone-row:hover span:nth-child(2){color:#01C0A4}}
      @media (hover:hover){.kiosk-chip:hover{border-color:${C.pri}!important}}
      .kiosk-search:focus-within{border-color:#01C0A4!important}
      .kiosk-input::placeholder{color:#98A2AE!important}
      @media (hover:hover){.kiosk-search:hover{border-color:#01C0A4!important}}
      @media (hover:hover){.kiosk-start-btn:hover{background:${C.bgF}!important;color:${C.t1}!important}}
      .kiosk-input::placeholder{color:${BRAND.hint}}
      .kiosk-tag:hover{background:${BRAND.accentTint}!important;border-color:${C.pri}!important}
      .kiosk-tag:active{transform:scale(0.95)}
      .kiosk-product{transition:background 0.15s,box-shadow 0.15s!important}
      /* 상품 줄 호버는 회색 면 대신 제품명만 민트(2026-11-13 「이상한 그레이 호버 쓰지 마」) */
      @media (hover:hover){.kiosk-product:hover > div > p:first-child{color:#01C0A4!important}}
      .kiosk-btn{transition:opacity 0.15s,transform 0.1s!important}
      .kiosk-btn:hover{opacity:0.85}
      .kiosk-btn:active{transform:scale(0.97)}
      .kiosk-nav-btn{transition:all 0.15s!important}
      .kiosk-loc{transition:background 0.15s,border-color 0.15s!important}
      .kiosk-loc:hover{background:${C.bgF}!important;border-color:${C.bd}!important}
    `}</style>
    {/* 껍데기는 내용만큼만 높입니다.
        화면 폭에 맞춘 zoom 이 걸려 있어서 vh 를 쓰면 안 됩니다 — zoom 2.6 에서
        100vh 는 실제 화면의 2.6배가 되고, 그만큼 빈 자리가 아래로 늘어납니다.
        바탕색은 body 가 깔아 주므로 짧은 화면에서도 흰 자리가 생기지 않습니다. */}
    <div style={{ maxWidth:SHELL_MAX, margin:"0 auto", background:C.bgF,
      fontFamily:"Pretendard,'Pretendard Variable',-apple-system,'Noto Sans KR','Noto Sans SC',sans-serif", color:C.t1, paddingBottom:64 }}>
      <TopBar title={PAGE_TITLES[cur.page]} onBack={cur.page!=="home" ? goBack : undefined} isHome={cur.page==="home"} lang={lang} setLang={setLang}
        badge={cur.page==="catDetail" ? String(cur.cat?.racks || "").split(",")[0].trim() : undefined}
        sub={cur.page==="catDetail" ? (CAT_SIGN[cur.cat?.name] || {}).en : undefined}
        onStart={() => { setEntered(false); setNav([{ page:"home" }]); setActiveTab("home"); setSearchQ(""); window.scrollTo({ top:0 }); }}/>
      <div>{renderPage()}</div>

      {/* 바텀 내비 — 아이콘 없이 텍스트만, 활성 탭 민트 underline(배포본 꼴 그대로). 탭에 건강 가이드만 더함(2026-11-13) */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:SHELL_MAX, background:C.wh,
        borderTop:`1px solid ${C.bd}`, display:"flex", zIndex:100 }}>
        {/* 고른 탭 위의 민트 선 하나가 옆으로 미끄러져 옮겨 감(2026-11-13) */}
        {(() => { const idx = tabs.findIndex((x) => x.id === activeTab); return idx < 0 ? null : (
          <span aria-hidden="true" style={{ position:"absolute", top:-1, left:`${(100 / tabs.length) * idx}%`, width:`${100 / tabs.length}%`,
            height:2.5, background:C.pri, transition:"left .28s cubic-bezier(.4,0,.2,1)", pointerEvents:"none" }} />
        ); })()}
        {tabs.map(tab => {
          const isA = activeTab===tab.id;
          return (
            <button key={tab.id} onClick={() => {
              setActiveTab(tab.id);
              setNav([{ page:tab.id, ...(tab.id === "guide" ? { path: GUIDE_PAGES.survey } : {}) }]);
              if(tab.id==="search") setSearchQ("");
            }} className="kiosk-nav-btn" style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              background:"none", border:"none", cursor:"pointer", padding:"14px 6px 18px",
              fontFamily:"inherit", minWidth:0,
            }}>
              <span style={{
                fontSize:13, fontWeight: isA ? 700 : 500,
                color: isA ? C.priD : C.t3,
                letterSpacing:"-0.01em",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%",
              }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
    </>
  );
}
