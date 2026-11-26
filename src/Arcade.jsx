/* 아케이드 — 키오스크 게임 모음(2026-11-26 사용자 「아케이드로 하나로 묶어 더보기에」).
 * 칸 꼴은 홈 더 보기 칸과 같다(선 · 모서리 10 · 꺾쇠). 게임은 한국어 전용이라 문구도 한국어만. */
const GAMES = [
  { page: "pamibread", em: "🍞", title: "파미빵 타이쿤", sub: "60초 동안 파미빵을 구워 팔면 스탬프" },
  { page: "pamitop", em: "🥞", title: "파미탑", sub: "파미빵을 높이 쌓으면 스탬프" },
];

export default function Arcade({ onOpen }) {
  return (
    <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
      {GAMES.map((g) => (
        <div key={g.page} className="ui-tile" role="button" aria-label={`${g.title} 시작`} onClick={() => onOpen(g.page)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 14px", border: "1px solid #E2E5E8", borderRadius: 10, background: "#FFFFFF", cursor: "pointer" }}>
          <span aria-hidden="true" style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{g.em}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "#2D373D", lineHeight: 1.4 }}>{g.title}</span>
            <span style={{ display: "block", fontSize: 13, color: "#98A2AE", lineHeight: 1.4 }}>{g.sub}</span>
          </span>
          <svg className="ui-chev" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ marginLeft: "auto", flexShrink: 0, transition: "transform .15s" }}>
            <path d="M6 3.5 10.5 8 6 12.5" stroke="#98A2AE" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      ))}
    </div>
  );
}
