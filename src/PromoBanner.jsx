import { useState, useEffect } from "react";
import { PROMOTIONS } from "./promotions.js";

/* 홈 상단 프로모션 배너.
 *
 * 무엇을 몇 번째로 보여줄지는 PS-OS catalog/promotions.json 이 정합니다.
 * 이벤트 페이지 · 홈페이지도 같은 순서를 씁니다 — 생김새만 화면마다 다릅니다.
 * v3 프로토타입의 슬라이드 방식을 되살리되 문구는 정본에서 받습니다.
 */

const TONE = [
  "linear-gradient(135deg,#00302F 0%,#00786F 100%)",
  "linear-gradient(135deg,#005251 0%,#01C0A4 100%)",
  "linear-gradient(135deg,#0E6E60 0%,#2BCAB0 100%)",
  "linear-gradient(135deg,#004B47 0%,#159A87 100%)",
];

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
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 20, height: 172 }}>
      {items.map((p, n) => (
        <div
          key={p.id}
          onClick={onPress ? () => onPress(p) : undefined}
          style={{
            position: "absolute", inset: 0, transition: "opacity .6s",
            opacity: n === i ? 1 : 0,
            pointerEvents: n === i ? "auto" : "none",
            background: TONE[n % TONE.length],
            cursor: onPress ? "pointer" : "default",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,40,38,.18) 0%,rgba(0,40,38,.62) 100%)" }} />
          <div style={{ position: "relative", height: "100%", padding: "22px 22px 24px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {p.tag && (
              <span style={{
                alignSelf: "flex-start", marginBottom: 9, padding: "4px 10px", borderRadius: 40,
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
                width: n === i ? 18 : 6, height: 6, borderRadius: 3, padding: 0,
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
