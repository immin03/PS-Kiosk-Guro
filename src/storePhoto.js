/* 프로모션 슬라이드 기본 배경 — 실제 매장 사진, 지점마다(2026-11-17).
 * 정본에 슬라이드 이미지(running[].image)가 없는 프로모션에 깔립니다.
 *   구로: 매장 DID 사진
 *   하남: 매장 통로 사진(PS-OS catalog/deck/img/p32-hanam-aisle.jpg 의 1600px 웹 사본) — 사용자 「메인 슬라이드 배경 하남점 매장 스냅을 디폴트」
 */
import guro from "./promo/store-did.jpg?url";
import hanam from "./promo/store-hanam.webp?url";
import { STORE } from "./store.js";

export const STORE_PHOTO = STORE === "hanam" ? hanam : guro;
