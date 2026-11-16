/* 지점 고르기 — 실제 개수는 src/stores/<지점>/catalogStats.js(자동 생성, scripts/publish-catalog.mjs) */
import * as G from "./stores/guro/catalogStats.js";
import * as H from "./stores/hanam/catalogStats.js";
import { STORE } from "./store.js";

const S = STORE === "hanam" ? H : G;
export const COUNT_BY_RACK = S.COUNT_BY_RACK, COUNT_BY_BRAND = S.COUNT_BY_BRAND, STOCKED_BRANDS = S.STOCKED_BRANDS,
  PRODUCT_TOTAL = S.PRODUCT_TOTAL, BRAND_TOTAL = S.BRAND_TOTAL;
