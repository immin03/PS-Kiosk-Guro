import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame, step, tapMold, serve, setFilling, takeEvents, stampsFor, grade, trayCount,
  COOK, READY, BURN, MIN_TAP, ROUND, TRAY_MAX, PRICE, TIP, FAST_BONUS,
  HEARTS, HEAT_AT, HOT_COOK, BURN_COST, VIP_PAY, STAMP_WON, comboMult, cookTime,
} from "../src/pamibread/tycoon.js";

const cook = (g, c) => step(g, c * COOK);

test("반죽 → 뒤집기 → 꺼내기", () => {
  const g = createGame(3);
  setFilling(g, "슈크림");
  assert.equal(tapMold(g, 0).type, "pour");
  assert.equal(g.molds[0].fill, "슈크림");
  cook(g, 1);
  assert.equal(tapMold(g, 0).type, "flip");
  assert.equal(g.molds[0].perfectA, true);
  cook(g, 1);
  const ev = tapMold(g, 0);
  assert.equal(ev.type, "done");
  assert.equal(ev.perfect, true);
  assert.equal(g.molds[0].stage, "empty");
  assert.equal(trayCount(g, "슈크림"), 1);
});

test("덜 익으면 안 넘어가고, 오래 두면 탄다", () => {
  const g = createGame(1);
  tapMold(g, 2);
  cook(g, MIN_TAP * 0.5);
  assert.equal(tapMold(g, 2).type, "wait");
  assert.equal(g.molds[2].stage, "sideA");
  cook(g, BURN);
  assert.equal(g.molds[2].stage, "burnt");
  assert.equal(tapMold(g, 2).type, "discard");
  assert.equal(g.molds[2].stage, "empty");
});

test("조금 탄 면은 팔 수 있지만 팁이 없다", () => {
  const g = createGame(1);
  tapMold(g, 0); cook(g, 1.6); tapMold(g, 0); cook(g, 1);
  assert.equal(tapMold(g, 0).perfect, false);
});

test("등급 구간", () => {
  assert.equal(grade(READY - 0.01), "raw");
  assert.equal(grade(1), "perfect");
  assert.equal(grade(1.5), "over");
  assert.equal(grade(BURN), "burnt");
});

test("손님 — 모자라면 못 주고, 있으면 돈을 받는다", () => {
  const g = createGame(7);
  step(g, 1.01);
  const cu = g.customers[0];
  assert.ok(cu, "1초 뒤 첫 손님");
  assert.equal(serve(g, cu.id).type, "short");
  for (const f of ["팥", "슈크림"]) for (let k = 0; k < cu.order[f]; k++) g.tray.push({ fill: f, perfect: true });
  const n = cu.order.팥 + cu.order.슈크림;
  const ev = serve(g, cu.id);
  assert.equal(ev.type, "serve");
  assert.equal(ev.pay, n * PRICE + n * TIP + FAST_BONUS);
  assert.equal(g.sold, n);
  assert.equal(g.customers.length, 0);
});

test("기다리다 지치면 떠난다", () => {
  const g = createGame(5);
  step(g, 1.01);
  const id = g.customers[0].id;
  for (let k = 0; k < 30; k++) step(g, 1);
  assert.ok(!g.customers.some((c) => c.id === id));
  assert.ok(g.lost >= 1);
});

test("쟁반이 차면 꺼낼 수 없다", () => {
  const g = createGame(1);
  for (let k = 0; k < TRAY_MAX; k++) g.tray.push({ fill: "팥", perfect: false });
  tapMold(g, 0); cook(g, 1); tapMold(g, 0); cook(g, 1);
  assert.equal(tapMold(g, 0).type, "full");
});

test("60초가 지나면 끝, 끝난 뒤엔 아무것도 안 된다", () => {
  const g = createGame(1);
  for (let k = 0; k < ROUND * 2; k++) step(g, 0.5);
  assert.equal(g.over, true);
  assert.ok(takeEvents(g).some((e) => e.type === "over"));
  assert.equal(tapMold(g, 0), null);
});

test("스탬프 — 매출 5,000원마다 하나, 최대 5", () => {
  assert.equal(stampsFor(4990), 0);
  assert.equal(stampsFor(STAMP_WON), 1);
  assert.equal(stampsFor(23000), 4);
  assert.equal(stampsFor(90000), 5);
});

const fillFor = (g, cu, perfect = true) => { for (const f of ["팥", "슈크림"]) for (let k = 0; k < cu.order[f]; k++) g.tray.push({ fill: f, perfect }); };

test("하트 — 손님을 다 놓치면 60초 전에 끝난다", () => {
  const g = createGame(5);
  let k = 0;
  while (!g.over && k++ < 400) step(g, 0.25);
  assert.equal(g.end, "hearts");
  assert.equal(g.hearts, 0);
  assert.equal(g.lost, HEARTS);
  assert.ok(g.t < ROUND);
});

test("30초 뒤 불이 세진다", () => {
  assert.equal(cookTime(HEAT_AT - 0.1), COOK);
  assert.equal(cookTime(HEAT_AT), HOT_COOK);
  const g = createGame(1);
  step(g, HEAT_AT);
  assert.ok(takeEvents(g).some((e) => e.type === "heat"));
  g.customers = [];
  tapMold(g, 0); step(g, HOT_COOK);
  assert.ok(Math.abs(g.molds[0].c - 1) < 1e-9);
});

test("빵이 타면 재료비가 빠지고 연속이 끊긴다(0원 밑으로는 안 감)", () => {
  const g = createGame(1);
  g.money = 2000; g.combo = 4;
  tapMold(g, 0); cook(g, BURN + 0.01);
  assert.equal(g.money, 2000 - BURN_COST);
  assert.equal(g.combo, 0);
  g.money = 100; tapMold(g, 0); tapMold(g, 0); cook(g, BURN + 0.01);
  assert.equal(g.money, 0);
});

test("연속 보너스 — 잘 구운 빵 5개부터 ×1.2, 10개부터 ×1.5, 덜 구운 빵이 섞이면 끊김", () => {
  assert.equal(comboMult(4), 1); assert.equal(comboMult(5), 1.2); assert.equal(comboMult(10), 1.5);
  const g = createGame(7);
  step(g, 1.01);
  const cu = g.customers[0];
  cu.vip = false; g.combo = 8;
  fillFor(g, cu);
  const n = cu.order.팥 + cu.order.슈크림;
  const ev = serve(g, cu.id);
  assert.equal(ev.combo, 8 + n);
  assert.equal(ev.pay, Math.round((n * PRICE + n * TIP + FAST_BONUS) * comboMult(8 + n) / 10) * 10);
  step(g, 6);
  const cu2 = g.customers[0];
  fillFor(g, cu2, false);
  serve(g, cu2.id);
  assert.equal(g.combo, 0);
});

test("VIP 는 두 배를 내고 오래 못 기다린다", () => {
  const g = createGame(11);
  g.t = 20;
  let vip = null;
  for (let k = 0; k < 200 && !vip; k++) { g.customers = []; g.nextCustomer = 0; step(g, 0.01); vip = g.customers.find((c) => c.vip); }
  assert.ok(vip, "VIP 손님이 온다");
  assert.ok(vip.max < 22 - Math.min(8, g.t / 6));
  fillFor(g, vip);
  const n = vip.order.팥 + vip.order.슈크림;
  const ev = serve(g, vip.id);
  assert.equal(ev.vip, true);
  assert.equal(ev.pay, Math.round((n * PRICE + n * TIP + FAST_BONUS) * comboMult(n) * VIP_PAY / 10) * 10);
});

test("40초 뒤엔 4개까지 주문", () => {
  const g = createGame(3);
  g.t = 41;
  let most = 0;
  for (let k = 0; k < 300; k++) { g.customers = []; g.nextCustomer = 0; g.left = 19; step(g, 0.001); const c = g.customers[0]; if (c) most = Math.max(most, c.order.팥 + c.order.슈크림); }
  assert.equal(most, 4);
});
