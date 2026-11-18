import assert from "node:assert/strict";
import test from "node:test";

import { createUsage, visitMode, screenOf, USAGE_IDLE_MS } from "../src/usage.js";

/* 시계 · 저장소 · 보내기를 가짜로 — 손님 구분 · 화면 · 구좌 · 보내기만 본다 */
function rig({ status = 200, src = "" } = {}) {
  let t = Date.parse("2026-11-17T03:00:00Z");
  const mem = {}, sent = [];
  const u = createUsage({
    src,
    now: () => t,
    storage: { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; } },
    fetchFn: (url, opt) => { sent.push({ url, body: JSON.parse(opt.body) }); return Promise.resolve({ ok: status < 300, status }); },
  });
  return { u, sent, mem, step: (ms) => { t += ms; } };
}
const kinds = (u) => u.state.q.map((e) => `${e.kind}:${e.screen}/${e.page}${e.target ? "(" + e.target + ")" : ""}${e.value != null ? "=" + e.value : ""}`);

test("손이 닿기 전 화면 전환(유휴 초기화 · 첫 화면)은 세지 않습니다", () => {
  const { u } = rig();
  u.view("home"); u.view("map"); u.view("home");
  assert.equal(u.state.q.length, 0);
  u.touch();
  assert.deepEqual(kinds(u), ["view:kiosk/home(touch)"]);
});

test("탭을 옮기면 앞 탭에 머문 초, 지도 탭 · 상품 위치는 매장 지도 화면", () => {
  const { u, step } = rig();
  u.view("home"); u.touch(); step(12_000);
  u.touch(); u.view("map"); step(3_000);
  u.touch(); u.view("location", "비타민C 1000");
  assert.deepEqual(kinds(u), [
    "view:kiosk/home(touch)", "leave:kiosk/home=12", "view:store-map/map(nav)",
    "leave:store-map/map=3", "view:store-map/location(nav)", "pick:store-map/location(비타민C 1000)"]);
  assert.equal(screenOf("catDetail"), "kiosk");
});

test("같은 화면에서 다른 카테고리를 열면 pick 만 더합니다", () => {
  const { u } = rig();
  u.view("home"); u.touch();
  u.view("catDetail", "비타민"); u.view("catDetail", "오메가3"); u.view("catDetail", "오메가3");
  assert.deepEqual(kinds(u).slice(-3), ["view:kiosk/catDetail(nav)", "pick:kiosk/catDetail(비타민)", "pick:kiosk/catDetail(오메가3)"]);
});

test("90초 동안 아무도 안 만지면 손님이 바뀝니다", () => {
  const { u, step } = rig();
  u.view("home"); u.touch(); step(20_000); u.touch(); u.view("location", "비타민C 1000");
  const first = u.state.sid;
  step(USAGE_IDLE_MS + 5_000);
  u.tick();
  assert.equal(u.state.sid, "");
  assert.deepEqual(kinds(u).slice(-2), ["leave:store-map/location=0", "end:store-map/location=20"]);
  u.view("home");
  u.touch();
  assert.notEqual(u.state.sid, first);
  assert.deepEqual(kinds(u).at(-1), "view:kiosk/home(touch)");
});

test("QR(?src)로 열면 터치 전이라도 한 명, 그 손님 기록 모두에 구좌", () => {
  const { u, step } = rig({ src: "PD-DID65-SLD-V1" });
  u.view("home"); u.arrive();
  u.view("search"); u.search(" 오메가 3 ", 0);
  assert.deepEqual(kinds(u).slice(0, 1), ["view:kiosk/home(scan)"]);
  assert.ok(u.state.q.every((e) => e.src === "PD-DID65-SLD-V1"));
  step(USAGE_IDLE_MS + 1); u.tick(); u.touch();
  assert.equal(u.state.q.at(-1).src, undefined, "떠난 뒤 다음 손님에겐 구좌가 없다");
  const s = u.state.q.find((e) => e.kind === "search");
  assert.deepEqual([s.target, s.value], ["오메가 3", 0]);
});

test("꼴이 아닌 구좌 값은 버립니다", () => {
  assert.equal(rig({ src: "<script>" }).u.state.src, "");
  assert.equal(visitMode({ search: "?src=pd-did65-kv-v1.2" }).src, "PD-DID65-KV-V1.2");
  assert.equal(visitMode({ search: "?src=a" }).src, "");
});

test("직원 기기 · PS-OS 미리보기는 세지 않고, 개발 서버는 모으기만", () => {
  const mem = {};
  const storage = { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };
  assert.equal(visitMode({ search: "?staff=1", hostname: "kiosk.phamasquare.com", storage }).counted, false);
  assert.equal(visitMode({ search: "", hostname: "kiosk.phamasquare.com", storage }).counted, false, "한 번 열면 남는다");
  assert.equal(visitMode({ search: "?staff=0", hostname: "kiosk.phamasquare.com", storage }).counted, true);
  assert.equal(visitMode({ hostname: "kiosk.phamasquare.com", inFrame: true, referrer: "https://ps-os.vercel.app/" }).counted, false);
  assert.equal(visitMode({ hostname: "kiosk.phamasquare.com", inFrame: true, referrer: "https://os.phamasquare.com/" }).counted, false, "PS-OS 새 주소 미리보기");
  assert.equal(visitMode({ hostname: "kiosk.phamasquare.com", cookie: "a=1; ps_staff=1" }).counted, false, "PS-OS 에 로그인한 기기");
  assert.equal(visitMode({ hostname: "kiosk.phamasquare.com", cookie: "ps_staff=1", search: "?staff=0" }).counted, true, "?staff=0 은 센다");
  assert.equal(visitMode({ hostname: "kiosk.phamasquare.com", cookie: "x_ps_staff=1" }).counted, true);
  assert.equal(visitMode({ hostname: "kiosk.phamasquare.com", inFrame: true, referrer: "https://kiosk.phamasquare.com/", ancestors: ["https://kiosk.phamasquare.com", "https://os.phamasquare.com"] }).counted, false, "겹 미리보기");
  assert.equal(visitMode({ hostname: "kiosk.phamasquare.com", inFrame: true, referrer: "https://phamasquare.com/", ancestors: ["https://phamasquare.com"] }).counted, true, "홈페이지 안에 뜬 것은 센다");
  const dev = visitMode({ hostname: "localhost" });
  assert.deepEqual([dev.counted, dev.send], [true, false]);
  assert.equal(visitMode({ hostname: "localhost", search: "?usage=on" }).send, true);
  assert.equal(visitMode({ hostname: "kiosk.phamasquare.com" }).send, true);
});

test("보내면 큐에서 빼고, 실패하면 남겨 둡니다", async () => {
  const ok = rig();
  ok.u.view("home"); ok.u.touch(); ok.u.view("map");
  assert.equal(await ok.u.flush(), 3);
  assert.equal(ok.u.state.q.length, 0);
  assert.equal(ok.sent[0].body.p_store, "guro");
  assert.match(ok.sent[0].url, /rpc\/psos_usage_screen$/);

  const down = rig({ status: 503 });
  down.u.touch();
  await down.u.flush();
  assert.equal(down.u.state.q.length, 1);
  assert.ok(down.mem.ps_usage_q.includes("view"));
});

test("함수가 없으면(404) 버리고 30분 쉽니다", async () => {
  const { u, sent, step } = rig({ status: 404 });
  u.touch();
  await u.flush();
  u.view("map");
  await u.flush();
  assert.equal(sent.length, 1);
  step(1_800_001);
  await u.flush();
  assert.equal(sent.length, 2);
});
