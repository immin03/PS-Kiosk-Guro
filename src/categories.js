import { RACKS } from "./rackLayout.js";
import { ALL_PRODUCTS } from "./storeData.js";

/* 카테고리 목록을 배치 정본에서 만듭니다.
 *
 * 예전에는 storeData.js 안에 HEALTH_CATS · BEAUTY_CATS 가 따로 박혀 있어서
 * 구강용품이 건강기능식품에 들어가고, 브랜드존 매대(대상 웰라이프 등)가
 * 카테고리 목록에 섞이고, '대상 웰라이프'가 두 번 나왔습니다.
 * 이제 랙의 cat · zone 이 그대로 카테고리가 됩니다.
 */

/* 정본 중분류 → 홈 카테고리. 브랜드존과 프로모션은 카테고리가 아니라
   브랜드 매대라서 여기 넣지 않습니다. */
const ZONE_TO_TYPE = {
  "건기식": "health",
  "뷰티": "beauty",
  "펫": "pet",
  "라이프": "life",
  "키즈": "kids",
  "식품·음료": "life",
  "브랜드존": "brand",
  /* B9(이벤트존)에는 음료가 43개 올라가 있습니다. 정본은 이 랙을 '이벤트존 · 프로모션'
     으로 적어두었고 예전 키오스크 데이터는 '음료판매대'라고 불렀습니다.
     어느 쪽이 맞는지는 매장 확인이 필요하지만, 그 사이 상품이 아예 안 보이면 안 되므로
     생활 쪽에서 찾을 수 있게 둡니다. */
  "프로모션": "life",
};

const key = (s) => String(s).replace(/\s+/g, "");

/* 카테고리마다 다른 이모지를 씁니다. 예전에는 💊 하나가 종합비타민 · 비타민D ·
   비타민C 를 함께 가리켜 타일을 눈으로 구분할 수 없었습니다.
 *
 * 손 · 사람이 들어간 이모지에는 피부톤(U+1F3FB)을 붙입니다. 톤을 붙이지 않으면
 * 기본값인 노란색으로 그려집니다. 톤은 머리색까지 정합니다 — 검은 머리로
 * 그려지는 것은 이 톤뿐이고, 한 단계만 올려도 금발이 됩니다. */
const EMOJI = {
  // 건기식
  "콘드로이친": "🦴", "뼈건강": "🩻", "관절·근육건강": "💪🏻", "오메가3": "🐟",
  "기억력·인지력": "🧠", "눈건강": "👁️", "숙취해소": "🍺", "간건강": "🩺",
  "수면·스트레스": "😴", "여성건강": "🌸", "남성건강": "🧔🏻", "면역": "🛡️",
  "항산화": "🍇", "홍삼": "🌿", "종합비타민": "💊", "비타민B·D": "☀️",
  "비타민C": "🍋", "단백질·아미노산": "🥩", "활력·에너지": "⚡", "어린이건강": "👶🏻",
  "혈당·체중관리": "⚖️", "쉐이크·식사대용": "🥤", "디톡스": "🍃",
  "식이섬유·효소": "🌾", "유산균": "🦠", "구강건강": "🦷", "구강청결": "💨",
  "여성위생용품": "🌼",
  // 뷰티
  "이너뷰티": "✨", "구강용품": "🪥", "마스크팩": "🧖🏻", "토너·세럼·미스트": "💧",
  "앰플·에센스": "💎", "크림": "🫙", "아이케어": "👀", "립메이크업": "💋",
  "베이스메이크업": "🎨", "선케어": "🌞", "바디로션": "🧴", "프레시케어": "🌬️",
  "뷰티디바이스": "🔌", "샴푸": "🚿", "트리트먼트·팩": "💇🏻", "헤어케어·염색": "🖌️",
  "헤어스타일링": "💈", "핸드크림·립밤": "🤚🏻", "글로벌뷰티": "🌏", "클랜징": "🫧",
  "핸드워시": "🧼", "바디케어": "🛁", "쉐이빙": "🪒", "맨즈케어": "👔",
  // 라이프 · 식품
  "펫위생용품": "🐕", "대상웰라이프": "🥛", "성인용품": "🔞", "제모용품·스크럽": "✂️",
  "생활위생용품": "🧻", "생활용품": "🏡", "탈취·방향제": "🕯️",
  "식품": "🍯", "어린이간식": "🍪", "이벤트존": "🎪",
  // 펫
  "펫모래·패드": "🧺", "펫건강": "🐾", "펫미용": "🧽", "펫장난감": "🎾",
  "펫사료·간식": "🍖",
};

/* 브랜드존은 매대 하나가 곧 브랜드라 이름이 그때그때 바뀝니다.
   개별 이모지를 박지 않고 공통 표식을 씁니다. */
const FALLBACK_EMOJI = "🏬";

/* 랙별 상품 수 */
const COUNT_BY_RACK = (() => {
  const n = {};
  ALL_PRODUCTS.forEach((p) => { if (p.rack) n[p.rack] = (n[p.rack] || 0) + 1; });
  return n;
})();

/* cat 하나가 여러 랙에 걸칠 수 있습니다(마스크팩 C1·C9). 하나로 묶습니다. */
export const CATEGORIES = (() => {
  const byCat = new Map();
  RACKS.forEach((r) => {
    const type = ZONE_TO_TYPE[r.zone];
    if (!type) return;
    const k = key(r.cat);
    if (!byCat.has(k)) {
      byCat.set(k, {
        id: k, name: r.cat, type, zone: r.zone,
        emoji: EMOJI[k] || FALLBACK_EMOJI,
        rackList: [], count: 0,
      });
    }
    const c = byCat.get(k);
    c.rackList.push(r.code);
    c.count += COUNT_BY_RACK[r.code] || 0;
  });
  return [...byCat.values()]
    .map((c) => ({ ...c, racks: c.rackList.join(",") }))
    .sort((a, b) => a.rackList[0].localeCompare(b.rackList[0], "en", { numeric: true }));
})();

/* 상품이 하나도 없는 랙은 목록에 내지 않습니다. 눌러도 빈 화면이 나옵니다.
   (예: 브랜드존의 '이벤트존' 매대는 아직 SKU 가 붙어 있지 않습니다) */
export const categoriesOf = (type) =>
  CATEGORIES.filter((c) => c.type === type && c.count > 0);

export const countOf = (type) =>
  categoriesOf(type).reduce((s, c) => s + c.count, 0);

/* 카테고리에 속한 상품 — 랙으로 찾습니다. 상품의 cat 문자열은 예전 엑셀
   기준이라 정본 카테고리 이름과 다를 수 있습니다. */
export function productsOf(cat) {
  const set = new Set(cat.rackList || String(cat.racks || "").split(","));
  return ALL_PRODUCTS.filter((p) => set.has(p.rack));
}
