import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame, step, tapMold, serve, setFilling, takeEvents, stampsFor, grade, trayCount,
  COOK, READY, BURN, MIN_TAP, ROUND, TRAY_MAX, PRICE, TIP, FAST_BONUS,
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

test("스탬프 — 3개마다 하나, 최대 5", () => {
  assert.equal(stampsFor(2), 0);
  assert.equal(stampsFor(3), 1);
  assert.equal(stampsFor(14), 4);
  assert.equal(stampsFor(40), 5);
});
