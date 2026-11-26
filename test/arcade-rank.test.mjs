import { test } from "node:test";
import assert from "node:assert/strict";
import { serverOn, claimUrl, postScore, fetchRank, scoreText } from "../src/arcade/rank.js";

const loc = (href) => { const u = new URL(href); return { hostname: u.hostname, search: u.search }; };

test("운영 주소에서만 서버에 쓴다(?srv=1 은 예외)", () => {
  assert.equal(serverOn(loc("https://kiosk.phamasquare.com/guro")), true);
  assert.equal(serverOn(loc("http://127.0.0.1:5183/")), false);
  assert.equal(serverOn(loc("http://127.0.0.1:5183/?srv=1")), true);
  assert.equal(serverOn(loc("https://phamasquare.com.evil.io/")), false);
});

test("저장 QR 은 회사 도메인 월드 페이지로", () => {
  assert.equal(claimUrl("guro", "AB23CD45"), "https://guide.phamasquare.com/world/guro?claim=AB23CD45");
});

test("점수 올리기 — 0점은 안 보내고, 개발에선 가짜 코드, 운영에선 world_game_post", async () => {
  let calls = [];
  const fetchFn = async (url, o) => { calls.push({ url, body: JSON.parse(o.body) }); return { ok: true, json: async () => ({ code: "ZZ23ZZ45" }) }; };
  assert.equal(await postScore("guro", "tycoon", 0, {}, { fetchFn, on: true }), null);
  assert.equal((await postScore("guro", "tycoon", 1000, {}, { fetchFn, on: false })).dev, true);
  assert.equal(calls.length, 0);
  const r = await postScore("guro", "pamitop", 12.4, { floors: 9 }, { fetchFn, on: true });
  assert.equal(r.code, "ZZ23ZZ45");
  assert.match(calls[0].url, /rpc\/world_game_post$/);
  assert.deepEqual(calls[0].body, { p_store: "guro", p_game: "pamitop", p_score: 12, p_detail: { floors: 9 } });
});

test("순위표 — 못 읽으면 null, 비면 []", async () => {
  assert.equal(await fetchRank("guro", "tycoon", { fetchFn: async () => ({ ok: false, status: 500 }) }), null);
  assert.deepEqual(await fetchRank("guro", "tycoon", { fetchFn: async () => ({ ok: true, json: async () => ({ top: [] }) }) }), []);
  const top = [{ nick: "파미", score: 23000, member: true }];
  assert.deepEqual(await fetchRank("guro", "tycoon", { fetchFn: async () => ({ ok: true, json: async () => ({ top }) }) }), top);
});

test("점수 표기", () => {
  assert.equal(scoreText("tycoon", 23000), "23,000원");
  assert.equal(scoreText("pamitop", 41), "41점");
});
