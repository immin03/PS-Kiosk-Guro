/* 프로모션 슬라이드 기본 배경 — 실제 매장 사진.
 * 정본에 슬라이드 이미지(running[].image)가 없는 프로모션에 깔립니다.
 * 예전에는 인테리어 업체 투시도를 base64 로 박아 두었는데, 완공 전 그림이라
 * 매장과 달랐습니다. 촬영본으로 바꿨습니다.
 */
import fallback from "./promo/store-did.jpg?url";

export const STORE_PHOTO = fallback;
