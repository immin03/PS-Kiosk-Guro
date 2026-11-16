/* 지점 고르기 — 실제 목록은 src/stores/<지점>/promotions.js(자동 생성, scripts/sync-racks.mjs) */
import { PROMOTIONS as G } from "./stores/guro/promotions.js";
import { PROMOTIONS as H } from "./stores/hanam/promotions.js";
import { STORE } from "./store.js";

export const PROMOTIONS = STORE === "hanam" ? H : G;
