/**
 * 파마스퀘어 브랜드 컬러.
 *
 * 값의 출처는 브랜드 컬러 가이드와 PS-OS `catalog/ui-colors.json` 의 역할 정의입니다.
 * 화면에 색을 직접 적지 말고 여기서 가져다 씁니다.
 *
 *   #005251  primary   — 헤드라인 · BI            (PANTONE 7722 C)
 *   #00978F  secondary — 본문 강조 · 지도 건기식   (PANTONE 7716 C)
 *   #01C0A4  accent1   — CTA · 활성 탭 · 링크      (PANTONE 922 C)
 *   #2BCAB0  929 C
 *   #63CAC1  파마 블루 라이트
 *   #C8E8E2  청록 틴트 — 선택 · 배지 배경
 *   #10181E  파마 블랙 쿨                          (PANTONE BLACK 6 C)
 *   #2D373D  파마 블랙 라이트
 *   #D8E1E2  7541 C — 경계선
 *   #E5E5E5  라이트 그레이
 */

export const BRAND = {
  primary: "#005251",
  secondary: "#00978F",
  accent: "#01C0A4",
  accentSoft: "#2BCAB0",
  light: "#63CAC1",
  tint: "#C8E8E2",

  ink: "#10181E",
  text: "#2D373D",
  /* 가이드의 회색은 전부 밝아 본문 보조로 쓸 수 없습니다. 파마 블랙 라이트를 밝힌 값입니다. */
  muted: "#6E7A7D",

  border: "#D8E1E2",
  line: "#E5E5E5",
  /* 브랜드 틴트를 배경 농도로 낮춘 값입니다. AI 건강 가이드와 같은 값을 씁니다. */
  bg: "#F2F7F6",
  surface: "#FFFFFF",
  surfaceSoft: "#F6FAF9",
};

/**
 * 지도 존 색.
 *
 * 브랜드 팔레트는 청록 한 계열이라 존 여덟 개를 구분할 수 없습니다. 손님이 매대를
 * 찾는 화면이라 구분이 먼저여서, 건기식·브랜드존은 브랜드 값을 그대로 쓰고 나머지는
 * 채도를 낮춰 브랜드 옆에 놓이도록 맞췄습니다.
 */
export const ZONE_COLOR = {
  "건기식": BRAND.secondary,
  "브랜드존": BRAND.primary,
  "뷰티": "#B98C8C",
  "펫": "#C2A052",
  "라이프": "#7C8F9B",
  "식품·음료": "#5B93A8",
  "프로모션": "#A87A7A",
  "기타": "#9AA5A3",
};

export const ZONE_FALLBACK = ZONE_COLOR["기타"];

/** 현재 위치 — 브랜드 청록과 섞이면 안 되는 자리라 팔레트 밖 색을 씁니다. */
export const YOU_HERE = "#D8483F";
