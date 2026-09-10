import { BRAND, RADIUS } from "./theme.js";
import { t } from "./i18n.js";

/* 첫 화면.
 *
 * 손님이 키오스크 앞에 서서 처음 보는 화면입니다. 매대를 찾으러 온 사람과
 * 이벤트를 보러 온 사람이 각자 갈 길을 고르게 세 가지만 냅니다.
 *
 * 이벤트 · 홈페이지 주소는 정본(PS-OS catalog/promotions.json)의 link 와
 * 같은 곳을 가리킵니다. 주소가 바뀌면 여기도 함께 고쳐야 합니다.
 */

export const SITE = "https://www.phamasquare.com";
export const SITE_EVENT = `${SITE}/event.html`;

export default function EntryGate({ lang, setLang, onEnterMap, logo, LangToggle }) {
  const cards = [
    { id: "map", emoji: "🗺️", key: "gateMap", sub: "gateMapSub" },
    { id: "event", emoji: "🎁", key: "gateEvent", sub: "gateEventSub", href: SITE_EVENT },
    { id: "site", emoji: "🏬", key: "gateSite", sub: "gateSiteSub", href: SITE },
  ];

  return (
    <div style={{
      minHeight: "100dvh", background: BRAND.bg, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "0 20px 40px",
    }}>
      {/* 언어는 여기서도 바꿀 수 있어야 합니다 — 들어간 뒤에야 보이면 늦습니다. */}
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", padding: "14px 0" }}>
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <img src={logo} alt="PHAMA SQUARE" style={{ height: 14, objectFit: "contain", display: "block", marginTop: 28 }} />
      <p style={{ margin: "12px 0 0", fontSize: 15, fontWeight: 700, color: BRAND.text, letterSpacing: "-0.01em" }}>
        {t(lang, "gateTitle")}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: BRAND.gray }}>
        {t(lang, "gateSub")}
      </p>

      <div style={{
        width: "100%", maxWidth: 420, marginTop: 32,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            className="kiosk-card"
            onClick={() => (c.href ? window.location.assign(c.href) : onEnterMap())}
            style={{
              display: "flex", alignItems: "center", gap: 16, textAlign: "left",
              padding: "22px 20px", borderRadius: RADIUS.box, cursor: "pointer",
              background: BRAND.surface, border: `1px solid ${BRAND.border}`,
              fontFamily: "inherit", width: "100%",
            }}
          >
            <span style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }} aria-hidden>{c.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: BRAND.text, lineHeight: 1.35 }}>
                {t(lang, c.key)}
              </span>
              <span style={{ display: "block", marginTop: 4, fontSize: 12, color: BRAND.gray, lineHeight: 1.35 }}>
                {t(lang, c.sub)}
              </span>
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND.gray}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
