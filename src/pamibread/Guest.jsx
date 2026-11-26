/* 파미빵 타이쿤 손님 — 겨울 외투 + 목도리 반신(SVG). 기분 셋: 보통 · 신남(주문만큼 담김) · 화남(오래 기다림).
 * 머리 넷: 단발 · 짧은 머리 · 털모자 · 긴 머리(2026-11-26 사용자 「사람 손님」). */
const COATS = [["#1DBFB0", "#FFFFFF"], ["#E2574C", "#F7E3C8"], ["#2D4A6B", "#F2A93B"], ["#F2A93B", "#2D4A6B"]];
const SKINS = ["#F6D2B5", "#EFC29E", "#F9DCC6", "#E5B48F"];
const HAIRS = ["#3B2A22", "#5A3A26", "#2D373D", "#8A5A3A"];
const INK = "#2D373D";

function Face({ mood, cheek }) {
  return (
    <g>
      {mood === "happy" ? (
        <g stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round"><path d="M35 52 Q40 45 45 52" /><path d="M55 52 Q60 45 65 52" /></g>
      ) : (
        <g>
          {[40, 60].map((x) => <g key={x}><ellipse cx={x} cy={50} rx={3.4} ry={4.4} fill={INK} /><circle cx={x + 1.1} cy={48.4} r={1.1} fill="#fff" /></g>)}
          {mood === "mad" && <g stroke={INK} strokeWidth={2.6} strokeLinecap="round"><path d="M34 41 L45 44" /><path d="M66 41 L55 44" /></g>}
        </g>
      )}
      <ellipse cx={31} cy={58} rx={5.5} ry={3.6} fill={cheek} opacity={0.85} />
      <ellipse cx={69} cy={58} rx={5.5} ry={3.6} fill={cheek} opacity={0.85} />
      {mood === "happy" ? <path d="M44 58 Q50 66 56 58 Z" fill="#C2554A" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        : mood === "mad" ? <path d="M44 62 Q50 57 56 62" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        : <path d="M44 58 Q47 62 50 58 Q53 62 56 58" stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {mood === "mad" && <path d="M76 30 Q81 38 76 41 Q71 38 76 30 Z" fill="#8FD3F0" />}
    </g>
  );
}

function Body({ coat, scarf }) {
  return (
    <g>
      <path d="M12 112 Q12 80 50 77 Q88 80 88 112 Z" fill={coat} />
      <path d="M50 82 L50 112" stroke="rgba(0,0,0,.12)" strokeWidth={2} />
      <rect x={28} y={70} width={44} height={13} rx={6.5} fill={scarf} />
      <rect x={58} y={78} width={11} height={22} rx={4} fill={scarf} />
    </g>
  );
}

function Hair({ kind, hair, front }) {
  if (kind === 0) return front   /* 단발 */
    ? <path d="M21 46 Q22 18 50 18 Q78 18 79 46 Q68 32 50 33 Q32 32 21 46 Z" fill={hair} />
    : <path d="M17 50 Q16 14 50 14 Q84 14 83 50 L83 70 Q76 74 72 66 L28 66 Q24 74 17 70 Z" fill={hair} />;
  if (kind === 1) return front   /* 짧은 머리 */
    ? <path d="M20 46 Q19 15 50 15 Q81 15 80 46 Q74 30 60 33 Q50 25 40 33 Q27 30 20 46 Z" fill={hair} />
    : null;
  if (kind === 2) return front   /* 털모자 */
    ? <g><path d="M19 42 Q19 9 50 9 Q81 9 81 42 Z" fill="#E2574C" /><rect x={16} y={36} width={68} height={11} rx={5.5} fill="#F7E3C8" /><circle cx={50} cy={8} r={7} fill="#F7E3C8" /></g>
    : <path d="M20 48 Q20 30 50 30 Q80 30 80 48 L80 58 L20 58 Z" fill={hair} />;
  return front                   /* 긴 머리 */
    ? <path d="M20 48 Q20 16 52 16 Q80 18 80 44 Q64 26 40 36 Q30 38 20 48 Z" fill={hair} />
    : <path d="M16 50 Q16 14 50 14 Q84 14 84 50 L84 92 Q74 96 70 86 L30 86 Q26 96 16 92 Z" fill={hair} />;
}

export default function Guest({ look = 0, id = 0, mood = "normal" }) {
  const kind = look % 4;
  const tone = (id * 3 + look) % 4;
  const [coat, scarf] = COATS[(id + look) % 4];
  return (
    <svg viewBox="0 0 100 112" width="92" height="103" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <Body coat={coat} scarf={scarf} />
      <Hair kind={kind} hair={HAIRS[tone]} front={false} />
      <ellipse cx={50} cy={48} rx={29} ry={27} fill={SKINS[tone]} />
      <Face mood={mood} cheek="#F7A9A0" />
      <Hair kind={kind} hair={HAIRS[tone]} front />
    </svg>
  );
}
