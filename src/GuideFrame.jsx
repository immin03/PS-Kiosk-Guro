import { useEffect, useState } from "react";
import { guideUrl } from "./guide.js";
import { BRAND, RADIUS } from "./theme.js";

/* 이 판(배포본 기준)의 theme 에는 글자 층 표가 없어 값을 여기 둡니다 — 배포본 화면과 같은 값 */
const TYPE = { title: 16, body: 13 };
const WEIGHT = { title: 700 };
const LEADING = { base: 1.5 };
import { t } from "./i18n.js";

/* 건강 가이드 화면 — 가이드를 키오스크 안에 엽니다.
 *
 * 가이드는 인터넷이 있어야 돕니다(설문 저장 · 쿠폰). 매장 WebView 가 끊겨 있으면
 * 하얀 칸만 남지 않게 안내를 띄우고 다시 시도할 수 있게 합니다. */

const TOP_BAR = 56;   /* 머리글 줄 — 실측(2026-11-20) */
const BOTTOM_NAV = 49; /* 아래 탭 — 실측 48.6 */

/* 화면 폭에 맞춰 html 에 zoom 을 걸어 두므로, 남은 높이는 그 배율로 나눠 셉니다. */
const usableHeight = () => {
  const z = parseFloat(document.documentElement.style.zoom) || 1;
  return Math.max(320, Math.floor(window.innerHeight / z) - TOP_BAR - BOTTOM_NAV);
};

export default function GuideFrame({ path, lang, nonce = 0 }) {
  const [h, setH] = useState(usableHeight);
  const [state, setState] = useState(() => (navigator.onLine === false ? "offline" : "loading"));
  const [tryNo, setTryNo] = useState(0);

  useEffect(() => {
    const fit = () => setH(usableHeight());
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* 12초 안에 안 뜨면 끊긴 것으로 봅니다. */
  useEffect(() => {
    if (state !== "loading") return;
    const id = setTimeout(() => setState((s) => (s === "loading" ? "offline" : s)), 12000);
    return () => clearTimeout(id);
  }, [state, tryNo]);

  const src = guideUrl(path, lang);

  /* 「여는 중」 문구는 0.4초 넘게 걸릴 때만(2026-11-18 사용자 「번쩍임 확인」) — 빨리 열려도 매번 문구가 한 번 번쩍 지나갔다 */
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (state !== "loading") { setSlow(false); return; }
    const id = setTimeout(() => setSlow(true), 400);
    return () => clearTimeout(id);
  }, [state, tryNo, src]);

  if (state === "offline") {
    return (
      <div style={{ height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 14, padding: 24, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: TYPE["title"], fontWeight: WEIGHT.title, color: BRAND.text, lineHeight: LEADING.base }}>
          {t(lang, "guideOffline")}
        </p>
        <p style={{ margin: 0, fontSize: TYPE["body"], color: BRAND.gray, lineHeight: LEADING.base }}>{t(lang, "guideOfflineSub")}</p>
        <button type="button" className="ps-btn" onClick={() => { setState("loading"); setTryNo((n) => n + 1); }} style={{
          marginTop: 6, padding: "12px 22px", borderRadius: RADIUS.box, border: "none", background: "#01C0A4", color: "#FFFFFF",
          fontSize: TYPE["body"], fontWeight: WEIGHT.title, fontFamily: "inherit", cursor: "pointer",
        }}>{t(lang, "retry")}</button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: h, background: BRAND.bg }}>
      {state === "loading" && slow && (
        <p style={{ position: "absolute", inset: 0, margin: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: TYPE["body"], color: BRAND.gray }}>{t(lang, "guideLoading")}</p>
      )}
      <iframe
        key={`${src}#${tryNo}#${nonce}`}
        src={src}
        title={t(lang, "tabGuide")}
        onLoad={() => setState("ready")}
        allow="clipboard-write"
        style={{ position: "relative", display: "block", width: "100%", height: "100%", border: "none",
          opacity: state === "ready" ? 1 : 0 }}
      />
    </div>
  );
}
