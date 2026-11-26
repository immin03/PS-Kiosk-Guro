/* docs/arcade-rules.md 의 「숫자」 표가 코드 상수와 같은지 — 문서만 고치거나 코드만 고치면 실패 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as tycoon from "../src/pamibread/tycoon.js";
import * as cut from "../src/pamitop/cut.js";

const doc = readFileSync(new URL("../docs/arcade-rules.md", import.meta.url), "utf8");

/* 「## 게임」 구간 안의 「### 숫자」 표에서 `상수` | 값 줄을 읽는다 */
function numbers(game) {
  const start = doc.indexOf(`## ${game}\n`);
  assert.ok(start >= 0, `${game} 구간 없음`);
  const rest = doc.slice(start + 1);
  const end = rest.search(/\n## /);
  const part = end < 0 ? rest : rest.slice(0, end);
  const table = part.slice(part.indexOf("### 숫자"));
  const rows = {};
  for (const m of table.matchAll(/^\| `([A-Z_]+)` \| ([\d.]+) \|/gm)) rows[m[1]] = Number(m[2]);
  return rows;
}

for (const [game, mod] of [["파미빵 타이쿤", tycoon], ["파미탑", cut]]) {
  test(`문서 숫자 = 코드 상수: ${game}`, () => {
    const rows = numbers(game);
    assert.ok(Object.keys(rows).length > 0, "숫자 표가 비었음");
    for (const [k, v] of Object.entries(rows)) assert.equal(mod[k], v, `${k}: 문서 ${v}, 코드 ${mod[k]}`);
    const numeric = Object.entries(mod).filter(([k, v]) => /^[A-Z_]+$/.test(k) && typeof v === "number").map(([k]) => k);
    for (const k of numeric) assert.ok(k in rows, `${k} 가 문서 숫자 표에 없음`);
  });
}

test("문서 속도 식 = speedFor", () => {
  assert.match(doc, /min\(260, 140 \+ 30 × floor\(index ÷ 10\)\)/);
  for (const i of [0, 9, 10, 40, 100]) assert.equal(cut.speedFor(i), Math.min(260, 140 + 30 * Math.floor(i / 10)));
});
