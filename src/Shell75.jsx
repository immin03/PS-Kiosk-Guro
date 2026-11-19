import { useRef } from "react";
import PromoBanner from "./PromoBanner.jsx";
import { BRAND } from "./theme.js";
import { resolveBaseRelativeUrl } from "./baseRelativeUrl.js";

/* 75" 입구 DID 판(2026-11-19 사용자 「75인치는 손님이 직접 누를 수 있게 43 · 50인치 크기로 화면을 줄이고, 배경을 우리 이미지 · 영상으로」).
 * 75" 세로 화면(유효 930 × 1652mm)을 키오스크로 가득 채우면 위쪽은 손이 안 닿는다.
 * 그래서 아래쪽에 50" 만한 판(가로 623 / 930 ≈ 67%)으로 키오스크를 띄우고, 위는 진행 중 행사 장표(영상 포함)와 로고로 꾸민다.
 * 키오스크는 같은 주소에 &inner=1 을 붙여 판 안에 연다 — 방문 기록 · 기기 코드(?did)는 안쪽 키오스크가 그대로 센다.
 * 바깥 판은 방문 기록을 쌓지 않는다(App 을 띄우지 않음) */
const LOGO = resolveBaseRelativeUrl(import.meta.env.BASE_URL, "assets/logo-wordmark.png");
/* 판 크기 — 75" 의 62% ≈ 46"(43 ~ 50" 사이). 세로 9:16 화면이라 가로 · 세로 같은 비율로 줄이면 판도 9:16 */
export const SHELL_FRAME_W = 0.62;

export default function Shell75() {
  const u = new URL(window.location.href);
  u.searchParams.set("inner", "1");
  const frame = useRef(null);
  /* 위 장표를 누르면 판 안 키오스크가 진행 중 이벤트로 — 안쪽 홈에는 같은 배너를 두지 않는다(App: inner) */
  const openEvents = () => { const e = new URL(u); e.searchParams.set("view", "events"); if (frame.current) frame.current.src = e.toString(); };
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: BRAND.wash, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "80vw", paddingTop: "4vh", flexShrink: 0 }}>
        <img src={LOGO} alt="PHAMA SQUARE" style={{ height: "1.3vh", display: "block", margin: "0 auto 2.5vh" }} />
        {/* 배너 아래 20px 여백(홈 화면용)은 판에서 걷는다 */}
        <div style={{ aspectRatio: "16 / 9", borderRadius: "2.4vw", overflow: "hidden", boxShadow: "0 1.2vh 3vh rgba(16,24,30,.12)" }}>
          <PromoBanner interval={6000} onPress={openEvents} />
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ width: `${SHELL_FRAME_W * 100}vw`, height: `${SHELL_FRAME_W * 100}vh`, marginBottom: "3vh", flexShrink: 0, borderRadius: "2.6vw", overflow: "hidden",
        background: "#FFFFFF", boxShadow: "0 0 0 1px rgba(16,24,30,.06), 0 2vh 5vh rgba(16,24,30,.16)" }}>
        <iframe ref={frame} src={u.toString()} title="파마스퀘어 키오스크" allow="clipboard-write" style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
      </div>
    </div>
  );
}
