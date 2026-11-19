import { useEffect, useState } from "react";
import { liveSlides, loadFeed, slideUrl, kstToday } from "./PromoBanner.jsx";
import { STORE_PHOTOS } from "./storePhoto.js";
import { BRAND } from "./theme.js";
import { PAD } from "./ui.jsx";

/* 진행 중 이벤트 목록(2026-11-19 사용자 「메인 커버 슬라이드를 리스트 뷰로」).
 * 키오스크 안의 한 페이지(page "events") — 머리줄 · 뒤로 가기 · 아래 탭은 다른 화면과 같다(App.jsx).
 * 홈 배너와 같은 목록(liveSlides — 프칼 확정 건 중 오늘 기간 안, 없으면 상시 건)을 위에서 아래로 카드로.
 * 카드 = 커버(16:9) · 제목 · 설명(kioskDesc) · 기간. 누르면 배너를 누를 때와 같은 상세 장표 화면(promo)으로 */

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function day(s, withYear) {
  const [y, m, d] = s.split("-").map(Number);
  const w = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return (withYear ? y + "." : "") + String(m).padStart(2, "0") + "." + String(d).padStart(2, "0") + "(" + w + ")";
}
export function eventPeriod(p) {
  if (!p.from) return "";
  if (!p.to) return day(p.from, true) + " ~";
  return day(p.from, true) + " ~ " + day(p.to, p.to.slice(0, 4) !== p.from.slice(0, 4));
}

export default function EventsList({ onOpen, emptyText }) {
  const [feed, setFeed] = useState(null);
  useEffect(() => { let on = true; loadFeed().then((f) => { if (on) setFeed(f); }); return () => { on = false; }; }, []);
  /* 최신순 — 늦게 시작한 행사가 위(2026-11-19 사용자). 홈 배너 순서는 그대로 둔다 */
  const items = liveSlides(feed, kstToday()).slice().sort((a, b) => String(b.from || "").localeCompare(String(a.from || "")));

  return (
    <div style={{ padding: `16px ${PAD}px 40px`, wordBreak: "keep-all" }}>
      {!items.length && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: BRAND.ink }}>{emptyText}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        {items.map((p, k) => {
          const cover = (p.image && slideUrl(p.image)) || STORE_PHOTOS[k % STORE_PHOTOS.length];
          const canOpen = !!(onOpen && p.images && p.images.length);
          return (
            <button key={p.id} type="button" onClick={canOpen ? () => onOpen(p) : undefined}
              style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", textAlign: "left", font: "inherit", color: BRAND.ink, cursor: canOpen ? "pointer" : "default" }}>
              <div style={{ aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", background: BRAND.line }}>
                <img src={cover} alt="" loading={k ? "lazy" : "eager"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <span style={{ display: "block", marginTop: 16, fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>{p.title}</span>
              {(p.desc || p.sub) && <span style={{ display: "block", marginTop: 8, fontSize: 15, lineHeight: 1.6 }}>{p.desc || p.sub}</span>}
              {eventPeriod(p) && <span style={{ display: "block", marginTop: 8, fontSize: 14, color: BRAND.gray }}>{eventPeriod(p)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
