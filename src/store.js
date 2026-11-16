/* 지금 띄우는 지점(2026-11-17 하남 키오스크) — 코드는 하나, 지점 값은 원장에서 지점별로(src/stores/<지점>/).
 *   주소 ?store=hanam · 경로 /hanam/ 이면 하남, 아니면 구로.
 *   빌드 스크립트(node)에서는 KIOSK_STORE 환경 변수로 고른다.
 * 지점 설정(이름 · 기본 배경 사진 · 지도 시작 자리)은 STORE_CONFIG 한 곳에만 적는다 */
export const STORES = ["guro", "hanam"];

function pick() {
  try {
    if (typeof process !== "undefined" && process.env && process.env.KIOSK_STORE) return process.env.KIOSK_STORE;
  } catch (e) { /* 브라우저 */ }
  if (typeof location === "undefined") return "guro";
  const q = new URLSearchParams(location.search).get("store");
  if (q && STORES.includes(q)) return q;
  if (/\/hanam(\/|$)/.test(location.pathname)) return "hanam";
  return "guro";
}

export const STORE = STORES.includes(pick()) ? pick() : "guro";

export const STORE_CONFIG = {
  guro:  { name: "구로점", nameEn: "Guro", nameZh: "九老店", origin: "엘리베이터 입구", schematic: true },
  hanam: { name: "하남점", nameEn: "Hanam", nameZh: "河南店", origin: "키오스크", schematic: false,
    /* 손님 지도에 안 그리는 집기 — 기둥 · 바구니 · 진열 소품 · 경계선은 매대 찾기에 잡음 */
    hideMarks: /기둥|경계 벽|카트|바구니|반구|이동식|2단 구좌|소형 구좌|DID/ },
}[STORE];
