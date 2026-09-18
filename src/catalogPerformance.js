/* 상품 목록을 가볍게 다루는 계산들.
 *
 * 보이미(Boim.e) 성능 개선 전달본(2026-09-18) 의 catalogPerformance.js 를
 * 옮겨 왔습니다. 바꾼 점은 주석에 적었습니다.
 */

/* 상품 한 줄의 높이(px). ProductCard 가 이 높이로 고정되고, 가상 목록이
   이 값으로 몇 번째 줄이 화면에 있는지 셉니다. 둘이 어긋나면 목록이 밀립니다.
   이사님 쪽 줄은 63px 였는데, 이쪽은 행간을 넓혀 70px 입니다. */
export const PRODUCT_ROW_HEIGHT = 70;
export const VIRTUAL_PRODUCT_OVERSCAN = 6;
export const VIRTUAL_PRODUCT_MAX_ROWS = 24;

/* 스크롤 위치(목록 맨 위 기준)와 보이는 높이로 그릴 줄의 범위를 셉니다.
   위아래로 몇 줄씩 더 그려 두어 빠르게 밀어도 빈칸이 보이지 않게 합니다. */
export function getVirtualRange(
  totalCount,
  scrollOffset,
  viewportHeight,
  { itemHeight = PRODUCT_ROW_HEIGHT, overscan = VIRTUAL_PRODUCT_OVERSCAN } = {},
) {
  const total = Math.max(0, Math.floor(Number(totalCount) || 0));
  const rowHeight = Math.max(1, Number(itemHeight) || PRODUCT_ROW_HEIGHT);
  const extraRows = Math.max(0, Math.floor(Number(overscan) || 0));
  const visibleHeight = Math.max(0, Number(viewportHeight) || 0);
  const totalHeight = total * rowHeight;
  const maxScrollOffset = Math.max(0, totalHeight - visibleHeight);
  const boundedScrollOffset = Math.min(maxScrollOffset, Math.max(0, Number(scrollOffset) || 0));
  const firstVisibleIndex = Math.floor(boundedScrollOffset / rowHeight);
  const visibleEndIndex = Math.min(total, Math.ceil((boundedScrollOffset + visibleHeight) / rowHeight));
  const targetWindowSize = Math.min(
    total,
    VIRTUAL_PRODUCT_MAX_ROWS,
    (visibleEndIndex - firstVisibleIndex) + (extraRows * 2),
  );
  let startIndex = Math.max(0, firstVisibleIndex - extraRows);
  const endIndex = Math.min(total, startIndex + targetWindowSize);
  startIndex = Math.max(0, endIndex - targetWindowSize);

  return {
    startIndex,
    endIndex,
    topSpacerHeight: startIndex * rowHeight,
    bottomSpacerHeight: (total - endIndex) * rowHeight,
  };
}

export function normalizeSearchQuery(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

/* 검색.
 *
 * 앞뒤 공백을 떼고 찾습니다 — 전에는 공백 하나만 쳐도 이름에 띄어쓰기가 있는
 * 상품이 전부 걸렸습니다. 랙 번호(「A31」)로도 찾습니다.
 * 이사님 원본은 찾을 칸 목록에 낱말 「섹션」 을 넣어 두어서 「섹」 한 글자만
 * 쳐도 상품 1,600개가 전부 걸렸습니다. 그 칸은 뺐습니다. */
export function filterProducts(products, query) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];

  return products.filter((product) => {
    const hit = [product.name, product.brand, product.cat, product.rack, product.en, product.benefit]
      .some((value) => String(value ?? "").toLocaleLowerCase().includes(normalized));
    if (hit) return true;
    if (!normalized.includes(" ") && !normalized.includes("·")) return false;
    return `${product.cat || ""} · 섹션 ${product.rack || ""}`.toLocaleLowerCase().includes(normalized);
  });
}

export function productKey(product) {
  return [product.name, product.brand, product.rack].map((v) => String(v ?? "")).join("|");
}
