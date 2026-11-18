/* 키오스크 부품 한 벌(2026-11-17 사용자 「같은 리스트 · 버튼 · 칩 · 타이틀 · 헤더 등 비슷한 디자인끼리 전부 하나로」).
 *
 * 화면은 이 파일의 부품만 씁니다. 같은 역할을 화면마다 새로 그리지 않습니다.
 *   Section  묶음 제목(15/600) + 개수 + 오른쪽 자리, 묶음 사이 여백 한 값
 *   Rows/Row 목록 줄 — 앞(그림 칸 · 점 · 번호) · 제목(14/600) · 아랫줄(12 회색) · 뒤(글자) · 꺾쇠
 *   Thumb    그림 칸(사진이 있으면 사진, 없으면 이모지)
 *   Tile     카드(이모지 + 제목) — 홈 카테고리 · 카테고리 목록
 *   Chip     칩 — 건강 고민 · 이런 분께 · 브랜드
 *   Btn      버튼 — 주(민트 면 · 흰 글자) · 보조(흰 면 · 테두리)
 *   Seg      고르기 칸 — 옅은 회색 판 + 고른 칸 흰색(언어 · 카테고리/브랜드)
 *   Badge    번호 칸(매대 번호 · 단계 번호) — 민트 면 · 흰 글자
 * 글자 한 벌(2026-11-18 전수 점검): 크기 12 · 13 · 14 · 15 · 17 · 20, 굵기 400 · 500 · 600 — 회색 글자에 600 · 700 · 11px 이하 금지. 건강 가이드 css/kiosk-align.css 와 같은 값
 * 값: 검정 #2D373D(파마 블랙 라이트) · 회색 #626E7C / #98A2AE · 선 #E2E5E8 / #EFF1F3 · 판 #F2F4F5 · 민트 #01C0A4
 * 호버(마우스 있을 때만): 줄은 은은한 회색 판(2026-11-17 사용자 「리스트 전부 호버 은은하게 그레이로」), 상자로 된 것(카드 · 칩 · 보조 버튼)은 테두리만 민트 */

export const INK = "#2D373D", SUB = "#626E7C", MUTED = "#98A2AE", LINE = "#E2E5E8", SOFT = "#EFF1F3", PLATE = "#F2F4F5", MINT = "#01C0A4";
export const GAP = 28;   /* 묶음 사이 */
export const PAD = 20;   /* 화면 좌우 */

export const UI_CSS = `
.ui-row{position:relative;isolation:isolate}
.ui-row.is-go::before{content:"";position:absolute;inset:0 -10px;border-radius:8px;background:${SOFT};opacity:0;transition:opacity .15s;z-index:-1;pointer-events:none}
.ui-tile,.ui-chip,.ui-btn2{transition:border-color .15s}
@media (hover:hover){
  .ui-row.is-go:hover::before{opacity:.6}
  .ui-tile:hover,.ui-chip.is-go:hover,.ui-btn2:hover{border-color:${MINT}!important}
  .ui-btn1:hover{filter:brightness(.95)}
  .ui-seg button[aria-pressed="false"]:hover{color:${INK}}
}
/* 터치 화면엔 호버가 없어 누를 때도 같은 민트 테두리(2026-11-18 사용자 「호버 디자인이 사라졌다」) */
.ui-tile:active,.ui-chip.is-go:active,.ui-btn2:active{border-color:${MINT}!important}
@media (hover:hover){.ui-tile:hover .ui-chev{transform:translateX(2px)}}
.ui-swipe{scrollbar-width:none}.ui-swipe::-webkit-scrollbar{display:none}
`;

export function Section({ title, count, right, children, gap = GAP }) {
  return (
    <section style={{ marginBottom: gap }}>
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, minHeight: 30 }}>
          {title && <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, lineHeight: 1.45 }}>
            {title}{count != null && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: MUTED }}>{count}</span>}
          </h2>}
          {right && <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Thumb({ emoji, img, size = 44 }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 8, border: `1px solid ${SOFT}`, background: "#FFFFFF",
      flexShrink: 0, display: "grid", placeItems: "center", overflow: "hidden", fontSize: Math.round(size * 0.55), lineHeight: 1 }}>
      {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : emoji}
    </span>
  );
}

export function Badge({ children, size = 28 }) {
  return <span style={{ flexShrink: 0, display: "grid", placeItems: "center", minWidth: size, height: size, padding: "0 7px", borderRadius: 8,
    background: MINT, color: "#FFFFFF", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", boxSizing: "border-box" }}>{children}</span>;
}

export function Dot({ color }) {
  return <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />;
}

const CHEV = <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
  <path d="M6 3.5 10.5 8 6 12.5" stroke={MUTED} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/* 목록 줄. 줄 사이 선은 Rows 가 긋습니다(첫 줄 위 · 끝 줄 아래 없음). height 를 주면 그 높이로 고정(긴 목록) */
export function Row({ lead, title, sub, trail, onClick, chevron = !!onClick, height, clamp = true }) {
  const one = clamp ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : { wordBreak: "keep-all" };
  return (
    <div className={"ui-row" + (onClick ? " is-go" : "")} onClick={onClick} role={onClick ? "button" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: height ? 0 : "12px 0", height, boxSizing: "border-box", cursor: onClick ? "pointer" : "default" }}>
      {lead}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="ui-row-t" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1.4, ...one }}>{title}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.4, ...one }}>{sub}</p>}
      </div>
      {trail != null && <span style={{ flexShrink: 0, fontSize: 12, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{trail}</span>}
      {chevron && CHEV}
    </div>
  );
}

export function Rows({ children }) {
  const list = [].concat(children).flat().filter(Boolean);
  return <div>{list.map((c, i) => <div key={c.key ?? i} style={{ borderTop: i ? `1px solid ${SOFT}` : "none" }}>{c}</div>)}</div>;
}

export function Tile({ emoji, title, onClick, width }) {
  return (
    <div className="ui-tile" onClick={onClick} role="button" style={{ flex: width ? "0 0 auto" : undefined, width, boxSizing: "border-box",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px 12px", border: `1px solid ${LINE}`,
      borderRadius: 10, background: "#FFFFFF", cursor: "pointer", textAlign: "center" }}>
      <span aria-hidden="true" style={{ fontSize: 28, lineHeight: 1, height: 32, display: "grid", placeItems: "center" }}>{emoji}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1.35, wordBreak: "keep-all",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</span>
    </div>
  );
}

export function Chip({ children, emoji, onClick }) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag type={onClick ? "button" : undefined} className={"ui-chip" + (onClick ? " is-go" : "")} onClick={onClick}
      style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 5, height: 34, padding: "0 12px", boxSizing: "border-box",
        borderRadius: 999, border: `1px solid ${LINE}`, background: "#FFFFFF", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
        color: INK, whiteSpace: "nowrap", cursor: onClick ? "pointer" : "default", lineHeight: 1 }}>
      {emoji && <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>{emoji}</span>}{children}
    </Tag>
  );
}

export function ChipRow({ children, swipe }) {
  return swipe
    ? <div className="ui-swipe" style={{ display: "flex", gap: 6, overflowX: "auto", margin: `0 -${PAD}px`, padding: `0 ${PAD}px` }}>{children}</div>
    : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>;
}

export function Btn({ children, onClick, kind = "primary", full = true }) {
  const pri = kind === "primary";
  return (
    <button type="button" onClick={onClick} className={pri ? "ui-btn1" : "ui-btn2"} style={{ width: full ? "100%" : undefined, height: 48,
      padding: "0 18px", borderRadius: 10, border: pri ? "none" : `1px solid ${LINE}`, background: pri ? MINT : "#FFFFFF",
      color: pri ? "#FFFFFF" : INK, fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>{children}</button>
  );
}

/* 고르기 칸 — 옅은 회색 판 위 고른 칸만 흰색. 글자는 위아래 가운데(높이 고정 · line-height 1) */
export function Seg({ items, value, onChange, small, full }) {
  const h = small ? 26 : 36;
  /* 고른 칸의 흰 판이 옆으로 미끄러진다(2026-11-17 「슬라이드 기능 · 좌우 폭 줄여」) — 칸 폭을 똑같이 나눠 판 하나를 칸 수만큼 옮긴다.
     작은 것(언어)은 칸 30 · 사이 0 으로 좁힘(전엔 34 + 사이 2) */
  const n = items.length, at = Math.max(0, items.findIndex(([id]) => id === value));
  return (
    <div className="ui-seg" role="group" style={{ position: "relative", display: full ? "grid" : "inline-grid", gridTemplateColumns: `repeat(${n}, 1fr)`,
      padding: 3, borderRadius: small ? 999 : 10, background: PLATE, width: full ? "100%" : undefined, boxSizing: "border-box", flexShrink: 0 }}>
      <span aria-hidden="true" style={{ position: "absolute", top: 3, left: 3, width: `calc((100% - 6px) / ${n})`, height: h, borderRadius: small ? 999 : 8,
        background: "#FFFFFF", boxShadow: "0 1px 2px rgba(45,55,61,.12)", transform: `translateX(${at * 100}%)`,
        transition: "transform .22s cubic-bezier(.3,.7,.2,1)", pointerEvents: "none" }} />
      {items.map(([id, label]) => {
        const on = id === value;
        return (
          <button key={id} type="button" aria-pressed={on} onClick={() => onChange(id)} style={{ position: "relative",
            minWidth: small ? 30 : undefined, height: h, padding: small ? "0 4px" : "0 14px", border: "none", borderRadius: small ? 999 : 8,
            background: "transparent", color: on ? INK : MUTED, fontFamily: "inherit", fontSize: small ? 12 : 14, fontWeight: on ? 600 : 500,
            lineHeight: 1, display: "grid", placeItems: "center", cursor: "pointer", transition: "color .22s ease" }}>{label}</button>
        );
      })}
    </div>
  );
}
