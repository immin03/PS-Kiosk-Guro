import { useEffect, useState } from "react";
import { BRAND } from "./theme.js";

/* 홈페이지를 키오스크 안에 띄운다(2026-11-19 사용자 「홈페이지 들어가면 홈으로 갈 길이 없어, 하단 홈 고정」).
 * 예전엔 매장 기기 브라우저가 홈페이지로 통째로 넘어가 돌아올 단추가 없었다. 이제 머리줄 · 아래 탭이 그대로 남는다 */
const TOP_BAR = 56, BOTTOM_NAV = 49;
const usableHeight = () => {
  const z = parseFloat(document.documentElement.style.zoom) || 1;
  return Math.max(320, Math.floor(window.innerHeight / z) - TOP_BAR - BOTTOM_NAV);
};

export default function SiteFrame({ src, title }) {
  const [h, setH] = useState(usableHeight);
  useEffect(() => {
    const fit = () => setH(usableHeight());
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div style={{ height: h, background: BRAND.bg }}>
      <iframe src={src} title={title} allow="camera; fullscreen; clipboard-write" style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
    </div>
  );
}
