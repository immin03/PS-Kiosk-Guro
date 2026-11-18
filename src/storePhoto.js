/* 프로모션 슬라이드 기본 배경 — 실제 매장 사진, 지점마다(2026-11-17).
 * 정본에 슬라이드 이미지(running[].image)가 없는 프로모션에 깔립니다.
 *   구로: 매장 DID 사진
 *   하남: 매장 통로 사진(PS-OS catalog/deck/img/p32-hanam-aisle.jpg 의 1600px 웹 사본) — 사용자 「메인 슬라이드 배경 하남점 매장 스냅을 디폴트」
 */
import guro from "./promo/store-did.jpg?url";
import guro05 from "./promo/store-05.jpg?url";
import guroC from "./promo/store-c.jpg?url";
import guroFloor from "./promo/store-floor.jpg?url";
import guroExt from "./promo/store-exterior.jpg?url";
import hanam from "./promo/store-hanam.webp?url";
import { STORE } from "./store.js";

export const STORE_PHOTO = STORE === "hanam" ? hanam : guro;
/* 슬라이드마다 다른 사진(2026-11-19 사용자 「구로 이미지 중복 안 되게」) — 이미지 없는 프로모션은 순서대로 돌려 깐다.
 * 구로: DID · 매장 전경(2층에서) · 매대 · 선반 · 외관. 하남은 아직 한 장 */
export const STORE_PHOTOS = STORE === "hanam" ? [hanam] : [guro, guro05, guroC, guroFloor, guroExt];
