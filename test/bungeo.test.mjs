import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/bungeo/gameLogic.js";
import { rewardFor, REWARD_TIERS } from "../src/bungeo/rewards.js";

test("judge: 익는 구간별 품질", () => {
  assert.equal(G.judge(0.5), "raw");
  assert.equal(G.judge(0.7), "ok");
  assert.equal(G.judge(0.9), "perfect");
  assert.equal(G.judge(1.2), "ok");
  assert.equal(G.judge(1.5), "burnt");
});

test("tapCavity: 붓기 → 설익음은 무시 → 알맞게 꺼내면 바구니에", () => {
  let s = G.createGame(1, 0);
  s = G.tapCavity(s, 0, 0);
  assert.ok(s.cavities[0]);
  assert.equal(G.tapCavity(s, 0, 1000), s, "설익은 때 누르면 그대로");
  s = G.tapCavity(s, 0, 2700); // p = 0.675 -> ok
  assert.deepEqual(s.basket, [{ q: "ok" }]);
  assert.equal(s.cavities[0], null);
});

test("tapCavity: 탄 빵은 버리고 탄 수에 기록", () => {
  let s = G.tapCavity(G.createGame(1, 0), 2, 0);
  s = G.tapCavity(s, 2, 6000); // p = 1.5
  assert.equal(s.burnt, 1);
  assert.equal(s.basket.length, 0);
  assert.equal(s.cavities[2], null);
});

test("tapCavity: 바구니가 차면 틀에 그대로 둔다", () => {
  let s = G.createGame(1, 0);
  s.basket = Array.from({ length: G.BASKET_MAX }, () => ({ q: "perfect" }));
  s = G.tapCavity(s, 0, 0);
  const after = G.tapCavity(s, 0, 3500);
  assert.equal(after.basket.length, G.BASKET_MAX);
  assert.ok(after.cavities[0], "빵이 틀에 남는다");
});

test("tick: 손님 등장 · 인내심 만료 시 놓침", () => {
  let s = G.createGame(7, 0);
  s = G.tick(s, 0);
  assert.equal(s.queue.length, 1);
  const need = s.queue[0].need;
  assert.ok(need >= 1 && need <= 3);
  s = G.tick(s, G.PATIENCE_MS + 1);
  assert.equal(s.queue.some((c) => c.id === 1), false, "첫 손님은 떠남");
  assert.equal(s.lost, 1);
});

test("deliver: 주문만큼 빵이 있어야 건넨다", () => {
  let s = G.createGame(3, 0);
  s = G.tick(s, 0);
  const cu = s.queue[0];
  assert.equal(G.deliver(s, cu.id), s, "빵이 없으면 그대로");
  s.basket = Array.from({ length: cu.need }, () => ({ q: "perfect" }));
  const d = G.deliver(s, cu.id);
  assert.equal(d.served, 1);
  assert.equal(d.score, cu.need * G.POINTS.perfect + G.SERVE_BONUS);
  assert.equal(d.basket.length, 0);
  assert.equal(d.queue.length, 0);
});

test("tick: 60초가 지나면 끝나고 더 누를 수 없다", () => {
  let s = G.tick(G.createGame(5, 0), 0);
  s = G.tick(s, G.ROUND_MS);
  assert.equal(s.ended, true);
  assert.equal(G.tapCavity(s, 0, G.ROUND_MS + 1), s);
});

test("summarize: 스탬프는 손님 수, 최대 5", () => {
  const base = G.createGame(1, 0);
  assert.equal(G.summarize({ ...base, served: 3 }).stamps, 3);
  assert.equal(G.summarize({ ...base, served: 9 }).stamps, G.STAMP_MAX);
});

test("rewardFor: 보상 자리는 있고 값은 미정 표시", () => {
  assert.equal(rewardFor(0), null);
  assert.equal(rewardFor(1).label, REWARD_TIERS[0].label);
  assert.equal(rewardFor(5).label, REWARD_TIERS[2].label);
});
