/**
 * 프로모션 상세 페이지 값 — PS-OS tools/promo-page.mjs 를 그대로 불러 쓴다(2026-11-27).
 * 웹 프로모션 페이지(PS-OS tools/build-promo-pages.mjs)와 같은 파일 하나 — 고치는 곳은 PS-OS 쪽 하나.
 * PS-OS 위치는 sync-racks 와 같이 PS_OS_RACKS(…/ps-os/catalog/racks.json)로 바꿀 수 있다.
 */
import { existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";

const RACKS = process.env.PS_OS_RACKS || resolve(os.homedir(), "Projects", "ps-os", "catalog", "racks.json");
const MOD = resolve(dirname(RACKS), "..", "tools", "promo-page.mjs");
/* 본 폴더가 다른 가지에 있어 파일이 아직 없으면, 그 저장소의 origin/main 판을 꺼내 쓴다(폴더는 건드리지 않음) */
let file = MOD;
if (!existsSync(file)) {
  try {
    const src = execFileSync("git", ["-C", dirname(MOD), "show", "origin/main:tools/promo-page.mjs"], { encoding: "utf8" });
    file = resolve(os.tmpdir(), "psos-promo-page.mjs");
    writeFileSync(file, src);
  } catch (e) {
    console.error(`PS-OS 상세 페이지 모듈이 없습니다: ${MOD} — PS-OS 를 최신으로 받거나 PS_OS_RACKS 로 위치를 알려 주세요.`);
    process.exit(1);
  }
}
const m = await import(pathToFileURL(file).href);
export const { loadLedgers, buildPage, makeCopier } = m;
