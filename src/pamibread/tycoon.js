/* 파미빵 타이쿤 — 규칙(화면 없이 돌아가는 순수 로직). 3D 화면은 이 상태를 그리기만 한다.
 * 한 판 60초. 빈 틀을 눌러 반죽 → 테두리가 민트일 때 눌러 뒤집기 → 한 번 더 민트일 때 눌러 꺼내기 → 손님을 눌러 건네기.
 * 너무 오래 두면 타고(재료비가 빠짐), 탄 빵은 눌러서 버린다.
 * 하트 셋: 손님을 놓칠 때마다 하나씩 잃고 다 잃으면 바로 끝. 30초 뒤 불이 세진다. VIP 손님은 오래 못 기다리고 두 배를 낸다.
 * 잘 구운 빵만 이어 팔면 연속 보너스(×1.2, ×1.5). 점수는 매출, 매출 5,000원마다 스탬프 하나(최대 5). 규칙 문서 docs/arcade-rules.md */
export const ROUND = 60;
export const MOLDS = 6;
export const COOK = 3;            // 한 면이 알맞게 익는 데 걸리는 초(c = 1)
export const HEAT_AT = 30;        // 이 초가 지나면 불이 세진다
export const HOT_COOK = 2.4;      // 불이 센 뒤 한 면 굽는 초
export const MIN_TAP = 0.5;       // 이보다 덜 익으면 눌러도 안 넘어간다
export const READY = 0.85;        // 여기부터 민트(알맞음)
export const PERFECT_HI = 1.25;   // 여기부터 주황(조금 탐)
export const BURN = 1.9;          // 여기서 탄다
export const BURN_COST = 500;     // 빵이 타면 빠지는 재료비
export const FILLINGS = ["팥", "슈크림"];
export const PRICE = 1000;
export const TIP = 300;           // 두 면 다 알맞게 구운 빵 하나당
export const FAST_BONUS = 500;    // 손님이 오래 기다리지 않았을 때
export const TRAY_MAX = 8;
export const MAX_CUSTOMERS = 3;
export const HEARTS = 3;          // 놓쳐도 되는 손님 수
export const VIP_FROM = 15;       // 이 초부터 VIP 손님이 온다
export const VIP_CHANCE = 0.2;
export const VIP_PATIENCE = 0.6;  // VIP 가 기다리는 시간(보통 손님 대비)
export const VIP_PAY = 2;         // VIP 결제 배수
export const BIG_ORDER_AT = 40;   // 이 초부터 4개까지 주문
export const COMBO_1 = 5;         // 잘 구운 빵 연속 이만큼이면 ×1.2
export const COMBO_2 = 10;        // 이만큼이면 ×1.5
export const STAMP_WON = 5000;    // 매출 이만큼마다 스탬프 하나
export const STAMP_MAX = 5;

export const stampsFor = (money) => Math.min(STAMP_MAX, Math.floor(Math.max(0, money) / STAMP_WON));
export const comboMult = (combo) => (combo >= COMBO_2 ? 1.5 : combo >= COMBO_1 ? 1.2 : 1);
export const cookTime = (t) => (t >= HEAT_AT ? HOT_COOK : COOK);

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
    sold: 0, money: 0, perfectSold: 0, lost: 0, burnt: 0,
    hearts: HEARTS, combo: 0, bestCombo: 0, hot: false, end: null,
    events: [], rand: rng(seed),
  };
}

export const trayCount = (g, fill) => g.tray.filter((b) => b.fill === fill).length;

function newCustomer(g) {
  const r = g.rand;
  const most = g.t > BIG_ORDER_AT ? 4 : g.t > 20 ? 3 : 2;      // 처음엔 1~2개, 20초 뒤 1~3개, 40초 뒤 1~4개
  const total = 1 + Math.floor(r() * most);
  const order = { 팥: 0, 슈크림: 0 };
  for (let i = 0; i < total; i++) order[r() < 0.6 ? "팥" : "슈크림"] += 1;
  const vip = g.t >= VIP_FROM && r() < VIP_CHANCE;
  const max = (22 - Math.min(8, g.t / 6)) * (vip ? VIP_PATIENCE : 1);
  return { id: g.nextId++, order, patience: max, max, look: Math.floor(r() * 4), vip };
}

/* 시간 흐르기 */
export function step(g, dt) {
  if (g.over) return g;
  g.t += dt;
  g.left = Math.max(0, ROUND - g.t);
  if (!g.hot && g.t >= HEAT_AT) { g.hot = true; g.events.push({ type: "heat" }); }
  const per = cookTime(g.t);
  g.molds.forEach((m, i) => {
    if (m.stage !== "sideA" && m.stage !== "sideB") return;
    m.c += dt / per;
    if (m.c >= BURN) {
      m.stage = "burnt"; g.burnt += 1; g.combo = 0;
      g.money = Math.max(0, g.money - BURN_COST);
      g.events.push({ type: "burn", i, cost: BURN_COST });
    }
  });
  for (let j = g.customers.length - 1; j >= 0; j--) {
    const cu = g.customers[j];
    cu.patience -= dt;
    if (cu.patience <= 0) {
      g.customers.splice(j, 1); g.lost += 1; g.combo = 0; g.hearts -= 1;
      g.events.push({ type: "leave", id: cu.id, hearts: g.hearts });
      if (g.hearts <= 0) { g.over = true; g.end = "hearts"; g.events.push({ type: "over", end: "hearts" }); return g; }
    }
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
  if (g.left <= 0) { g.over = true; g.end = "time"; g.events.push({ type: "over", end: "time" }); }
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
  g.combo = perfect === n ? g.combo + n : 0;               // 한 개라도 덜 구운 빵이 섞이면 연속이 끊긴다
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  const mult = comboMult(g.combo) * (cu.vip ? VIP_PAY : 1);
  const pay = Math.round((n * PRICE + perfect * TIP + (fast ? FAST_BONUS : 0)) * mult / 10) * 10;
  g.customers.splice(j, 1);
  g.sold += n; g.perfectSold += perfect; g.money += pay;
  const ev = { type: "serve", id, n, perfect, fast, pay, combo: g.combo, vip: !!cu.vip };
  g.events.push(ev);
  return ev;
}

export function takeEvents(g) { const e = g.events; g.events = []; return e; }
