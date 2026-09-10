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

export default function EntryGate({ lang, setLang, onEnter, logo, LangToggle }) {
  /* 2 × 2. 매장에서 쓰는 둘을 윗줄에, 밖으로 나가는 둘을 아랫줄에 둡니다. */
  const cards = [
    { id: "map", emoji: "🗺️", key: "gateMap", sub: "gateMapSub", tab: "map" },
    { id: "search", emoji: "🔎", key: "gateSearch", sub: "gateSearchSub", tab: "search" },
    { id: "event", emoji: "🎟️", key: "gateEvent", sub: "gateEventSub", href: SITE_EVENT },
    { id: "site", emoji: "🌐", key: "gateSite", sub: "gateSiteSub", href: SITE },
  ];

  return (
    <div style={{
      minHeight: "100dvh", background: BRAND.wash, backgroundAttachment: "fixed",
      display: "flex", flexDirection: "column",
      alignItems: "center", padding: "0 20px 40px",
    }}>
      {/* 언어는 여기서도 바꿀 수 있어야 합니다 — 들어간 뒤에야 보이면 늦습니다. */}
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", padding: "14px 0" }}>
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <img src={logo} alt="PHAMA SQUARE" style={{ height: 14, objectFit: "contain", display: "block", marginTop: 28 }} />
      {/* 매장 이름은 첫 화면의 얼굴이라 자간을 좁히지 않습니다. */}
      <p style={{ margin: "12px 0 0", fontSize: 16, fontWeight: 700, color: BRAND.text, letterSpacing: "0.02em" }}>
        {t(lang, "gateTitle")}
      </p>
      {/* 민트 위에서는 회색 글자가 묻힙니다. 흐린 자리 색은 흰 바탕 기준입니다. */}
      <p style={{ margin: "6px 0 0", fontSize: 13, color: BRAND.text, opacity: 0.62 }}>
        {t(lang, "gateSub")}
      </p>

      <div style={{
        width: "100%", maxWidth: 420, marginTop: 32,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
      }}>
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            className="kiosk-card"
            onClick={() => (c.href ? window.location.assign(c.href) : onEnter(c.tab))}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 10, textAlign: "center", padding: "26px 12px",
              borderRadius: RADIUS.box, cursor: "pointer",
              background: BRAND.surface, border: `1px solid ${BRAND.border}`,
              fontFamily: "inherit", width: "100%",
            }}
          >
            <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden>{c.emoji}</span>
            <span>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: BRAND.text, lineHeight: 1.35 }}>
                {t(lang, c.key)}
              </span>
              <span style={{ display: "block", marginTop: 4, fontSize: 12, color: BRAND.gray, lineHeight: 1.35 }}>
                {t(lang, c.sub)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
