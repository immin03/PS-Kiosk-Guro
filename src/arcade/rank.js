/* 아케이드 랭킹 — 점수는 월드 손님 기록(Supabase world_players)에 붙는다. 규칙 문서 docs/arcade-rules.md 「랭킹」,
 * 서버 함수는 ps-os supabase/world-game-scores.sql(world_game_post · world_game_rank).
 * 키오스크는 여러 손님이 같이 쓰는 기기라 손님 키를 두지 않는다 — 끝 화면 QR 을 손님 휴대폰으로 찍어 그 손님 기록에 저장한다.
 * 개발 서버에서는 운영 표에 쓰지 않고 가짜 코드를 준다(?srv=1 이면 실제로 보냄). */

/* 공개용(anon) 키 — src/usage.js 와 같은 값. 이 키로는 정해진 함수만 부를 수 있다 */
const RPC = "https://jdondfrukwetncyxwrtt.supabase.co/rest/v1/rpc/";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impkb25kZnJ1a3dldG5jeXh3cnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MjIxNjksImV4cCI6MjEwNjI5ODE2OX0.DJA-Eun7iT403KcJWFv0F6aLkAv5t0N2OZ3cu4AURNo";

export const GAME_OF_PAGE = { pamibread: "tycoon", pamitop: "pamitop" };
export const GAME_NAME = { tycoon: "파미빵 타이쿤", pamitop: "파미탑" };
export const scoreText = (game, n) => (game === "tycoon" ? n.toLocaleString("ko-KR") + "원" : n.toLocaleString("ko-KR") + "점");

export const claimUrl = (store, code) => `https://guide.phamasquare.com/world/${store}?claim=${encodeURIComponent(code)}`;

export function serverOn(loc = typeof location !== "undefined" ? location : null) {
  if (!loc) return false;
  if (new URLSearchParams(loc.search).get("srv") === "1") return true;
  return /(^|\.)phamasquare\.com$/.test(loc.hostname);
}

async function rpc(fn, body, fetchFn = fetch) {
  const r = await fetchFn(RPC + fn, {
    method: "POST",
    headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(fn + " " + r.status);
  return r.json();
}

/* 점수 올리기 → { code } 또는 null(0점 · 실패) */
export async function postScore(store, game, score, detail = {}, { fetchFn, on = serverOn() } = {}) {
  if (!(score > 0)) return null;
  if (!on) return { code: "DEVTEST0", dev: true };
  try { return await rpc("world_game_post", { p_store: store, p_game: game, p_score: Math.round(score), p_detail: detail }, fetchFn); }
  catch { return null; }
}

/* 이번 주 TOP 10 → [{ nick, score, member }] 또는 null(못 읽음) */
export async function fetchRank(store, game, { fetchFn, limit = 10 } = {}) {
  try {
    const j = await rpc("world_game_rank", { p_store: store, p_game: game, p_limit: limit }, fetchFn);
    return Array.isArray(j?.top) ? j.top : [];
  } catch { return null; }
}
