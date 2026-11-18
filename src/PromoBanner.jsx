import { useState, useEffect, useRef } from "react";
import { PROMOTIONS } from "./promotions.js";
import { STORE_PHOTO } from "./storePhoto.js";

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
const slideUrl = (name) => SLIDES[`./promo/${name}`];
const bgOf = (p) => `url(${(p.image && slideUrl(p.image)) || STORE_PHOTO})`;

export default function PromoBanner({ onPress, interval = 5000, bleed = 0 }) {
  /* 프칼 건은 그날 기간 안에 있는 것만. 하나도 없으면 상시 건(src 상시) — scripts/sync-racks.mjs */
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const live = PROMOTIONS.filter((p) => (!p.from || p.from <= today) && (!p.to || p.to >= today));
  const cal = live.filter((p) => p.src === "프칼");
  const items = cal.length ? cal : live.filter((p) => p.src !== "프칼");
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
    const t = setTimeout(() => setI((x) => (x + 1) % n), interval);
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
          onClick={onPress ? () => onPress(p) : undefined}
          style={{
            position: "absolute", inset: 0,
            transform: `translateX(calc(${slot(k)} * 100% + ${dx}px))`,
            transition: dx ? "none" : "transform .45s cubic-bezier(.3,.7,.2,1)",
            visibility: Math.abs(slot(k)) > 1 ? "hidden" : "visible",
            pointerEvents: k === i ? "auto" : "none",
            backgroundImage: bgOf(p),
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: onPress ? "pointer" : "default",
          }}
        >
          {/* 그림 안에 이미 문구가 박힌 디자인 시안이면 글자를 얹지 않습니다 —
              겹쳐 읽힙니다. 그 외(매장 사진)에는 문구를 얹어야 합니다. 전에는
              「그림이 있으면 문구가 박힌 것」으로 보아, 맨 매장 사진을 건 슬라이드
              두 장이 제목도 설명도 없는 빈 사진으로 떠 있었습니다.
              정본에 imageHasText 를 적은 슬라이드만 글자를 숨깁니다. */}
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
