/* 파미탑 — 자르기 규칙(화면 없음). 원작: KonradLinkowski/Stack (MIT, LICENSE-stack.txt) 의 cutBox 를 순수 함수로 옮김.
 * prev: 아래 층 { cx, cz, sx, sz }, cur: 움직이던 층의 가운데 { cx, cz } (크기는 아래 층과 같음).
 * 한 층은 한 축으로만 움직이므로 잘린 조각도 한 축에서만 나온다. */
export const FULL = 100;      // 첫 층 한 변
export const PERFECT_EPS = 0.05;
export const GROW_AFTER = 3;  // 퍼펙트가 이만큼 이어지면 조금씩 다시 넓어짐
export const GROW_STEP = 4;
export const STAMP_EVERY = 5; // 5층마다 스탬프 하나
export const STAMP_MAX = 5;
export const SHIELD_AFTER = 5;  // 퍼펙트가 이만큼 이어지면 실드 하나(한 번 놓쳐도 이어감, 한 번에 하나만)
export const SPEED_BASE = 140;
export const SPEED_STEP = 30;   // 단계마다 이만큼 빨라짐
export const SPEED_EVERY = 10;  // 이 층마다 한 단계
export const SPEED_MAX = 260;
export const RANDOM_DIR_AT = 20; // 이 층부터 나오는 쪽이 무작위
export const BONUS_MAX = 5;     // 퍼펙트 연속 보너스 상한(층 하나에 더하는 점수)

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

/* 10층마다 한 단계씩 빨라진다 */
export function speedFor(index) {
  return Math.min(SPEED_MAX, SPEED_BASE + SPEED_STEP * Math.floor(Math.max(0, index) / SPEED_EVERY));
}

/* 층이 나오는 쪽: 20층 전엔 늘 -1, 그 뒤엔 무작위(rand 는 0~1) */
export function spawnSide(index, rand) {
  return index >= RANDOM_DIR_AT && rand < 0.5 ? 1 : -1;
}

/* 층 하나 점수: 1 + 퍼펙트면 연속 수(최대 5) */
export function floorPoints(perfect, combo) {
  return 1 + (perfect ? Math.min(BONUS_MAX, combo) : 0);
}

/* 실드: 퍼펙트 연속이 SHIELD_AFTER 의 배수에 닿을 때 하나(이미 있으면 그대로) */
export function earnsShield(combo, has) {
  return !has && combo > 0 && combo % SHIELD_AFTER === 0;
}
