import { test } from "node:test";
import assert from "node:assert/strict";
import { typeKey, backKey } from "../src/hangul.js";

const type = (jamo) => [...jamo].reduce((t, k) => typeKey(t, k), "");

test("한글 자모를 글자로 조합한다", () => {
  assert.equal(type("ㅇㅏㄴㄴㅕㅇ"), "안녕");
  assert.equal(type("ㅎㅏㄴㄱㅡㄹ"), "한글");
  assert.equal(type("ㅂㅣㅌㅏㅁㅣㄴ"), "비타민");
  assert.equal(type("ㅇㅗㅏ"), "와");
});

test("겹받침 · 받침이 다음 글자 첫소리로 넘어간다", () => {
  assert.equal(type("ㄷㅏㄹㄱㅇㅣ"), "닭이");
  assert.equal(type("ㄱㅓㄴㄱㅏㅇㅂㅏㄴㅏㅇ"), "건강바낭");
  assert.equal(type("ㅂㅏㅂㅅㅣ"), "밥시");
});

test("백스페이스는 받침 → 모음 → 첫소리 순으로 지운다", () => {
  assert.equal(backKey("값"), "갑");
  assert.equal(backKey("가"), "ㄱ");
  assert.equal(backKey("ㄱ"), "");
  assert.equal(backKey("와"), "오");
});

test("영문 · 숫자는 그대로 붙는다", () => {
  assert.equal(typeKey("C", "1"), "C1");
});
