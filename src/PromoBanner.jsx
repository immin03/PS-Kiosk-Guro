import { useState, useEffect, useRef } from "react";
import { PROMOTIONS } from "./promotions.js";
import { STORE_PHOTOS } from "./storePhoto.js";
import { STORE } from "./store.js";
import WorldCta from "./WorldCta.jsx";

/* PS-OS 프로모션 화면에서 고친 현황 · 이름 · 기간 · 지점을 열 때 받아 덮는다(2026-11-19 사용자 「공개 통로 열기」).
   Supabase 함수 psos_promo_feed(PS-OS supabase/psos-promo-feed.sql)가 네 칸만 공개한다. 못 받으면 빌드 때 실린 값 그대로.
   빌드 때 실린 행사만 덮는다 — 새로 확정된 행사는 장표 그림이 번들에 있어야 해서 키오스크 동기화(scripts/sync-racks.mjs) 뒤에 뜬다 */
const FEED_URL = "https://jdondfrukwetncyxwrtt.supabase.co/rest/v1/rpc/psos_promo_feed";
const FEED_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impkb25kZnJ1a3dldG5jeXh3cnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MjIxNjksImV4cCI6MjEwNjI5ODE2OX0.DJA-Eun7iT403KcJWFv0F6aLkAv5t0N2OZ3cu4AURNo";
const ST_OLD = { "진행": "확정", "진행 중": "확정", "완료": "확정" };
const STORE_KO = { guro: "구로", hanam: "하남" };
let feedP = null;
export const loadFeed = () => feedP || (feedP = (typeof fetch === "function"
  ? fetch(FEED_URL, { method: "POST", headers: { apikey: FEED_KEY, Authorization: "Bearer " + FEED_KEY, "Content-Type": "application/json" }, body: "{}" })
      .then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
  : Promise.resolve({})));
/* 고친 값 덮기 — 현황이 확정이 아니거나 이 지점이 빠지면 내리고, 이름 · 기간은 바꿔 단다 */
export function applyFeed(list, feed, store = STORE) {
  if (!feed || typeof feed !== "object") return list;
  return list.flatMap((p) => {
    const o = feed[p.id]; if (!o || p.src !== "프칼") return [p];
    const st = o.status ? (ST_OLD[o.status] || o.status) : "확정";
    if (st !== "확정") return [];
    if (o.store && !new RegExp(STORE_KO[store] + "|전체|전 지점").test(o.store)) return [];
    const q = { ...p };
    if (o.name) { const [t, sub] = String(o.name).split(/\s+—\s+/); q.title = t; if (sub != null) q.sub = sub; }
    if (o.period) {
      let [from, to] = String(o.period).split("~").map((v) => v.trim());
      if (/^\d{4}-\d{2}$/.test(from)) { if (!to) to = from + "-31"; from = from + "-01"; }
      if (from) { q.from = from; q.to = to || null; }
    }
    return [q];
  });
}

/* 홈 상단 프로모션 배너.
 *
 * 무엇을 몇 번째로 보여줄지는 PS-OS catalog/promotions.json 이 정합니다.
 * 이벤트 페이지 · 홈페이지도 같은 순서를 씁니다 — 생김새만 화면마다 다릅니다.
 * v3 프로토타입의 슬라이드 방식을 되살리되 문구는 정본에서 받습니다.
 */

/* 배경은 정본에 등록된 슬라이드 이미지(running[].image)를 먼저 쓰고,
   없으면 매장 사진을 깝니다. 글자가 얹히므로 위에 어둡게 덮습니다.
   정본에는 파일 이름만 두고, 번들에 실린 주소는 여기서 찾습니다. */
const SLIDES = import.meta.glob("./promo/*", { eager: true, query: "?url", import: "default" });
export const slideUrl = (name) => SLIDES[`./promo/${name}`];
/* 이미지 없는 슬라이드는 k 번째 매장 사진(한 장을 모든 슬라이드에 깔지 않는다) */
const bgOf = (p, k) => `url(${(p.image && slideUrl(p.image)) || STORE_PHOTOS[k % STORE_PHOTOS.length]})`;

/* 오늘 걸 장 — 프칼 건 중 기간 안의 것, 하나도 없으면 상시 건. 이벤트 목록 페이지(EventsPage)도 같은 목록을 쓴다 */
export const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
export function liveSlides(feed, today = kstToday()) {
  const live = applyFeed(PROMOTIONS, feed).filter((p) => (!p.from || p.from <= today) && (!p.to || p.to >= today));
  const cal = live.filter((p) => p.src === "프칼");
  return cal.length ? cal : live.filter((p) => p.src !== "프칼");
}

export default function PromoBanner({ onPress, interval = 5000, bleed = 0 }) {
  /* 프칼 건은 그날 기간 안에 있는 것만. 하나도 없으면 상시 건(src 상시) — scripts/sync-racks.mjs */
  const today = kstToday();
  const [feed, setFeed] = useState(null);
  useEffect(() => { let on = true; loadFeed().then((f) => { if (on) setFeed(f); }); return () => { on = false; }; }, []);
  const items = liveSlides(feed, today);
  const [i, setI] = useState(0);
  /* 손가락 · 마우스로 좌우로 밀어 넘긴다(2026-11-17 사용자 「스와이프해서 넘겨 볼 수 있게」).
     40px 넘게 밀면 한 장 넘기고, 민 뒤 손을 떼는 클릭은 배너 누르기로 치지 않는다.
     넘긴 뒤에는 자동 넘김 시계를 다시 잰다(i 가 바뀌면 타이머를 새로 건다) */
  const drag = useRef(null), [dx, setDx] = useState(0), swiped = useRef(false);
  const n = items.length;
  const go = (d) => setI((x) => (x + d + n) % n);
  const down = (e) => { if (n < 2) return; drag.current = { x: e.clientX, id: e.pointerId }; swiped.current = false; };
  const move = (e) => { if (!drag.current) return; const d = e.clientX - drag.current.x; if (Math.abs(d) > 6) swiped.current = true; setDx(d); };
  const up = () => { if (!drag.current) return; if (dx < -40) go(1); else if (dx > 40) go(-1); drag.current = null; setDx(0); };

  useEffect(() => {
    if (n < 2) return;
    const reduce =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    /* 돌아가는 장표는 한 바퀴(7초)를 다 보이고 넘긴다 */
    const t = setTimeout(() => setI((x) => (x + 1) % n), items[i] && items[i].video ? 8000 : interval);
    return () => clearTimeout(t);
  }, [n, interval, i]);

  if (!items.length) return null;
  /* 지금 장을 0, 다음을 1, 앞을 -1 로 — 둘뿐이면 앞뒤가 같은 장이라 미는 쪽에 둔다 */
  const slot = (k) => { let d = (k - i + n) % n; if (d > n / 2 || (n === 2 && d === 1 && dx > 0)) d -= n; return d; };

  return (
    /* 배너는 화면 폭을 다 씁니다. 좌우 여백과 둥근 모서리를 두면 사진이
       카드처럼 보여 시선이 덜 갑니다. bleed 만큼 바깥으로 물려 냅니다. */
    <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
      onClickCapture={(e) => { if (swiped.current) { e.stopPropagation(); swiped.current = false; } }}
      style={{
      position: "relative", overflow: "hidden", aspectRatio: "16 / 9", touchAction: "pan-y", userSelect: "none",
      marginLeft: -bleed, marginRight: -bleed, marginTop: -bleed, marginBottom: 20,
    }}>
      {items.map((p, k) => (
        <div
          key={p.id}
          onClick={onPress && p.images && p.images.length ? () => onPress(p) : undefined}
          className={p.view === "world" ? "world-hit" : undefined}
          style={{
            position: "absolute", inset: 0,
            /* 자동 넘김은 밀지 않고 천천히 겹쳐 바꾼다(2026-11-19 사용자 「정신사나워, 세련된 걸로」).
               손가락으로 밀 때만 따라 움직이고, 놓으면 다시 겹침 전환 */
            transform: dx ? `translateX(calc(${slot(k)} * 100% + ${dx}px))` : "none",
            opacity: dx ? 1 : k === i ? 1 : 0,
            zIndex: k === i ? 1 : 0,
            transition: dx ? "none" : "opacity .9s ease",
            visibility: dx && Math.abs(slot(k)) > 1 ? "hidden" : "visible",
            pointerEvents: k === i ? "auto" : "none",
            backgroundImage: bgOf(p, k),
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: onPress && p.images && p.images.length ? "pointer" : "default",
          }}
        >
          {/* 돌아가는 장표(kioskVideo) — 정지 장표를 포스터로 깔고 소리 없이 되풀이(2026-11-19 룰렛 「돌아가는 파일 활용」) */}
          {p.video && slideUrl(p.video) && (
            <video src={slideUrl(p.video)} poster={p.image ? slideUrl(p.image) : undefined} autoPlay muted loop playsInline
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
          )}
          {/* 그림 안에 이미 문구가 박힌 디자인 시안이면 글자를 얹지 않습니다 —
              겹쳐 읽힙니다. 그 외(매장 사진)에는 문구를 얹어야 합니다. 전에는
              「그림이 있으면 문구가 박힌 것」으로 보아, 맨 매장 사진을 건 슬라이드
              두 장이 제목도 설명도 없는 빈 사진으로 떠 있었습니다.
              정본에 imageHasText 를 적은 슬라이드만 글자를 숨깁니다. */}
          {p.view === "world" && <WorldCta />}
          {!p.imageHasText && (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,40,38,.30) 0%,rgba(0,40,38,.74) 100%)" }} />
          )}
          {!p.imageHasText && (
          <div style={{ position: "relative", height: "100%", padding: "22px 22px 24px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {p.tag && (
              <span style={{
                alignSelf: "flex-start", marginBottom: 9, padding: "4px 10px", borderRadius: 999,
                background: "rgba(255,255,255,.2)", color: "#fff",
                fontSize: 12, fontWeight: 600, letterSpacing: ".02em",
              }}>{p.tag}</span>
            )}
            <p style={{ margin: "0 0 5px", fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.28, letterSpacing: "-0.01em" }}>{p.title}</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.45 }}>{p.sub}</p>
            {p.limit && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,.7)" }}>{p.limit}</p>
            )}
          </div>
          )}
        </div>
      ))}

      {n > 1 && (
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
          {items.map((p, m) => (
            <button
              key={p.id}
              onClick={() => setI(m)}
              aria-label={`${m + 1}번째 혜택 보기`}
              style={{
                width: m === i ? 18 : 6, height: 6, borderRadius: 999, padding: 0,
                border: "none", cursor: "pointer", transition: "width .3s, background .3s",
                background: m === i ? "#fff" : "rgba(255,255,255,.42)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* 행사 장표 넘겨 보기 — 홈 배너(대표 한 장)를 누르면 열린다(2026-11-19 사용자).
   장표는 비율이 제각각(16:9 · 4:5)이라 화면 폭에 맞춰 그대로 보이고, 좌우로 밀거나 아래 점 · 화살표로 넘긴다.
   장기적으로는 같은 장표로 웹 프로모션 페이지를 만든다 */
export function PromoSlides({ promo }) {
  const imgs = (promo && promo.images) || [];
  const [i, setI] = useState(0);
  const drag = useRef(null), [dx, setDx] = useState(0);
  /* 장마다 비율이 달라 상자 높이를 지금 보는 장에 맞춘다(가장 긴 장에 맞추면 16:9 장 아래가 빈다) */
  const [hs, setHs] = useState({});
  const n = imgs.length;
  const go = (d) => setI((x) => Math.min(n - 1, Math.max(0, x + d)));
  const down = (e) => { drag.current = { x: e.clientX }; };
  const move = (e) => { if (drag.current) setDx(e.clientX - drag.current.x); };
  const up = () => { if (!drag.current) return; if (dx < -40) go(1); else if (dx > 40) go(-1); drag.current = null; setDx(0); };
  if (!n) return null;
  const btn = { width: 36, height: 36, borderRadius: 999, border: "1px solid #E2E5E8", background: "#FFFFFF", display: "grid", placeItems: "center", cursor: "pointer" };
  const arrow = (d) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d={d < 0 ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"} stroke="#2D373D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return (
    <div>
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
        /* 장표는 화면 폭 끝까지(좌우 여백 · 테두리 · 둥근 모서리 없음) */
        style={{ overflow: "hidden", touchAction: "pan-y", userSelect: "none", background: "#F7F7F8",
          height: hs[i] || "auto", transition: "height .3s" }}>
        <div style={{ display: "flex", alignItems: "flex-start", transform: `translateX(calc(${-i * 100}% + ${dx}px))`, transition: dx ? "none" : "transform .4s cubic-bezier(.3,.7,.2,1)" }}>
          {imgs.map((name, k) => (
            k === 0 && promo.detailVideo && slideUrl(promo.detailVideo) ? (
              <video key={name} src={slideUrl(promo.detailVideo)} poster={slideUrl(name)} autoPlay muted loop playsInline
                onLoadedData={(e) => { const h = e.currentTarget.offsetHeight; setHs((o) => ({ ...o, [k]: h })); }}
                style={{ flex: "0 0 100%", width: "100%", height: "auto", display: "block", pointerEvents: "none" }} />
            ) : (
            <img key={name} src={slideUrl(name)} alt={`${promo.title} ${k + 1}`} draggable={false}
              onLoad={(e) => { const h = e.currentTarget.offsetHeight; setHs((o) => ({ ...o, [k]: h })); }}
              style={{ flex: "0 0 100%", width: "100%", height: "auto", display: "block" }} />
            )
          ))}
        </div>
      </div>
      {n > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 20px 0" }}>
          <button type="button" aria-label="앞 장" onClick={() => go(-1)} disabled={i === 0} style={{ ...btn, opacity: i === 0 ? 0.4 : 1 }}>{arrow(-1)}</button>
          <div style={{ display: "flex", gap: 6 }}>
            {imgs.map((name, m) => (
              <button key={name} type="button" aria-label={`${m + 1}번째 장`} onClick={() => setI(m)}
                style={{ width: m === i ? 18 : 6, height: 6, borderRadius: 999, padding: 0, border: "none", cursor: "pointer", transition: "width .3s", background: m === i ? "#01C0A4" : "#E2E5E8" }} />
            ))}
          </div>
          <button type="button" aria-label="다음 장" onClick={() => go(1)} disabled={i === n - 1} style={{ ...btn, opacity: i === n - 1 ? 0.4 : 1 }}>{arrow(1)}</button>
        </div>
      )}
    </div>
  );
}
