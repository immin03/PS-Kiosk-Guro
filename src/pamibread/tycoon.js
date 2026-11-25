/* 파미빵 타이쿤 — 규칙(화면 없이 돌아가는 순수 로직). 3D 화면은 이 상태를 그리기만 한다.
 * 한 판 60초. 빈 틀을 눌러 반죽 → 테두리가 민트일 때 눌러 뒤집기 → 한 번 더 민트일 때 눌러 꺼내기 → 손님을 눌러 건네기.
 * 너무 오래 두면 타고, 탄 빵은 눌러서 버린다. 판 개수 3개마다 스탬프 하나(최대 5). */
export const ROUND = 60;
export const MOLDS = 6;
export const COOK = 3;            // 한 면이 알맞게 익는 데 걸리는 초(c = 1)
export const MIN_TAP = 0.5;       // 이보다 덜 익으면 눌러도 안 넘어간다
export const READY = 0.75;        // 여기부터 민트(알맞음)
export const PERFECT_HI = 1.35;   // 여기부터 주황(조금 탐)
export const BURN = 1.9;          // 여기서 탄다
export const FILLINGS = ["팥", "슈크림"];
export const PRICE = 1000;
export const TIP = 300;           // 두 면 다 알맞게 구운 빵 하나당
export const FAST_BONUS = 500;    // 손님이 오래 기다리지 않았을 때
export const TRAY_MAX = 8;
export const MAX_CUSTOMERS = 3;
export const STAMP_EVERY = 3;
export const STAMP_MAX = 5;

export const stampsFor = (sold) => Math.min(STAMP_MAX, Math.floor(sold / STAMP_EVERY));

export function grade(c) {
  if (c < READY) return "raw";
  if (c <= PERFECT_HI) return "perfect";
  if (c < BURN) return "over";
  return "burnt";
}

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const emptyMold = () => ({ stage: "empty", c: 0, fill: null, perfectA: false });

export function createGame(seed = 1) {
  return {
    t: 0, left: ROUND, over: false, filling: FILLINGS[0],
    molds: Array.from({ length: MOLDS }, emptyMold),
    tray: [], customers: [], nextCustomer: 1, nextId: 1,
    sold: 0, money: 0, perfectSold: 0, lost: 0,
    events: [], rand: rng(seed),
  };
}

export const trayCount = (g, fill) => g.tray.filter((b) => b.fill === fill).length;

function newCustomer(g) {
  const r = g.rand;
  const late = g.t > 20;
  const total = 1 + Math.floor(r() * (late ? 3 : 2));          // 처음엔 1~2개, 20초 뒤엔 1~3개
  const order = { 팥: 0, 슈크림: 0 };
  for (let i = 0; i < total; i++) order[r() < 0.6 ? "팥" : "슈크림"] += 1;
  const max = 22 - Math.min(8, g.t / 6);
  return { id: g.nextId++, order, patience: max, max, look: Math.floor(r() * 4) };
}

/* 시간 흐르기 */
export function step(g, dt) {
  if (g.over) return g;
  g.t += dt;
  g.left = Math.max(0, ROUND - g.t);
  g.molds.forEach((m, i) => {
    if (m.stage !== "sideA" && m.stage !== "sideB") return;
    m.c += dt / COOK;
    if (m.c >= BURN) { m.stage = "burnt"; g.events.push({ type: "burn", i }); }
  });
  for (let j = g.customers.length - 1; j >= 0; j--) {
    const cu = g.customers[j];
    cu.patience -= dt;
    if (cu.patience <= 0) { g.customers.splice(j, 1); g.lost += 1; g.events.push({ type: "leave", id: cu.id }); }
  }
  g.nextCustomer -= dt;
  if (g.nextCustomer <= 0) {
    if (g.customers.length < MAX_CUSTOMERS && g.left > 5) {
      const cu = newCustomer(g);
      g.customers.push(cu);
      g.events.push({ type: "arrive", id: cu.id });
    }
    g.nextCustomer = (4 + g.rand() * 2.5) * (1 - Math.min(0.35, g.t / ROUND * 0.35));
  }
  if (g.left <= 0) { g.over = true; g.events.push({ type: "over" }); }
  return g;
}

export function setFilling(g, f) { if (FILLINGS.includes(f)) g.filling = f; }

/* 틀 누르기 — 틀 상태에 따라 반죽 · 뒤집기 · 꺼내기 · 버리기 */
export function tapMold(g, i) {
  if (g.over) return null;
  const m = g.molds[i];
  if (!m) return null;
  let ev;
  if (m.stage === "empty") {
    Object.assign(m, { stage: "sideA", c: 0, fill: g.filling, perfectA: false });
    ev = { type: "pour", i, fill: m.fill };
  } else if (m.stage === "sideA") {
    if (m.c < MIN_TAP) ev = { type: "wait", i };
    else {
      m.perfectA = grade(m.c) === "perfect";
      m.stage = "sideB"; m.c = 0;
      ev = { type: "flip", i };
    }
  } else if (m.stage === "sideB") {
    if (m.c < MIN_TAP) ev = { type: "wait", i };
    else if (g.tray.length >= TRAY_MAX) ev = { type: "full", i };
    else {
      const perfect = m.perfectA && grade(m.c) === "perfect";
      g.tray.push({ fill: m.fill, perfect });
      ev = { type: "done", i, fill: m.fill, perfect };
      Object.assign(m, emptyMold());
    }
  } else if (m.stage === "burnt") {
    Object.assign(m, emptyMold());
    ev = { type: "discard", i };
  }
  if (ev) g.events.push(ev);
  return ev;
}

/* 손님 누르기 — 주문만큼 쟁반에 있으면 건넨다. 잘 구운 빵부터 준다 */
export function serve(g, id) {
  if (g.over) return null;
  const j = g.customers.findIndex((c) => c.id === id);
  if (j < 0) return null;
  const cu = g.customers[j];
  const short = FILLINGS.some((f) => trayCount(g, f) < cu.order[f]);
  if (short) { const ev = { type: "short", id }; g.events.push(ev); return ev; }
  let n = 0, perfect = 0;
  for (const f of FILLINGS) {
    for (let k = 0; k < cu.order[f]; k++) {
      let idx = g.tray.findIndex((b) => b.fill === f && b.perfect);
      if (idx < 0) idx = g.tray.findIndex((b) => b.fill === f);
      const [b] = g.tray.splice(idx, 1);
      n += 1; if (b.perfect) perfect += 1;
    }
  }
  const fast = cu.patience / cu.max > 0.5;
  const pay = n * PRICE + perfect * TIP + (fast ? FAST_BONUS : 0);
  g.customers.splice(j, 1);
  g.sold += n; g.perfectSold += perfect; g.money += pay;
  const ev = { type: "serve", id, n, perfect, fast, pay };
  g.events.push(ev);
  return ev;
}

export function takeEvents(g) { const e = g.events; g.events = []; return e; }
