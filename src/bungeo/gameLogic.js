/* 얼굴빵 스탬프 게임 — 순수 로직(시간 · 난수를 밖에서 받는다, 화면 없음).
 * 한 판 60초. 틀 6칸에 반죽을 붓고 4초 뒤 뒤집어 꺼낸다. 손님은 1~3개씩 주문하고 인내심이 다하면 떠난다.
 * 손님 한 명을 채울 때마다 스탬프 한 칸. 스탬프는 봉투 겉에 직원이 찍는다(키오스크는 개수만 보여 준다). */

export const ROUND_MS = 60_000;
export const COOK_MS = 4_000;
export const BURN_AT = 1.3;        // 굽는 진행 1.3 이상은 탐
export const CAVITIES = 6;
export const BASKET_MAX = 6;
export const MAX_QUEUE = 3;
export const SPAWN_MS = 6_000;
export const PATIENCE_MS = 22_000;
export const STAMP_MAX = 5;
export const POINTS = { perfect: 10, ok: 5 };
export const SERVE_BONUS = 20;

/* 굽는 진행률 p(0~) 에서 꺼낼 때의 품질 */
export function judge(p) {
  if (p < 0.6) return "raw";
  if (p < 0.75) return "ok";
  if (p <= 1.0) return "perfect";
  if (p <= BURN_AT) return "ok";
  return "burnt";
}

/* 결정적 난수(선형 합동). seed 를 상태에 들고 다닌다 */
export function nextRand(seed) {
  const s = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { value: s / 4294967296, seed: s };
}

export function createGame(seed = 1, now = 0) {
  return {
    startedAt: now,
    lastAt: now,
    seed,
    cavities: Array.from({ length: CAVITIES }, () => null), // null | { startedAt }
    basket: [],                // [{ q: "perfect" | "ok" }]
    queue: [],                 // [{ id, need, left }]
    nextSpawnAt: now,
    nextId: 1,
    score: 0,
    served: 0,
    lost: 0,
    burnt: 0,
    ended: false,
  };
}

export function cookProgress(cavity, now) {
  return cavity ? (now - cavity.startedAt) / COOK_MS : 0;
}

/* 틀 한 칸 누르기: 비면 붓기, 익는 중이면 꺼내기(설익음 · 기다리는 중이면 아무 일 없음) */
export function tapCavity(state, i, now) {
  if (state.ended) return state;
  const c = state.cavities[i];
  if (!c) {
    const cavities = state.cavities.slice();
    cavities[i] = { startedAt: now };
    return { ...state, cavities };
  }
  const q = judge(cookProgress(c, now));
  if (q === "raw") return state;
  const cavities = state.cavities.slice();
  cavities[i] = null;
  if (q === "burnt") return { ...state, cavities, burnt: state.burnt + 1 };
  if (state.basket.length >= BASKET_MAX) return state; // 바구니가 꽉 참: 틀에 그대로 둔다
  return { ...state, cavities, basket: [...state.basket, { q }] };
}

/* 시간 흐름: 인내심 · 손님 등장 · 라운드 종료 */
export function tick(state, now) {
  if (state.ended) return state;
  if (now - state.startedAt >= ROUND_MS) {
    const lost = state.lost + state.queue.length;
    return { ...state, lastAt: now, ended: true, queue: [], lost };
  }
  const dt = Math.max(0, now - state.lastAt);
  let { queue, lost, seed, nextSpawnAt, nextId } = state;
  queue = queue
    .map((cu) => ({ ...cu, left: cu.left - dt }))
    .filter((cu) => {
      if (cu.left > 0) return true;
      lost += 1;
      return false;
    });
  if (now >= nextSpawnAt && queue.length < MAX_QUEUE) {
    const r = nextRand(seed);
    seed = r.seed;
    queue = [...queue, { id: nextId, need: 1 + Math.floor(r.value * 3), left: PATIENCE_MS }];
    nextId += 1;
    nextSpawnAt = now + SPAWN_MS;
  }
  return { ...state, lastAt: now, queue, lost, seed, nextSpawnAt, nextId };
}

/* 손님에게 주문만큼 건네기. 빵이 모자라면 아무 일 없음 */
export function deliver(state, customerId) {
  if (state.ended) return state;
  const cu = state.queue.find((x) => x.id === customerId);
  if (!cu || state.basket.length < cu.need) return state;
  const given = state.basket.slice(0, cu.need);
  const pts = given.reduce((sum, b) => sum + POINTS[b.q], 0) + SERVE_BONUS;
  return {
    ...state,
    basket: state.basket.slice(cu.need),
    queue: state.queue.filter((x) => x.id !== customerId),
    score: state.score + pts,
    served: state.served + 1,
  };
}

export function summarize(state) {
  return {
    score: state.score,
    served: state.served,
    lost: state.lost,
    burnt: state.burnt,
    stamps: Math.min(STAMP_MAX, state.served),
  };
}
