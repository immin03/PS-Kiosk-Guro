import { useEffect, useState } from "react";
import { INK, SUB, MUTED, LINE, SOFT, MINT } from "../ui.jsx";
import {
  ROUND_MS, CAVITIES, BASKET_MAX, PATIENCE_MS, STAMP_MAX, createGame, tapCavity, tick, deliver, summarize, cookProgress, judge,
} from "./gameLogic.js";
import { REWARD_VISIBLE, rewardFor } from "./rewards.js";

/* 얼굴빵 한 개. 파미 얼굴 그림이 들어오기 전까지는 자리표시 얼굴(원 · 눈 · 입)이다 */
function FaceBread({ p = 0, size = 72, dim = false }) {
  const t = Math.max(0, Math.min(1.3, p)) / 1.3;
  const from = [255, 243, 214], to = [201, 130, 58];
  const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));
  const fill = p > 1.3 ? "#3A2A1E" : `rgb(${c[0]},${c[1]},${c[2]})`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ opacity: dim ? 0.45 : 1 }}>
      <circle cx="50" cy="50" r="46" fill={fill} stroke="#8A5A2B" strokeWidth="3"/>
      <circle cx="34" cy="44" r="5" fill={INK}/>
      <circle cx="66" cy="44" r="5" fill={INK}/>
      <path d="M36 62 Q50 74 64 62" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

const btn = (main) => ({
  height: 52, padding: "0 22px", borderRadius: 12, fontSize: 17, fontWeight: 600, cursor: "pointer",
  border: main ? "none" : `1px solid ${LINE}`, background: main ? MINT : "#FFFFFF", color: main ? "#FFFFFF" : INK,
});

export default function BungeoGame({ onExit }) {
  const [phase, setPhase] = useState("ready");
  const [s, setS] = useState(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (phase !== "play") return undefined;
    const id = setInterval(() => {
      setS((prev) => (prev ? tick(prev, Date.now()) : prev));
      force((n) => n + 1);
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "play" && s?.ended) setPhase("end");
  }, [phase, s]);

  const start = () => {
    const now = Date.now();
    setS(createGame(now % 2147483647 || 1, now));
    setPhase("play");
  };

  if (phase === "ready" || !s) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: INK }}>얼굴빵 스탬프</div>
        <p style={{ fontSize: 15, color: SUB, lineHeight: 1.6, margin: "12px 0 28px" }}>
          틀에 반죽을 붓고, 노릇해지면 뒤집어 꺼내세요.<br/>
          손님이 주문한 만큼 건네면 스탬프가 한 칸 찍힙니다.<br/>
          한 판은 60초입니다.
        </p>
        <button type="button" style={btn(true)} onClick={start}>시작하기</button>
      </div>
    );
  }

  const now = Date.now();
  const left = Math.max(0, Math.ceil((ROUND_MS - (now - s.startedAt)) / 1000));

  if (phase === "end") {
    const r = summarize(s);
    const reward = REWARD_VISIBLE ? rewardFor(r.stamps) : null;
    return (
      <div style={{ padding: "28px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: INK }}>한 판 끝</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "20px 0 10px" }} aria-label={`스탬프 ${r.stamps}개`}>
          {Array.from({ length: STAMP_MAX }, (_, i) => (
            <div key={i} style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${i < r.stamps ? MINT : LINE}`, background: i < r.stamps ? MINT : SOFT }}/>
          ))}
        </div>
        <div style={{ fontSize: 15, color: SUB, marginBottom: 6 }}>스탬프 {r.stamps} / {STAMP_MAX}</div>
        <div style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>손님 {r.served}명 · 놓친 손님 {r.lost}명 · 점수 {r.score}</div>
        {reward && <div style={{ fontSize: 16, color: INK, marginBottom: 16 }}>{reward.label}</div>}
        <p style={{ fontSize: 14, color: SUB, lineHeight: 1.6, marginBottom: 24 }}>
          이 화면을 직원에게 보여 주세요. 봉투 겉에 스탬프를 찍어 드립니다.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button type="button" style={btn(false)} onClick={onExit}>나가기</button>
          <button type="button" style={btn(true)} onClick={start}>다시 하기</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 15, color: SUB }}>남은 시간 <b style={{ color: INK }}>{left}초</b></span>
        <span style={{ fontSize: 15, color: SUB }}>점수 <b style={{ color: INK }}>{s.score}</b> · 스탬프 {Math.min(STAMP_MAX, s.served)}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }} aria-label="손님">
        {s.queue.length === 0 && <div style={{ fontSize: 14, color: MUTED, padding: "10px 0" }}>곧 손님이 옵니다</div>}
        {s.queue.map((cu) => {
          const ready = s.basket.length >= cu.need;
          return (
            <button type="button" key={cu.id} onClick={() => setS((prev) => deliver(prev, cu.id))}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: 12, border: `1px solid ${ready ? MINT : LINE}`, background: "#FFFFFF", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: INK, fontWeight: 600 }}>
                <span>손님 주문 {cu.need}개</span>
                <span style={{ color: ready ? MINT : MUTED }}>{ready ? "건네기" : "기다리는 중"}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: SOFT, marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(0, (cu.left / PATIENCE_MS) * 100)}%`, height: "100%", background: cu.left < 6000 ? "#E0A030" : MINT }}/>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {Array.from({ length: CAVITIES }, (_, i) => {
          const c = s.cavities[i];
          const p = c ? cookProgress(c, now) : 0;
          const q = c ? judge(p) : null;
          const ringOn = q === "perfect";
          return (
            <button type="button" key={i} onClick={() => setS((prev) => tapCavity(prev, i, Date.now()))}
              aria-label={`틀 ${i + 1}${c ? (q === "perfect" ? " 알맞게 익음" : q === "burnt" ? " 탐" : " 굽는 중") : " 비어 있음"}`}
              style={{ aspectRatio: "1 / 1", borderRadius: 16, border: `3px solid ${ringOn ? MINT : LINE}`, background: c ? "#FFFFFF" : SOFT, display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}>
              {c ? <FaceBread p={p} size={72}/> : <span style={{ fontSize: 13, color: MUTED }}>반죽 붓기</span>}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 14, color: SUB }}>
        바구니 ({s.basket.length}/{BASKET_MAX})
        <div style={{ display: "flex", gap: 6, marginTop: 6, minHeight: 40 }}>
          {s.basket.map((b, i) => <FaceBread key={i} p={b.q === "perfect" ? 1 : 0.7} size={38}/>)}
        </div>
      </div>
    </div>
  );
}
