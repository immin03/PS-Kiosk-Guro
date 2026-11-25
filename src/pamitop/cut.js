/* 파미빵 쌓기 — 자르기 규칙(화면 없음). 원작: KonradLinkowski/Stack (MIT, LICENSE-stack.txt) 의 cutBox 를 순수 함수로 옮김.
 * prev: 아래 층 { cx, cz, sx, sz }, cur: 움직이던 층의 가운데 { cx, cz } (크기는 아래 층과 같음).
 * 한 층은 한 축으로만 움직이므로 잘린 조각도 한 축에서만 나온다. */
export const FULL = 100;      // 첫 층 한 변
export const PERFECT_EPS = 0.05;
export const GROW_AFTER = 3;  // 퍼펙트가 이만큼 이어지면 조금씩 다시 넓어짐
export const GROW_STEP = 4;
export const STAMP_EVERY = 5; // 5층마다 스탬프 하나
export const STAMP_MAX = 5;

export function cutTile(prev, cur) {
  const dx = cur.cx - prev.cx;
  const dz = cur.cz - prev.cz;
  const adx = Math.abs(dx), adz = Math.abs(dz);
  const sx = prev.sx - adx, sz = prev.sz - adz;
  if (sx <= 0 || sz <= 0) return { miss: true };
  if (adx / prev.sx <= PERFECT_EPS && adz / prev.sz <= PERFECT_EPS) {
    return { miss: false, perfect: true, placed: { ...prev }, piece: null };
  }
  const placed = { cx: prev.cx + dx / 2, cz: prev.cz + dz / 2, sx, sz };
  const piece = adx >= adz
    ? { cx: cur.cx + Math.sign(dx) * sx / 2, cz: prev.cz, sx: adx, sz: prev.sz }
    : { cx: prev.cx, cz: cur.cz + Math.sign(dz) * sz / 2, sx: prev.sx, sz: adz };
  return { miss: false, perfect: false, placed, piece };
}

/* 퍼펙트가 이어질 때 한 변을 조금 되돌려 준다(원래 크기 FULL 까지) */
export function grow(t, combo) {
  if (combo < GROW_AFTER) return t;
  return { ...t, sx: Math.min(FULL, t.sx + GROW_STEP), sz: Math.min(FULL, t.sz + GROW_STEP) };
}

export function stampsFor(floors) {
  return Math.min(STAMP_MAX, Math.floor(Math.max(0, floors) / STAMP_EVERY));
}

/* 층이 오를수록 빨라진다 */
export function speedFor(index) {
  return Math.min(260, 140 + index * 3);
}
