import { test } from "node:test";
import assert from "node:assert/strict";
import { cutTile, grow, stampsFor, speedFor, spawnSide, floorPoints, earnsShield, FULL, STAMP_MAX } from "../src/pamitop/cut.js";

const base = { cx: 0, cz: 0, sx: FULL, sz: FULL };

test("cutTile: 거의 맞으면 퍼펙트, 크기 그대로", () => {
  const r = cutTile(base, { cx: 3, cz: 0 });
  assert.equal(r.perfect, true);
  assert.deepEqual(r.placed, base);
  assert.equal(r.piece, null);
});

test("cutTile: x 로 20 어긋나면 80 남고 20 잘림", () => {
  const r = cutTile(base, { cx: 20, cz: 0 });
  assert.equal(r.perfect, false);
  assert.deepEqual(r.placed, { cx: 10, cz: 0, sx: 80, sz: 100 });
  assert.deepEqual(r.piece, { cx: 60, cz: 0, sx: 20, sz: 100 });
});

test("cutTile: z 로 반대쪽 30 어긋나면 잘린 조각은 음수 쪽", () => {
  const r = cutTile(base, { cx: 0, cz: -30 });
  assert.deepEqual(r.placed, { cx: 0, cz: -15, sx: 100, sz: 70 });
  assert.deepEqual(r.piece, { cx: 0, cz: -65, sx: 100, sz: 30 });
});

test("cutTile: 완전히 빗나가면 실패", () => {
  assert.equal(cutTile(base, { cx: 100, cz: 0 }).miss, true);
  assert.equal(cutTile({ cx: 0, cz: 0, sx: 40, sz: 40 }, { cx: 0, cz: 45 }).miss, true);
});

test("grow: 퍼펙트 3번째부터 넓어지고 원래 크기를 넘지 않음", () => {
  const t = { cx: 0, cz: 0, sx: 50, sz: 98 };
  assert.deepEqual(grow(t, 2), t);
  assert.deepEqual(grow(t, 3), { cx: 0, cz: 0, sx: 54, sz: FULL });
});

test("stampsFor: 5층마다 하나, 최대 5", () => {
  assert.equal(stampsFor(0), 0);
  assert.equal(stampsFor(4), 0);
  assert.equal(stampsFor(5), 1);
  assert.equal(stampsFor(24), 4);
  assert.equal(stampsFor(80), STAMP_MAX);
});

test("speedFor: 오를수록 빨라지고 상한이 있음", () => {
  assert.ok(speedFor(10) > speedFor(1));
  assert.equal(speedFor(500), 260);
});

import { towerHead, clipRect, area } from "../src/pamitop/pamiShape.js";
test("파미 칼선 — 첫 층 안에 들어오고, 반을 자르면 넓이도 줄어든다", () => {
  const head = towerHead(Math.PI * 0.75);
  assert.ok(head.every(([x, z]) => Math.abs(x) <= 52 && Math.abs(z) <= 52));
  const full = area(clipRect(head, -50, 50, -50, 50));
  const half = area(clipRect(head, 0, 50, -50, 50));
  assert.ok(full > 4000 && half > full * 0.3 && half < full * 0.7);
  assert.equal(clipRect(head, 60, 90, -50, 50).length, 0);
});

test("속도 — 10층마다 한 단계, 260 에서 멈춤", () => {
  assert.equal(speedFor(0), 140); assert.equal(speedFor(9), 140);
  assert.equal(speedFor(10), 170); assert.equal(speedFor(25), 200);
  assert.equal(speedFor(200), 260);
});

test("나오는 쪽 — 20층 전엔 한쪽, 그 뒤엔 무작위", () => {
  assert.equal(spawnSide(5, 0.1), -1); assert.equal(spawnSide(19, 0.1), -1);
  assert.equal(spawnSide(20, 0.1), 1); assert.equal(spawnSide(20, 0.9), -1);
});

test("점수 — 층 1점 + 퍼펙트 연속 보너스(최대 5)", () => {
  assert.equal(floorPoints(false, 0), 1);
  assert.equal(floorPoints(true, 1), 2);
  assert.equal(floorPoints(true, 9), 6);
});

test("실드 — 퍼펙트 5연속마다, 이미 있으면 안 쌓임", () => {
  assert.equal(earnsShield(4, false), false);
  assert.equal(earnsShield(5, false), true);
  assert.equal(earnsShield(5, true), false);
  assert.equal(earnsShield(10, false), true);
});
