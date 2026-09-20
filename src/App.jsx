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
import { categoriesOf, countOf } from "./categories.js";
import { RACK_BY_CODE } from "./rackLayout.js";
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
function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:2, background:C.wh,
      border:`1px solid ${C.bd}`, borderRadius:999, padding:3, flexShrink:0, lineHeight:1 }}>
      {[["ko","KO"],["en","EN"],["zh","中"]].map(([id, lb]) => (
        <button key={id} type="button" onClick={() => setLang(id)} style={{
          border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:11, fontWeight:700,
          letterSpacing:".04em", padding:"3px 0", width:30, textAlign:"center",
          borderRadius:999, lineHeight:1.1, minHeight:0,
          background: lang===id ? C.pri : "transparent", color: lang===id ? C.wh : C.t2,
        }}>{lb}</button>
      ))}
    </div>
  );
}

function TopBar({ title, onBack, isHome, lang, setLang }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding: isHome ? "14px 20px" : "8px 16px", gap:8,
      background: isHome ? C.bgF : C.wh, position:"sticky", top:0, zIndex:100,
      /* 홈만 선이 없어 스크롤하면 배너가 헤더 밑으로 그냥 빨려 들어갔습니다.
         선 색은 화면 전체가 쓰는 7541 C 하나입니다. */
      borderBottom:`1px solid ${C.bd}` }}>
      {!isHome && onBack && (
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 6px", display:"flex", borderRadius:8 }}>
          <span style={{ fontSize:19, color:C.t1, lineHeight:1 }}>←</span>
        </button>
      )}
      {isHome ? (
        <>
          {/* 로고는 헤더 한가운데에 둡니다. 좁은 화면에서 언어 토글 밑으로
              들어가지 않게 남는 폭까지만 씁니다. */}
          <div style={{ position:"absolute", left:"50%", top:"calc(50% + 2px)", transform:"translate(-50%,-50%)",
            maxWidth:"calc(100% - 180px)" }}>
            <img src={LOGO_IMG} alt="PHAMA SQUARE" style={{ height:11, maxWidth:"100%", objectFit:"contain", display:"block" }} />
          </div>
          <div style={{ flex:1 }} />
          <LangToggle lang={lang} setLang={setLang} />
        </>
      ) : (
        <>
          <span style={{ flex:1, fontSize:16, fontWeight:700, color:C.t1 }}>{title}</span>
          <LangToggle lang={lang} setLang={setLang} />
        </>
      )}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder, onFocus }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", background:C.wh, borderRadius:8,
      padding:"16px 16px", border:`1px solid ${C.bd}`, gap:10,
      boxShadow:"0 2px 10px rgba(45,55,61,0.05)"
    }}>
      <span style={{ color:C.priM, flexShrink:0, display:"flex" }}><Icon name="search" size={20} color={C.priM} /></span>
      <input type="text" placeholder={placeholder || "Search"}
        value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus}
        className="kiosk-input"
        style={{ border:"none", outline:"none", flex:1, fontSize:16, fontFamily:"inherit", background:"transparent", color:C.t1 }} />
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

function ProductCard({ p, onLocate }) {
  /* 높이를 고정합니다. 긴 목록은 보이는 줄만 그리는데, 몇 번째 줄이 화면에
     있는지를 이 높이로 셉니다. 이름과 브랜드는 한 줄씩이라 넘치지 않습니다. */
  return (
    <div className="kiosk-product" onClick={() => onLocate?.(p)}
      style={{ display:"flex", gap:12, height:PRODUCT_ROW_HEIGHT, boxSizing:"border-box",
        borderBottom:`1px solid ${C.bd}`, alignItems:"center", cursor:"pointer" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:"0 0 5px", fontSize:14, fontWeight:600, color:C.t1, lineHeight:1.45,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
        <p style={{ margin:0, fontSize:12, color:C.t2, lineHeight:1.3,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.brand} · {p.cat}</p>
      </div>
      <div className="kiosk-loc" style={{
        background:C.wh, border:`1px solid ${C.bd}`, borderRadius:8,
        padding:"6px 10px", display:"flex", alignItems:"center", gap:4,
        flexShrink:0, marginLeft:8
      }}>
        <span style={{ fontSize:12, fontWeight:600, color:C.t1 }}>{p.rack}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",opacity:0.5}}><polyline points="9 18 15 12 9 6"/></svg>
      </div>
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
  useEffect(() => {
    const DESIGN_W = 420;
    const fit = () => {
      const s = Math.min(window.innerWidth / DESIGN_W, 2.6);
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
    const arm = () => { clearTimeout(timer); timer = setTimeout(reset, IDLE_RESET_MS); };
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

  /* ── HOME ── */
  const renderHome = () => (
    <div style={{ padding:"16px 20px 24px" }}>
      {/* 운영 중인 혜택 — 순서는 PS-OS 프로모션 정본이 정합니다 */}
      <PromoBanner bleed={20}/>

      {/* 통합 검색 */}
      <div style={{ marginBottom:24, position:"relative" }}>
        <SearchBar value={searchQ} onChange={setSearchQ} placeholder={t(lang,"searchPlaceholder")}/>
        {searchQ && (
          <div style={{ marginTop:8, background:C.wh, borderRadius:8, border:`1px solid ${C.bd}`,
            boxShadow:"0 6px 20px rgba(45,55,61,0.12)", overflow:"hidden", position:"relative", zIndex:50 }}>
            {searchPending ? <Loading lang={lang}/> : searchResults.length > 0 ? (
              <>
                <p style={{ fontSize:11, color:C.t3, margin:"12px 20px 4px" }}>{t(lang,"resultsCount",{n:searchResults.length})}</p>
                <div style={{ padding:"0 20px" }}>
                  {searchResults.slice(0,5).map((p,i) => (
                    <ProductCard key={i} p={p} onLocate={(prod) => {
                      doSearch(searchQ); setSearchQ(""); navTo("location",{product:prod});
                    }}/>
                  ))}
                </div>
                <div style={{ padding:"8px 20px 16px" }}>
                  <button onClick={() => { doSearch(searchQ); tabTo("search"); }} style={{
                    width:"100%", padding:"14px", borderRadius:8,
                    background:BRAND.line, border:`1px solid ${C.bd}`, cursor:"pointer", fontFamily:"inherit",
                    fontSize:13, fontWeight:600, color:C.t2
                  }}>{t(lang,"viewAllResults",{n:searchResults.length})}</button>
                </div>
              </>
            ) : (
              <p style={{ padding:"20px", textAlign:"center", fontSize:13, color:C.t3 }}>{t(lang,"noResults")}</p>
            )}
          </div>
        )}
      </div>

      {/* 카테고리 바로가기 */}
      <p style={{ fontSize:13, fontWeight:700, color:C.t1, margin:"0 0 10px", letterSpacing:"-0.01em" }}>{t(lang,"catShortcut")}</p>
      {/* 한 줄로 밀어 봅니다. 왼쪽은 화면 여백을 지키고 오른쪽은 열어 둬서
          다음 카드가 걸쳐 보이게 합니다 — 더 있다는 것이 보여야 밉니다. */}
      {/* overflow-x 를 열면 세로도 함께 잘립니다. 카드가 호버로 2px 뜨면서
          위가 잘리고 그림자도 먹혔습니다. 안쪽 여백으로 뜰 자리를 만들고
          바깥 여백을 같은 만큼 당겨 배치는 그대로 둡니다. */}
      <div className="kiosk-swipe" style={{
        display:"flex", gap:8, overflowX:"auto",
        marginTop:-6, paddingTop:6, paddingBottom:8, marginBottom:16,
        marginLeft:-6, paddingLeft:6, marginRight:-20, paddingRight:20,
        WebkitOverflowScrolling:"touch", msOverflowStyle:"none", scrollbarWidth:"none",
      }}>
        {HOME_CATS.map(item => (
          <div
            key={item.label}
            /* 예전에는 tabTo("brand") 였습니다. 브랜드는 바텀 탭이 아니라서
               활성 탭이 셋 다 꺼진 채로 남았습니다. 눌러서 들어간 화면이니
               있던 탭을 그대로 두고 쌓습니다. */
            onClick={() => item.type === "findBrand" ? navTo("brand") : navTo("catList",{catType:item.type})}
            className="kiosk-card"
            style={{
              background:C.wh, borderRadius:8, padding:"20px 12px", border:`1px solid ${C.bd}`, cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center",
              flex:"0 0 auto", width:118
            }}
          >
            <EmojiChip e={item.emoji} d={46} s={30} mb={10} />
            <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:C.t1, lineHeight:1.45 }}>
              {item.type === "brand" ? zoneLabel(lang,"브랜드존") : item.type === "findBrand" ? t(lang,"brandFind") : topCatLabel(lang,item.type)}
            </p>
            <p style={{ margin:0, fontSize:11, color:C.t2, lineHeight:1.45 }}>
              {item.type === "findBrand" ? t(lang,"brandFindSub",{ n: BRAND_TOTAL }) : topSub(lang, item.type)}
            </p>
          </div>
        ))}
      </div>

      {/* 매장 지도 */}
      <div style={{ marginBottom:12 }}>
        <FloorPlan lang={lang} heading={t(lang,"storeMap")} onRackClick={(rack) => {
          const zone = ZONES_MAP.find(z => z.id === legacyZoneOf(rack.code));
          if (zone) navTo("catList", { catType: zone.catType });
        }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {ZONES_MAP.map(z => (
          <div key={z.id} onClick={() => navTo("catList",{catType:z.catType})} className="kiosk-card" style={{
            display:"flex", gap:10, background:C.wh, borderRadius:8, padding:"10px 12px",
            border:`1px solid ${C.bd}`, alignItems:"center", cursor:"pointer"
          }}>
            <div style={{ width:30, height:30, borderRadius:8, background:chipColor(z), flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center", color:C.wh, fontWeight:700, fontSize:13 }}>{z.id}</div>
            <div>
              <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:600, lineHeight:1.35 }}>{zoneLabel(lang,z.id)}</p>
              <p style={{ margin:0, fontSize:11, color:C.t2, lineHeight:1.35 }}>{t(lang,"zone."+z.id+".desc")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCatList = () => {
    const type = cur.catType;
    /* 카테고리는 배치 정본에서 옵니다. 예전에는 뷰티 목록을 정규식으로 걸러
       '생활·위생'을 만들었는데, 구강용품이 건기식에 들어가고 브랜드존 매대가
       카테고리에 섞이는 문제가 있었습니다. */
    const cats = categoriesOf(type);
    return (
      <div style={{ padding:"16px 20px 24px" }}>
        <p style={{ fontSize:13, color:C.t2, margin:"0 0 16px" }}>{t(lang,"productsCount",{n:cats.reduce((s,c)=>s+c.count,0).toLocaleString()})}</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {cats.map(cat => (
            <div key={cat.id} onClick={() => navTo("catDetail",{cat})} className="kiosk-card" style={{
              background:C.wh, borderRadius:8, padding:"20px 10px", textAlign:"center",
              border:`1px solid ${C.bd}`, cursor:"pointer"
            }}>
              <EmojiChip e={cat.emoji} d={46} s={30} mb={10} />
              <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:C.t1, lineHeight:1.45 }}>{catLabel(lang,cat)}</p>
              <p style={{ margin:0, fontSize:11, color:C.t2 }}>{t(lang,"productsCount",{n:cat.count})}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCatDetail = () => {
    const cat = cur.cat;
    const loaded = catalogByCat[cat.fileId];
    const prods = loaded?.products || [];
    return (
      <div style={{ padding:"16px 20px 24px" }}>
        {/* 이름은 헤더가 답니다. 여기서 또 적으면 같은 말이 두 줄로 겹칩니다. */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <EmojiChip e={cat.emoji} d={44} s={28} />
          <p style={{ margin:0, fontSize:13, color:C.t2 }}>{t(lang,"productsCountZone",{n:cat.count, zone:zoneLabel(lang,cat.zone)||cat.zone, rack:cat.racks})}</p>
        </div>
        <div style={{ marginBottom:16 }}>
          <FloorPlan lang={lang} heading={t(lang,"inStoreLocation")}
            highlightZone={RACK_BY_CODE[String(cat.racks||"").split(",")[0].trim()]?.zone}/>
        </div>
        <p style={{ fontSize:13, fontWeight:700, color:C.t2, margin:"0 0 8px" }}>{prods.length>0?t(lang,"productListN",{n:prods.length}):t(lang,"productList")}</p>
        {!loaded ? <Loading lang={lang}/>
          : prods.length>0 ? (
            <VirtualProductList items={prods} itemKey={(p,i) => `${productKey(p)}|${i}`}
              renderItem={(p) => <ProductCard p={p} onLocate={(prod) => navTo("location",{product:prod})}/>}/>
          ) : <p style={{ textAlign:"center", padding:24, fontSize:13, color:C.t3 }}>{t(lang,"skuNote")}</p>}
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
        <p style={{ fontSize:11, color:C.t3, margin:"0 0 12px" }}>{t(lang,"brandsTotal",{n:filtered.length})}</p>
        <style>{`.brand-nav-wrap::-webkit-scrollbar{display:none}`}</style>
        <div className="brand-nav-wrap" style={{
          display:"flex", overflowX:"auto", marginLeft:-20, marginRight:-20, paddingLeft:20, paddingRight:20, paddingTop:8, paddingBottom:12,
          WebkitOverflowScrolling:"touch", msOverflowStyle:"none", scrollbarWidth:"none",
          borderBottom:`1px solid ${C.bd}`, background:C.wh, position:"sticky", top:44, zIndex:50
        }}>
          {LABELS.map(l => {
            const hasB = grouped[l]?.length>0;
            return (
              <button key={l} onClick={() => { if(hasB) document.getElementById(`brand-${l}`)?.scrollIntoView({behavior:"smooth",block:"start"}); }}
                style={{ padding:"12px 14px", border:"none", background:"none",
                  cursor:hasB?"pointer":"default", fontSize:15, fontFamily:"inherit",
                  fontWeight:hasB?700:400, color:hasB?C.priD:C.t3+"55", flexShrink:0,
                  borderBottom:hasB?`2.5px solid ${C.pri}`:"2.5px solid transparent", marginBottom:-1 }}>{l}</button>
            );
          })}
        </div>
        <div style={{ height:16 }}/>
        {activeLabels.map(label => (
          <div key={label} id={`brand-${label}`} style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <span style={{ fontSize:18, fontWeight:800, color:C.priD }}>{label}</span>
              <div style={{ flex:1, height:1, background:C.bd }}/>
              <span style={{ fontSize:11, color:C.t3 }}>{grouped[label].length}</span>
            </div>
            {grouped[label].map(b => {
              /* 전에는 브랜드마다 상품 1,600개를 두 번씩 훑었습니다(한 화면에 65만 번).
                 빌드 때 센 개수를 씁니다. */
              const cnt = COUNT_BY_BRAND[b] || 0;
              const hasProd = cnt > 0;
              return (
                <div key={b} className="kiosk-product" onClick={() => navTo("brandDetail",{brandName:b})} style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"13px 0", borderBottom:`1px solid ${C.bd}10`, cursor:"pointer"
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:hasProd?600:400, color:hasProd?C.t1:C.t2 }}>{b}</span>
                    {/* 민트 글자에 회색 기운 도는 배경이라 뿌옇게 뭉쳤습니다. 개수는 이
                          화면의 주인공이 아니고, 다른 화면에서도 회색 글자로만 적습니다. */}
                      {hasProd && <span style={{ fontSize:12, color:C.t3, fontWeight:500 }}>{t(lang,"productsCount",{n:cnt})}</span>}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",opacity:0.45}}><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderBrandDetail = () => {
    const name = cur.brandName;
    const prods = searchIndex.products.filter(p => p.brand===name);
    return (
      <div style={{ padding:"16px 20px 24px" }}>
        <div style={{ padding:"0 0 12px" }}>
          <p style={{ margin:0, fontSize:13, color:C.t2 }}>{prods.length>0?t(lang,"showingProducts",{n:prods.length}):t(lang,"dataPending")}</p>
        </div>
        <div style={{ height:1, background:C.bd, margin:"0 0 8px" }}/>
        {!searchIndex.ready ? <Loading lang={lang}/> : (
          <>
            <VirtualProductList items={prods} itemKey={(p,i) => `${productKey(p)}|${i}`}
              renderItem={(p) => <ProductCard p={p} onLocate={(prod) => navTo("location",{product:prod})}/>}/>
            {prods.length===0 && <p style={{ textAlign:"center", padding:32, fontSize:13, color:C.t3 }}>{t(lang,"dataPreparing")}</p>}
          </>
        )}
      </div>
    );
  };

  const renderSearch = () => {
    return (
      <div style={{ padding:"16px 20px 24px" }}>
        <div style={{ marginBottom:16 }}><SearchBar value={searchQ} onChange={setSearchQ} placeholder={t(lang,"searchPlaceholder")}/></div>
        {searchQ ? (
          searchPending ? <Loading lang={lang}/> :
          searchResults.length>0 ? (
            <div>
              <p style={{ fontSize:12, color:C.t2, margin:"0 0 8px" }}><strong style={{color:C.t1}}>"{searchQ}"</strong> {t(lang,"productsCount",{n:searchResults.length})}</p>
              {/* 「비타민」 하나에 수백 줄이 나옵니다. 보이는 줄만 그립니다. */}
              <VirtualProductList items={searchResults} itemKey={(p,i) => `${productKey(p)}|${i}`}
                renderItem={(p) => <ProductCard p={p} onLocate={(prod) => { doSearch(searchQ); navTo("location",{product:prod}); }}/>}/>
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <p style={{ fontSize:32, margin:"0 0 12px" }}>🔍</p>
              <p style={{ fontSize:15, fontWeight:600, color:C.t1, margin:"0 0 6px" }}>{t(lang,"noResults")}</p>
              <p style={{ fontSize:13, color:C.t2, margin:0 }}>{t(lang,"noResultsHint")}</p>
            </div>
          )
        ) : (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {[["cat",t(lang,"filterCat")],["brand",t(lang,"filterBrand")]].map(([id,lb]) => (
                <button key={id} onClick={() => setSearchFacet(id)} style={{
                  flex:1, padding:"11px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13,
                  fontWeight:700, background: searchFacet===id ? C.priM : C.wh,
                  color: searchFacet===id ? C.wh : C.t2,
                  border:`1px solid ${searchFacet===id ? C.priM : C.bd}`
                }}>{lb}</button>
              ))}
            </div>
            {searchFacet==="cat" ? (
              HOME_CATS.map(item => (
                <div
                  key={item.label}
                  onClick={() => item.type === "findBrand" ? setSearchFacet("brand") : navTo("catList",{catType:item.type})}
                  className="kiosk-card"
                  style={{
                    display:"flex", alignItems:"center", gap:14, background:C.wh, borderRadius:8,
                    padding:14, border:`1px solid ${C.bd}`, marginBottom:8, cursor:"pointer"
                  }}
                >
                  <EmojiChip e={item.emoji} d={44} s={28} />
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 7px", fontSize:14, fontWeight:600, lineHeight:1.45 }}>
                      {item.type === "brand" ? zoneLabel(lang,"브랜드존") : item.type === "findBrand" ? t(lang,"brandFind") : topCatLabel(lang,item.type)}
                    </p>
                    <p style={{ margin:0, fontSize:12, color:C.t3 }}>
                      {item.type === "findBrand" ? t(lang,"brandFindSub",{ n: BRAND_TOTAL }) : topSub(lang, item.type)}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",opacity:0.5}}><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {STOCKED_BRANDS.map(b => (
                  <span key={b} onClick={() => navTo("brandDetail",{brandName:b})} className="kiosk-tag" style={{
                    background:C.wh, borderRadius:999, padding:"9px 15px", fontSize:13, color:C.t1,
                    fontWeight:500, cursor:"pointer", border:`1px solid ${C.bd}`
                  }}>{b}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderMap = () => (
    /* 지도는 이 화면의 본체라 바깥 여백을 줄였습니다. 지도 카드와 아래
       목록이 같은 선에서 시작해야 합니다 — 목록에만 여백을 더 주었더니
       왼쪽 끝이 8px 어긋나 보였습니다. */
    <div style={{ padding:"12px 16px 24px" }}>
      <div style={{ marginBottom:12 }}>
        <FloorPlan lang={lang} heading={t(lang,"storeFloor")} onRackClick={(rack) => {
          const zone = ZONES_MAP.find(z => z.id===legacyZoneOf(rack.code));
          if (zone) navTo("catList", { catType: zone.catType });
        }}/>
      </div>
      {ZONES_MAP.map(z => (
        <div key={z.id} onClick={() => navTo("catList",{catType:z.catType})} className="kiosk-card" style={{
          display:"flex", gap:12, marginBottom:8, background:C.wh, borderRadius:8,
          padding:"14px 16px", border:`1px solid ${C.bd}`, alignItems:"center", cursor:"pointer"
        }}>
          <div style={{ width:38, height:38, borderRadius:8, background:chipColor(z), flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center", color:C.wh, fontWeight:700, fontSize:15 }}>{z.id}</div>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 3px", fontSize:14, fontWeight:600, lineHeight:1.35 }}>{zoneLabel(lang,z.id)}</p>
            <p style={{ margin:0, fontSize:12, color:C.t2, lineHeight:1.35 }}>{t(lang,"zone."+z.id+".desc")}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",opacity:0.5}}><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      ))}
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

    return (
      <div style={{ padding:"16px 20px 24px" }}>
        <div style={{ background:C.wh, borderRadius:8, border:`1px solid ${C.bd}`, marginBottom:14, overflow:"hidden" }}>
          <div style={{ padding:16 }}>
            <p style={{ margin:"0 0 6px", fontSize:12, color:C.priD, fontWeight:600, lineHeight:1.45 }}>{p.brand}</p>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:C.t1, lineHeight:1.35 }}>{p.name}</p>
          </div>
          {/* 카테고리와 위치는 바로 아래 배지가 이미 말합니다. 여기서는 배지가
              말하지 않는 것만 보여주고, 그럴 것이 없으면 토글을 내지 않습니다.
              benefit 은 "{카테고리} · 섹션 {랙}" 으로 만들어진 값이라 위치의 사본입니다. */}
          {detailRows.length > 0 && (
            <>
              <div onClick={() => setInfoOpen(!infoOpen)} style={{
                padding:"11px 16px", borderTop:`1px solid ${C.bd}`, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                background: infoOpen ? C.bgF : C.wh, transition:"background 0.15s"
              }}>
                <span style={{ fontSize:12, color:C.t2, fontWeight:500 }}>{t(lang,"detailToggle")}</span>
                <ChevronIcon open={infoOpen} size={13} color={C.t3}/>
              </div>
              {infoOpen && (
                <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${C.bd}` }}>
                  <div style={{ paddingTop:14, display:"flex", flexDirection:"column", gap:10 }}>
                    {detailRows.map(info => (
                      <div key={info.label} style={{ display:"flex", fontSize:13, lineHeight:1.5 }}>
                        <span style={{ color:C.t3, minWidth:80, flexShrink:0 }}>{info.label}</span>
                        <span style={{ fontWeight:500, color:C.t1 }}>{info.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 위치와 지도는 같은 답이라 한 상자에 담고 선으로만 나눕니다. */}
        <div style={{ background:C.wh, borderRadius:8, border:`1px solid ${C.bd}`, marginBottom:14, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px" }}>
            <div style={{ width:42, height:42, borderRadius:8, background:chipColor(zoneInfo), flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center", color:C.wh, fontWeight:800, fontSize:17 }}>{zone}</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 7px", fontSize:14, fontWeight:700, color:C.t1, lineHeight:1.45 }}>{t(lang,"locLine",{zone:zLbl, rack:p.rack})}</p>
              <p style={{ margin:0, fontSize:12, color:C.t2 }}>{rackInfo ? rackInfo.cat : zLbl}</p>
            </div>
          </div>

          <div style={{ borderTop:`1px solid ${C.bd}`, padding:"12px 10px 10px" }}>
            <FloorPlan lang={lang} heading={t(lang,"directions")}
              highlightRack={p.rack} showPath detail="target"/>
          </div>
        </div>

        {/* 3단계 안내 — 각 step kiosk-card 인터랙션 */}
        <div style={{ background:C.wh, borderRadius:8, border:`1px solid ${C.bd}`, marginBottom:14, overflow:"hidden" }}>
          {steps.map((s,idx) => (
            <div key={s.n} className="kiosk-card" style={{
              display:"flex", gap:14, alignItems:"center", padding:"16px 18px",
              borderBottom: idx < steps.length - 1 ? `1px solid ${C.bd}` : "none",
              cursor:"default", borderRadius:0
            }}>
              {/* 넘버 — 크고 명확하게 */}
              <div style={{
                width:32, height:32, borderRadius:8, flexShrink:0,
                background: C.pri,
                display:"flex", alignItems:"center", justifyContent:"center",
                color: C.wh, fontSize:14, fontWeight:700
              }}>{s.n}</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:C.t1, lineHeight:1.45 }}>{s.t}</p>
                <p style={{ margin:0, fontSize:11, color:C.t3 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={pop} className="kiosk-btn" style={{ width:"100%", marginBottom:24, padding:"15px", borderRadius:8,
          background:C.pri, color:C.wh, border:"none", fontSize:15, fontWeight:700, fontFamily:"inherit", cursor:"pointer" }}>
          {t(lang,"seeOther")}
        </button>

        {/* 이 제품을 찾은 고객은 이 제품도 봤어요 */}
        {related.length>0 && (
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:C.t1, margin:"0 0 12px" }}>{t(lang,"relatedAlso")}</p>
            <div style={{ display:"flex", gap:12, overflowX:"auto", marginLeft:-20, marginRight:-20, paddingLeft:20, paddingRight:20, paddingTop:8, paddingBottom:12 }}>
              {related.map((r,i) => (
                <ThumbCard key={i} lang={lang} p={r} onPress={() => {
                  setInfoOpen(false);
                  window.scrollTo({ top:0, behavior:"instant" });
                  setNav(prev => [...prev.slice(0,-1), { page:"location", product:r }]);
                }}/>
              ))}
            </div>
          </div>
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
      case "location": return renderLocation();
      default: return renderHome();
    }
  };

  const tabs = [
    { id:"home", label:t(lang,"tabHome") },
    { id:"search", label:t(lang,"tabSearch") },
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
      .kiosk-input::placeholder{color:${BRAND.hint}}
      .kiosk-tag:hover{background:${BRAND.accentTint}!important;border-color:${C.pri}!important}
      .kiosk-tag:active{transform:scale(0.95)}
      .kiosk-product{transition:background 0.15s,box-shadow 0.15s!important}
      .kiosk-product:hover{background:${C.bgF}!important;box-shadow:-20px 0 0 ${C.bgF},20px 0 0 ${C.bgF}!important}
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
      <TopBar title={PAGE_TITLES[cur.page]} onBack={cur.page!=="home" ? goBack : undefined} isHome={cur.page==="home"} lang={lang} setLang={setLang}/>
      <div>{renderPage()}</div>

      {/* 바텀 내비 — 아이콘 없이 텍스트만, 활성 탭 민트 underline */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:SHELL_MAX, background:C.wh,
        borderTop:`1px solid ${C.bd}`, display:"flex", zIndex:100 }}>
        {tabs.map(tab => {
          const isA = activeTab===tab.id;
          return (
            <button key={tab.id} onClick={() => {
              setActiveTab(tab.id);
              setNav([{ page:tab.id }]);
              if(tab.id==="search") setSearchQ("");
            }} className="kiosk-nav-btn" style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              background:"none", border:"none", cursor:"pointer", padding:"14px 6px 18px",
              fontFamily:"inherit", minWidth:0,
              borderTop: isA ? `2.5px solid ${C.pri}` : "2.5px solid transparent",
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
