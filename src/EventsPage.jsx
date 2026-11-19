import { useEffect, useState } from "react";
import { liveSlides, loadFeed, slideUrl, kstToday } from "./PromoBanner.jsx";
import { STORE_PHOTOS } from "./storePhoto.js";
import { STORE_CONFIG } from "./store.js";
import { BRAND } from "./theme.js";
import { resolveBaseRelativeUrl } from "./baseRelativeUrl.js";

/* 이벤트 목록 페이지(?view=events, 2026-11-19 사용자 「메인 커버 슬라이드를 리스트 뷰로」).
 * 홈 배너와 같은 목록(liveSlides — 프칼 확정 건 중 오늘 기간 안, 없으면 상시 건)을 위에서 아래로 카드로 늘어놓는다.
 * 카드 = 커버(16:9) · 제목 · 설명(kioskDesc) · 기간. 누르면 그 행사의 상세 장표(피드)를 카드 아래에 펼친다. */

const LOGO = resolveBaseRelativeUrl(import.meta.env.BASE_URL, "assets/logo-wordmark.png");
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function day(s, withYear) {
  const [y, m, d] = s.split("-").map(Number);
  const w = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return (withYear ? y + "." : "") + String(m).padStart(2, "0") + "." + String(d).padStart(2, "0") + "(" + w + ")";
}
function period(p) {
  if (!p.from) return "";
  if (!p.to) return day(p.from, true) + " ~";
  return day(p.from, true) + " ~ " + day(p.to, p.to.slice(0, 4) !== p.from.slice(0, 4));
}

export default function EventsPage() {
  const [feed, setFeed] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { let on = true; loadFeed().then((f) => { if (on) setFeed(f); }); return () => { on = false; }; }, []);
  useEffect(() => { document.title = "진행 중 이벤트 | 파마스퀘어 " + STORE_CONFIG.name; }, []);
  const items = liveSlides(feed, kstToday());

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, color: BRAND.ink, wordBreak: "keep-all" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 56px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <img src={LOGO} alt="PHAMA SQUARE" style={{ height: 12, display: "block" }} />
          <span style={{ fontSize: 14, color: BRAND.gray }}>{STORE_CONFIG.name}</span>
        </header>
        <h1 style={{ margin: "16px 0 24px", fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>진행 중 이벤트</h1>
        {!items.length && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>지금 진행 중인 이벤트가 없습니다.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {items.map((p, k) => {
            const cover = (p.image && slideUrl(p.image)) || STORE_PHOTOS[k % STORE_PHOTOS.length];
            const more = (p.images || []).map(slideUrl).filter(Boolean);
            const on = open === p.id;
            return (
              <article key={p.id}>
                <button type="button" onClick={() => more.length && setOpen(on ? null : p.id)} aria-expanded={more.length ? on : undefined}
                  style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", textAlign: "left", font: "inherit", color: "inherit", cursor: more.length ? "pointer" : "default" }}>
                  <div style={{ aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", background: BRAND.line }}>
                    <img src={cover} alt="" loading={k ? "lazy" : "eager"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  <h2 style={{ margin: "16px 0 0", fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>{p.title}</h2>
                  {(p.desc || p.sub) && <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.6 }}>{p.desc || p.sub}</p>}
                  {period(p) && <p style={{ margin: "8px 0 0", fontSize: 14, color: BRAND.gray }}>{period(p)}</p>}
                </button>
                {on && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                    {more.map((u, j) => <img key={j} src={u} alt="" loading="lazy" style={{ width: "100%", borderRadius: 12, display: "block" }} />)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
