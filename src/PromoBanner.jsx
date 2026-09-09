import { useState, useEffect } from "react";
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

export default function PromoBanner({ onPress, interval = 5000 }) {
  const items = PROMOTIONS;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const reduce =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items.length, interval]);

  if (!items.length) return null;

  return (
    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", marginBottom: 20, aspectRatio: "16 / 9" }}>
      {items.map((p, n) => (
        <div
          key={p.id}
          onClick={onPress ? () => onPress(p) : undefined}
          style={{
            position: "absolute", inset: 0, transition: "opacity .6s",
            opacity: n === i ? 1 : 0,
            pointerEvents: n === i ? "auto" : "none",
            backgroundImage: bgOf(p),
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: onPress ? "pointer" : "default",
          }}
        >
          {/* 슬라이드 이미지에는 문구가 이미 들어 있습니다. 위에 글자를 또 얹으면
              겹치므로, 이미지가 있는 슬라이드는 이미지만 보여줍니다. */}
          {!p.image && (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,40,38,.30) 0%,rgba(0,40,38,.74) 100%)" }} />
          )}
          {!p.image && (
          <div style={{ position: "relative", height: "100%", padding: "22px 22px 24px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {p.tag && (
              <span style={{
                alignSelf: "flex-start", marginBottom: 9, padding: "4px 10px", borderRadius: 999,
                background: "rgba(255,255,255,.2)", color: "#fff",
                fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
              }}>{p.tag}</span>
            )}
            <p style={{ margin: "0 0 5px", fontSize: 19, fontWeight: 800, color: "#fff", lineHeight: 1.28, letterSpacing: "-0.01em" }}>{p.title}</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.45 }}>{p.sub}</p>
            {p.limit && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,.7)" }}>{p.limit}</p>
            )}
          </div>
          )}
        </div>
      ))}

      {items.length > 1 && (
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
          {items.map((p, n) => (
            <button
              key={p.id}
              onClick={() => setI(n)}
              aria-label={`${n + 1}번째 혜택 보기`}
              style={{
                width: n === i ? 18 : 6, height: 6, borderRadius: 999, padding: 0,
                border: "none", cursor: "pointer", transition: "width .3s, background .3s",
                background: n === i ? "#fff" : "rgba(255,255,255,.42)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
