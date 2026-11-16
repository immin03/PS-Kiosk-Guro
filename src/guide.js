import { STORE } from "./store.js";
/* AI 건강 가이드(PS-AI-Guide) — 키오스크 안에서 띄웁니다.
 *
 * 설문 · 결과 · 쿠폰 · 백과사전은 가이드 쪽 서버(Netlify Functions)와 함께 돌아서
 * 그대로 옮겨 오지 않고, 가이드 화면을 키오스크 안에 엽니다. 가이드는 ?kiosk= 로
 * 받은 주소를 기억해 두었다가 「매장에서 위치 찾기」 를 키오스크 길 안내로 넘깁니다.
 *
 * 주소를 바꾸려면 빌드할 때 VITE_GUIDE_URL 을 줍니다.
 */
export const GUIDE_BASE = (import.meta.env.VITE_GUIDE_URL || "https://ps-aihealthguide.netlify.app").replace(/\/$/, "");

/* 고민 칩 — 가이드 「주제로 빠르게 보기」(explore.html?topic=) 의 주제 id 입니다.
   가이드 js/wellness-content.js 에 있는 주제만 씁니다. */
export const CONCERNS = [
  { id: "fatigue", key: "concern.fatigue" },
  { id: "sleep_stress", key: "concern.sleep" },
  { id: "probiotics", key: "concern.gut" },
  { id: "immunity", key: "concern.immunity" },
  { id: "joint", key: "concern.joint" },
  { id: "liver_hangover", key: "concern.hangover" },
];

export const GUIDE_PAGES = {
  survey: "survey.html",
  dict: "encyclopedia.html",
  topic: (id) => `explore.html?topic=${encodeURIComponent(id)}`,
};

export function guideUrl(path, lang) {
  const url = new URL(`${GUIDE_BASE}/${path}`);
  url.searchParams.set("lang", lang);
  /* 돌아올 곳 — 이 키오스크 주소. 가이드가 여기에 ?locate= 를 붙여 부릅니다. */
  /* 지점(?store=)까지 실어 돌아왔을 때 같은 지점으로 열리게(2026-11-17 하남) */
  const back = new URL(window.location.origin + window.location.pathname);
  if (STORE !== "guro") back.searchParams.set("store", STORE);
  url.searchParams.set("kiosk", back.toString());
  return url.toString();
}
