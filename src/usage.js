import { STORE } from "./store.js";
/* 방문 기록 — 손님이 어느 탭을 보고, 무엇을 찾고, 어느 카테고리 · 상품 위치를 열었는지를 PS-OS 표(psos_usage_events)에 쌓습니다.
   하남 매대 안내(랙 QR)와 같은 꼴입니다. 보는 곳은 PS-OS 매장 운영 › 고객 화면 › 방문 분석. DB 쪽은 ps-os 저장소 supabase/psos-usage-screens.sql.

   - 화면(screen): 지도 탭 · 상품 위치는 store-map, 나머지는 kiosk. 지점은 guro.
   - 손님 한 명 = 세션 하나. 매장 단말은 90초 동안 아무도 만지지 않으면 그 손님은 떠난 것으로 보고(end), 다음 터치부터 새 손님입니다(view target=touch).
     화면이 저절로 처음으로 돌아가는 것(유휴 초기화)은 손님이 아니라서 세지 않습니다.
   - DID · 인쇄물 QR 로 폰에서 열면 주소에 ?src=<마칼 품목 코드> 가 붙어 옵니다. 그때는 터치를 기다리지 않고 바로 손님 한 명(view target=scan)으로 세고,
     그 손님의 모든 기록에 구좌(src)를 붙입니다.
   - 사람을 알아볼 값은 담지 않습니다. 찾은 말은 결과 수와 함께 남깁니다(없는 상품을 찾는 말이 가장 쓸모 있습니다).
   - 매장 단말은 인터넷이 끊길 수 있어, 모은 기록은 기기에 두었다가(최대 1,000건) 연결될 때 30초마다 보냅니다.
   - 세지 않는 곳: 직원 기기(?staff=1 로 한 번 열면 이 브라우저에 남음, ?staff=0 으로 풂 · PS-OS 에 로그인한 기기는 공통 쿠키 ps_staff 로 자동) · PS-OS 안 미리보기 · 개발 서버.
     개발 서버(localhost)에서는 보내지 않고 window.__psVisit 에만 모읍니다. 주소에 ?usage=on 을 붙이면 보내고, ?usage=off 면 어디서든 끕니다. */

export const USAGE_IDLE_MS = 90_000;
const FLUSH_MS = 30_000;
const QUEUE_KEY = "ps_usage_q";
const QUEUE_MAX = 1000;
const BATCH = 300;
export const SRC_RE = /^[A-Z0-9][A-Z0-9-]{2,39}(\.[0-9]{1,2})?$/;

/* 공개용(anon) 키입니다 — 브라우저에 실려도 되는 값이고, 이 키로는 기록 쓰기 함수만 부를 수 있습니다. */
const SUPABASE_URL = "https://jdondfrukwetncyxwrtt.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impkb25kZnJ1a3dldG5jeXh3cnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MjIxNjksImV4cCI6MjEwNjI5ODE2OX0.DJA-Eun7iT403KcJWFv0F6aLkAv5t0N2OZ3cu4AURNo";

const newSid = (now) => now.toString(36) + Math.random().toString(36).slice(2, 8);
const clip = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
/* 지도 탭과 상품 위치(지도 위에 자리 표시)는 매장 지도 화면으로 따로 셉니다 */
export const screenOf = (page) => (page === "map" || page === "location" ? "store-map" : "kiosk");
export const pageId = (page) => (String(page || "").replace(/[^0-9A-Za-z-]/g, "").slice(0, 40) || "home");

export function createUsage({ store = "guro", src = "", url = SUPABASE_URL, key = SUPABASE_ANON, storage, fetchFn, now = () => Date.now(), enabled = true, sink } = {}) {
  src = SRC_RE.test(src || "") ? src : "";
  const st = { sid: "", sesStart: 0, lastAct: 0, page: "", pageStart: 0, off: 0, busy: false, q: [], src };
  try { st.q = JSON.parse((storage && storage.getItem(QUEUE_KEY)) || "[]") || []; } catch (e) { st.q = []; }

  const save = () => { try { storage && storage.setItem(QUEUE_KEY, JSON.stringify(st.q)); } catch (e) {} };
  const push = (kind, extra, page = st.page) => {
    if (!enabled || !st.sid) return;
    const p = pageId(page);
    const row = Object.assign({ at: new Date(now()).toISOString(), sid: st.sid, screen: screenOf(p), page: p, kind }, extra);
    if (st.src) row.src = st.src;
    st.q.push(row);
    if (sink) sink(row);
    if (st.q.length > QUEUE_MAX) st.q.splice(0, st.q.length - QUEUE_MAX);
    save();
  };
  const leave = (until) => {
    if (st.sid && st.pageStart) push("leave", { value: Math.max(0, Math.round((until - st.pageStart) / 1000)) });
  };
  /* 손님이 떠남 — 마지막으로 만진 때까지를 이용 시간으로. 구좌는 그 손님 것이라 같이 지웁니다 */
  const end = () => {
    if (!st.sid) return;
    leave(st.lastAct);
    push("end", { value: Math.max(0, Math.round((st.lastAct - st.sesStart) / 1000)) });
    st.sid = ""; st.pageStart = 0; st.src = "";
  };
  const begin = (t, how) => {
    st.sid = newSid(t); st.sesStart = t; st.pageStart = t; st.lastAct = t;
    push("view", { target: how });
  };

  const api = {
    /* QR(?src)로 폰에서 열었으면 터치 전이라도 손님 한 명 */
    arrive() {
      if (st.src && !st.sid) begin(now(), "scan");
    },
    /* 손이 닿을 때마다 — 오래 비어 있었으면 앞 손님을 닫고 새 손님을 연다 */
    touch() {
      const t = now();
      if (st.sid && t - st.lastAct > USAGE_IDLE_MS) end();
      st.lastAct = t;
      if (!st.sid) begin(t, "touch");
    },
    /* 화면이 바뀜 — 손님이 없을 때(유휴 초기화 · 첫 화면)는 자리만 기억해 둔다. pick 은 그 화면에서 연 것(카테고리 · 브랜드 · 상품 이름) */
    view(page, pick) {
      page = pageId(page); pick = clip(pick, 60);
      const key = page + "|" + pick;
      if (key === st.key) return;
      const t = now();
      if (st.sid && t - st.lastAct > USAGE_IDLE_MS) end();
      if (st.sid && page !== st.page) leave(t);
      const moved = page !== st.page;
      st.key = key; st.page = page;
      if (moved) st.pageStart = t;
      if (!st.sid) return;
      if (moved) push("view", { target: "nav" });
      if (pick) push("pick", { target: pick });
    },
    search(q, hits) {
      q = clip(q, 60);
      if (q) push("search", { target: q, value: Math.max(0, hits | 0) });
    },
    click(target, x, y) {
      target = clip(target, 60);
      if (!target) return;
      const r = (v) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
      push("click", { target, x: r(x), y: r(y) });
    },
    /* 주기마다 — 떠난 손님 닫기 + 보내기 */
    tick() {
      if (st.sid && now() - st.lastAct > USAGE_IDLE_MS) end();
      return api.flush();
    },
    flush() {
      if (!enabled || st.busy || !st.q.length || now() < st.off || !fetchFn) return Promise.resolve(0);
      const batch = st.q.slice(0, BATCH);
      st.busy = true;
      return fetchFn(url + "/rest/v1/rpc/psos_usage_screen", {
        method: "POST", keepalive: true,
        headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ p_store: store, p_events: batch }),
      }).then((res) => {
        if (res.ok || res.status === 400 || res.status === 404) {
          /* 400 · 404 는 다시 보내도 같다 — 버리고, 함수가 없으면(404) 30분 쉰다 */
          st.q.splice(0, batch.length); save();
          if (res.status === 404) st.off = now() + 1_800_000;
          return res.ok ? batch.length : 0;
        }
        return 0;
      }, () => 0).then((n) => { st.busy = false; return n; });
    },
    state: st,
  };
  return api;
}

/* 직원 기기 · 미리보기 · 개발 서버 가리기 — 주소와 저장소만 보고 정합니다(시험에서 따로 부름) */
export function visitMode({ search = "", hostname = "", inFrame = false, referrer = "", storage, cookie = "" } = {}) {
  const qs = new URLSearchParams(search);
  let staff = false;
  try {
    const s = qs.get("staff");
    if (s === "1") storage && storage.setItem("ps_staff", "1");
    if (s === "0") storage && storage.removeItem("ps_staff");
    staff = !!storage && storage.getItem("ps_staff") === "1";
    /* PS-OS 에 로그인한 기기 — PS-OS 가 phamasquare.com 공통 쿠키 ps_staff=1 을 굽는다(2026-11-19). ?staff=0 으로 연 탭은 그대로 센다 */
    if (s !== "0" && /(^|;\s*)ps_staff=1(;|$)/.test(cookie)) staff = true;
  } catch (e) {}
  /* PS-OS 새 주소(os.phamasquare.com, 2026-11-18 이사)도 — 옛 규칙은 ps-os 만 봐서 고객 화면 미리보기가 손님으로 세졌다 */
  const psosPreview = inFrame && /ps-os|os\.phamasquare\.com|psos\.pages\.dev|localhost|127\.0\.0\.1/.test(referrer);
  const onDev = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname);
  const flag = qs.get("usage");
  const counted = !staff && !psosPreview && flag !== "off";
  const send = counted && (flag === "on" || !onDev);
  const raw = (qs.get("src") || "").toUpperCase();
  return { counted, send, staff, src: SRC_RE.test(raw) ? raw : "" };
}

/* 앱에서 쓰는 한 벌 — 화면 이벤트를 듣는다. 세는 기기지만 보내지 않는 곳(개발 서버)은 window.__psVisit 에만 쌓는다 */
const hasWin = typeof window !== "undefined" && typeof location !== "undefined";
export const mode = hasWin
  ? visitMode({ search: location.search, hostname: location.hostname, inFrame: window.top !== window.self,
      referrer: document.referrer, storage: typeof localStorage !== "undefined" ? localStorage : null, cookie: document.cookie || "" })
  : { counted: false, send: false, staff: false, src: "" };
export const usage = createUsage({
  store: STORE, /* 지점(src/store.js) — 하남 키오스크도 같은 코드라 지점을 실어 보낸다(2026-11-17) */
  src: mode.src,
  storage: mode.send && typeof localStorage !== "undefined" ? localStorage : null,
  fetchFn: mode.send && typeof fetch !== "undefined" ? (...a) => fetch(...a) : null,
  enabled: mode.counted,
  sink: hasWin && !mode.send ? (row) => { (window.__psVisit = window.__psVisit || []).push(row); } : undefined,
});

export function installUsage(u = usage) {
  const onDown = () => u.touch();
  const onClick = (e) => {
    const el = e.target && e.target.closest ? e.target.closest("button, a, [role=button], [role=tab]") : null;
    if (!el) return;
    const text = (el.innerText || el.textContent || "").split("\n")
      .map((s) => s.replace(/[^\p{L}\p{N}\s·&+\-().%/]/gu, "").trim()).find((s) => /[\p{L}\p{N}]/u.test(s));
    const name = el.getAttribute("aria-label") || el.getAttribute("title") || text;
    u.click(name, e.clientX / Math.max(1, window.innerWidth), e.clientY / Math.max(1, window.innerHeight));
  };
  const onHide = () => { if (document.hidden) u.flush(); };
  window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
  window.addEventListener("keydown", onDown, { capture: true, passive: true });
  window.addEventListener("click", onClick, true);
  document.addEventListener("visibilitychange", onHide);
  u.arrive();
  const iv = setInterval(() => u.tick(), FLUSH_MS);
  return () => {
    window.removeEventListener("pointerdown", onDown, true); window.removeEventListener("keydown", onDown, true);
    window.removeEventListener("click", onClick, true); document.removeEventListener("visibilitychange", onHide); clearInterval(iv);
  };
}
