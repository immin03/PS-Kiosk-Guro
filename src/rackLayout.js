/* 지점 고르기 — 실제 배치는 src/stores/<지점>/rackLayout.js(자동 생성, scripts/sync-racks.mjs). 이 파일은 고르기만 한다 */
import * as G from "./stores/guro/rackLayout.js";
import * as H from "./stores/hanam/rackLayout.js";
import { STORE } from "./store.js";

const S = STORE === "hanam" ? H : G;
export const STORE_ID = S.STORE_ID, STORE_NAME = S.STORE_NAME, GRID = S.GRID, OUTLINE = S.OUTLINE, SCALE = S.SCALE, MARKS = S.MARKS,
  RACKS = S.RACKS, RACK_BY_CODE = S.RACK_BY_CODE, RACK_CAT = S.RACK_CAT, RACK_ZONE = S.RACK_ZONE, CAT_SIGN = S.CAT_SIGN;
