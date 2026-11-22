import { useEffect, useRef, useState } from "react";
import { BRAND } from "./theme.js";
import { STORE_PHOTOS } from "./storePhoto.js";
import { STORE_CONFIG } from "./store.js";
import { resolveBaseRelativeUrl } from "./baseRelativeUrl.js";

/* 75" 입구 DID 판 — 2026-11-22 개편(사용자 「화면이 구리다 · 아예 다른 스타일」 「소비자가 누르기 좋은 위치에 떠 있어야」 「슬라이드 배너는 화면 안에」).
 * 바탕: 매장 사진이 천천히 겹쳐 바뀌고 위아래로 흰 막이 덮인다. 로고는 위 가운데 흰 알약.
 * 키오스크 판: 75"(바닥에서 화면 중심 ≈ 1.1m) 손이 편한 높이 — 화면 세로 가운데 조금 위에 띄운다. 바닥 쪽 버튼이 안 눌리던 것 해결.
 * 행사 배너는 판 안 홈의 슬라이드 배너 그대로(바깥에 따로 두지 않는다).
 * 키오스크는 같은 주소에 &inner=1 — 방문 기록 · 기기 코드(?did)는 안쪽 키오스크가 센다. 바깥 판은 기록을 쌓지 않는다 */
const QR = resolveBaseRelativeUrl(import.meta.env.BASE_URL, `assets/qr-kiosk-${STORE_CONFIG.id}.svg`);
const WORLD_ORIGIN = "https://guide.phamasquare.com";
const LOGO = resolveBaseRelativeUrl(import.meta.env.BASE_URL, "assets/logo-wordmark.png");
export const SHELL_FRAME_W = 0.58;   /* 판 폭 = 화면 폭의 58% */
const FRAME_H = 0.48;                /* 판 높이 = 화면 높이의 48%(약 79cm) */
/* 판 위 = 화면 높이의 27.5%. 실제 설치(입구 벽 매립, 화면 아래끝 바닥에서 ≈67cm — 입면도 EL-B103: 파사드 벽 3000, DID 중심이 바닥 1500, 화면 유효 1652)에서 판이 바닥 ≈ 108 ~ 187cm —
   키 160cm 손님이 가장 자주 누르는 맨 아래 탭(홈 버튼)이 108cm(손 닿는 높이)에 오고, 높은 윗부분은 배너(보기만)(2026-11-22) */
const FRAME_TOP = 0.275;
const DW = 450;                      /* 판 안 키오스크 설계 폭 */
/* 매장 지도 화면은 판이 가로로 넓어진다(판 한가운데를 기준으로 상하좌우 부드럽게) — 도면이 커져 구역 이름이 읽힌다 */
const WIDE_W = 0.90, WIDE_H = 0.44;

export default function Shell75() {
  const u = new URL(window.location.href);
  u.searchParams.set("inner", "1");
  const box = useRef(null);
  const frame = useRef(null);
  const [wide, setWide] = useState(false);
  const [page, setPage] = useState("home");
  const [kb, setKb] = useState(false);
  /* 파마스퀘어 월드는 75" 화면 전체로 — 3D 쪽 ?screen=75 배치(누르는 것은 손 닿는 띠, 2026-11-22 사용자 「75인치는 메타버스 전체화면」).
     3D 의 「처음으로」 · 90초 무입력이 {w3d: "close"} 를 보내면 닫고 안쪽 키오스크도 한 칸 뒤로 */
  const [world, setWorld] = useState(false);
  const [bx, setBx] = useState({ w: 0, h: 0 });
  /* 안쪽 키오스크가 알려 주는 것 — 지금 화면(map 이면 판을 넓힘) · 검색 칸을 눌렀는지(화면 자판 열기 · 닫기) */
  useEffect(() => {
    const on = (e) => {
      if (e.origin === WORLD_ORIGIN && e.data && e.data.w3d === "close") { setWorld(false); try { frame.current && frame.current.contentWindow.postMessage({ psNav: "back" }, window.location.origin); } catch (er) {} return; }
      if (e.origin !== window.location.origin) return;
      const m = e.data; if (!m || !m.psShell) return;
      if (m.page !== undefined) { setWide(m.page === "map" || m.page === "world"); setPage(m.page); setWorld(m.page === "world"); }
      if (m.kbd === "open") setKb(true);
      if (m.kbd === "close") setKb(false);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const sendBanner = (d) => { try { frame.current && frame.current.contentWindow.postMessage({ psBanner: d }, window.location.origin); } catch (e) {} };
  const sendKey = (k) => { try { frame.current && frame.current.contentWindow.postMessage({ psKbd: "key", k }, window.location.origin); } catch (e) {} };
  const [ph, setPh] = useState(0);
  useEffect(() => {
    const el = box.current; if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBx({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (STORE_PHOTOS.length < 2) return;
    const id = setInterval(() => setPh((n) => (n + 1) % STORE_PHOTOS.length), 7000);
    return () => clearInterval(id);
  }, []);
  const sc = bx.w ? bx.w / DW : 1;
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#2D373D" }}>
      {STORE_PHOTOS.map((src, i) => (
        <img key={src} src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          opacity: i === ph ? 1 : 0, transition: "opacity 1.6s ease", transform: "scale(1.04)" }} />
      ))}
      {/* 딤 막 — 사진 위에 어둡게(2026-11-22 사용자 「배경을 딤드 스타일로, 글자 화이트」). 위아래는 짙게, 가운데는 사진이 비치게 */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(24,32,36,.78) 0%, rgba(24,32,36,.6) 24%, rgba(24,32,36,.5) 50%, rgba(24,32,36,.62) 80%, rgba(24,32,36,.8) 100%)" }} />

      {/* QR 카드가 천천히 계속 동동(3.6초 한 바퀴, 끊김 없이 되풀이) — 처음엔 「가끔만」 이었다가 「무한반복」 으로(2026-11-22 사용자) */}
      <style>{"@keyframes ps-qr-float { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -0.9cqh); } }"}</style>
      {/* 9:16 무대 — 가로 · 세로를 한 단위(무대 크기)로 잡아, 창 비율이 달라도(미리보기) 간격이 어긋나지 않는다. 실제 75"(9:16)에서는 화면 전체 */}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "min(100vw, 56.25vh)", height: "min(100vh, 177.78vw)", containerType: "size" }}>
      <div style={{ position: "absolute", top: "9.5cqh", left: 0, right: 0, textAlign: "center" }}>
        <img src={LOGO} alt="PHAMA SQUARE" style={{ height: "2cqh", display: "block", margin: "0 auto", filter: "brightness(0) invert(1)" }} />
        <div style={{ marginTop: "2.6cqh", fontSize: "5.4cqw", fontWeight: 600, color: "#FFFFFF", letterSpacing: "-0.02em" }}>파마스퀘어 {STORE_CONFIG.name}</div>
        <div style={{ marginTop: "1.2cqh", fontSize: "2.5cqw", fontWeight: 300, color: "#FFFFFF", whiteSpace: "nowrap" }}>
          화면을 터치해 상품 검색과 이벤트, 매장 지도를 만나 보세요
        </div>
      </div>

      <div ref={box} style={{ position: "absolute",
        left: `${(1 - (wide ? WIDE_W : SHELL_FRAME_W)) * 50}cqw`, width: `${(wide ? WIDE_W : SHELL_FRAME_W) * 100}cqw`,
        top: `${(FRAME_TOP + FRAME_H / 2 - (wide ? WIDE_H : FRAME_H) / 2) * 100}cqh`, height: `${(wide ? WIDE_H : FRAME_H) * 100}cqh`,
        transition: "left .45s cubic-bezier(.4,0,.2,1), width .45s cubic-bezier(.4,0,.2,1), top .45s cubic-bezier(.4,0,.2,1), height .45s cubic-bezier(.4,0,.2,1)",
        borderRadius: "2.6cqw", overflow: "hidden", background: "#FFFFFF",
        boxShadow: "0 0 0 1px rgba(16,24,30,.06), 0 3cqh 8cqh rgba(16,24,30,.28)" }}>
        {bx.w > 0 && (
          <iframe ref={frame} src={u.toString()} title="파마스퀘어 키오스크" allow="clipboard-write"
            style={{ width: DW, height: Math.round(bx.h / sc), border: 0, display: "block", transform: `scale(${sc})`, transformOrigin: "0 0" }} />
        )}
      </div>

      {/* 내 휴대폰으로 보기 — 이 키오스크 주소 QR(2026-11-22 사용자 「큐알을 하단에 배치해서 내 폰에서도 볼 수 있게」) */}
      <div style={{ position: "absolute", left: "50%", top: `${(FRAME_TOP + FRAME_H) * 100 + 4.2}cqh`, transform: "translateX(-50%)", animation: kb ? "none" : "ps-qr-float 3.6s ease-in-out infinite", display: "flex", alignItems: "center", gap: "2.4cqw", opacity: kb ? 0 : 1, pointerEvents: kb ? "none" : "auto", transition: "opacity .25s",
        padding: "1.1cqh 2.6cqw 1.1cqh 1.6cqw", background: "#FFFFFF", borderRadius: "1.8cqw", border: "1px solid #E2E5E8" }}>
        <img src={QR} alt="휴대폰으로 보기 QR" style={{ height: "7.6cqh", width: "7.6cqh", display: "block" }} />
        <div style={{ width: 1, alignSelf: "stretch", background: "#E2E5E8" }} />
        <div style={{ whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1cqw", fontSize: "2.9cqw", fontWeight: 600, color: BRAND.ink, letterSpacing: "-0.01em" }}>
            <svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="none" stroke={BRAND.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.5h2"/></svg>
            내 휴대폰으로 보기
          </div>
          <div style={{ marginTop: ".7cqh", fontSize: "2cqw", fontWeight: 500, color: BRAND.ink }}>카메라로 QR을 찍어 주세요</div>
        </div>
      </div>

      {/* 판 양옆 꺾쇠 — 홈 배너 이전 · 다음(2026-11-22 사용자 「좌우 스와이프 버튼 세련되게 꺾쇠만」). 홈에서만, 자판이 열리면 숨긴다 */}
      {page === "home" && !kb && [[-1, "이전 혜택 보기", "M14.5 5 7.5 12l7 7", { left: 0 }], [1, "다음 혜택 보기", "M9.5 5l7 7-7 7", { right: 0 }]].map(([d, label, path, side]) => (
        <button key={d} type="button" aria-label={label} onClick={() => sendBanner(d)}
          style={{ position: "absolute", top: `${FRAME_TOP * 100 + 22.3 * SHELL_FRAME_W - 8}cqh`, height: "16cqh", width: `${(1 - SHELL_FRAME_W) * 50}cqw`, padding: 0, border: 0, background: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", WebkitTapHighlightColor: "transparent", ...side }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ width: "5.2cqw", height: "5.2cqw", opacity: .9, filter: "drop-shadow(0 1px 4px rgba(0,0,0,.35))" }}><path d={path} /></svg>
        </button>
      ))}
      {kb && <ScreenKeyboard onKey={sendKey} onDone={() => setKb(false)} top={(FRAME_TOP + FRAME_H) * 100 + 1.4} />}
      {world && <iframe src={`${WORLD_ORIGIN}/world/${STORE_CONFIG.id}/3d?screen=75`} title="PHAMA SQUARE WORLD" allow="camera; fullscreen"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, zIndex: 50, background: "#F7FAFA" }} />}
      </div>
    </div>
  );
}

/* 화면 자판 — 검색 칸을 누르면 판 아래에 올라온다(2026-11-22 사용자 「서치할 때 하단에 타이핑이 올라와야」).
 * 키를 누르면 안쪽 키오스크에 한 글자씩 보내고, 한글 조합은 안쪽(hangul.js)이 한다. OS 자판은 안 뜬다(안쪽 칸 readOnly). */
const KB_KO = [["ㅂ","ㅈ","ㄷ","ㄱ","ㅅ","ㅛ","ㅕ","ㅑ","ㅐ","ㅔ"], ["ㅁ","ㄴ","ㅇ","ㄹ","ㅎ","ㅗ","ㅓ","ㅏ","ㅣ"], ["⇧","ㅋ","ㅌ","ㅊ","ㅍ","ㅠ","ㅜ","ㅡ","⌫"]];
const KB_KO_SHIFT = { "ㅂ": "ㅃ", "ㅈ": "ㅉ", "ㄷ": "ㄸ", "ㄱ": "ㄲ", "ㅅ": "ㅆ", "ㅐ": "ㅒ", "ㅔ": "ㅖ" };
const KB_EN = [["q","w","e","r","t","y","u","i","o","p"], ["a","s","d","f","g","h","j","k","l"], ["⇧","z","x","c","v","b","n","m","⌫"]];
const KB_NUM = [["1","2","3","4","5","6","7","8","9","0"], ["-","/",":",";","(",")","&","@","\""], ["·",".",",","?","!","'","%","+","⌫"]];

function ScreenKeyboard({ onKey, onDone, top }) {
  const [mode, setMode] = useState("ko");       // ko | en | num
  const [shift, setShift] = useState(false);
  const rows = mode === "ko" ? KB_KO : mode === "en" ? KB_EN : KB_NUM;
  const press = (k) => {
    if (k === "⇧") { setShift((v) => !v); return; }
    if (k === "⌫") { onKey("back"); return; }
    let c = k;
    if (mode === "ko" && shift) c = KB_KO_SHIFT[k] || k;
    if (mode === "en" && shift) c = k.toUpperCase();
    onKey(c); if (shift) setShift(false);
  };
  const key = (label, o = {}) => (
    <button key={o.id || label} type="button" onPointerDown={(e) => e.preventDefault()} onClick={o.onClick || (() => press(label))}
      style={{ flex: o.flex || 1, height: "4.3cqh", border: 0, borderRadius: "1.1cqw", font: "inherit", fontSize: o.fs || "2.7cqw", fontWeight: 500, cursor: "pointer",
        background: o.dark ? "rgba(255,255,255,.18)" : "#FFFFFF", color: o.dark ? "#FFFFFF" : BRAND.ink, minWidth: 0,
        outline: o.on ? `2px solid ${BRAND.accent}` : "none", WebkitTapHighlightColor: "transparent" }}>{o.text || (mode === "ko" && shift && KB_KO_SHIFT[label]) || label}</button>
  );
  return (
    <div style={{ position: "absolute", left: "4cqw", right: "4cqw", top: `${top}cqh`, display: "flex", flexDirection: "column", gap: "0.7cqh",
      padding: "1.2cqh 1.2cqw", borderRadius: "2cqw", background: "rgba(24,32,36,.72)", backdropFilter: "blur(10px)" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: "0.8cqw", padding: i === 1 ? "0 3cqw" : 0 }}>
          {r.map((k) => k === "⇧" ? key(k, { dark: true, flex: 1.4, on: shift, text: "⇧", onClick: () => press("⇧") }) : k === "⌫" ? key(k, { dark: true, flex: 1.4 }) : key(k))}
        </div>
      ))}
      <div style={{ display: "flex", gap: "0.8cqw" }}>
        {key("lang", { dark: true, flex: 1.6, text: mode === "ko" ? "ENG" : "한글", fs: "2.2cqw", onClick: () => { setMode(mode === "ko" ? "en" : "ko"); setShift(false); } })}
        {key("num", { dark: true, flex: 1.6, text: mode === "num" ? (mode === "num" ? "가나" : "") : "123", fs: "2.2cqw", onClick: () => { setMode(mode === "num" ? "ko" : "num"); setShift(false); } })}
        {key("space", { flex: 5, text: "띄어쓰기", fs: "2.2cqw", onClick: () => onKey(" ") })}
        {key("done", { flex: 2, text: "완료", fs: "2.4cqw", onClick: onDone })}
      </div>
    </div>
  );
}
