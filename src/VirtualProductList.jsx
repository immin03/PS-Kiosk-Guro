import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import { PRODUCT_ROW_HEIGHT, getVirtualRange } from "./catalogPerformance.js";

/* 긴 상품 목록을 화면에 보이는 줄만 그립니다.
 *
 * 검색에서 「비타민」 을 치면 수백 줄이 나옵니다. 전부 그리면 셋톱박스에서
 * 스크롤이 끊깁니다. 보이는 줄과 위아래 몇 줄만 그리고, 나머지 자리는 빈
 * 칸으로 높이만 채웁니다.
 *
 * 보이미(Boim.e) 성능 개선 전달본(2026-09-18) 의 VirtualProductList.js 를
 * 옮겨 왔습니다. 바꾼 점 하나 — 확대 배율.
 *
 * 이 앱은 화면 폭에 맞춰 문서 전체를 확대합니다(DID 에서 최대 2.6배). 원본은
 * 한 줄을 63px 로 셌는데, 확대된 화면에서 한 줄은 63 × 2.6px 로 그려집니다.
 * 그대로 옮기면 필요한 줄의 절반도 안 그려 스크롤할 때 빈칸이 보입니다.
 * 그래서 목록이 실제로 몇 배로 그려졌는지를 화면에서 재고(그려진 높이 ÷
 * 레이아웃 높이), 스크롤 위치를 그 배율로 되돌려 셉니다. 브라우저가 확대를
 * 어떤 방식으로 처리하든 같은 잣대로 재므로 어긋나지 않습니다.
 */

const INITIAL_VIEWPORT = 720;

function sameRange(a, b) {
  return a.startIndex === b.startIndex && a.endIndex === b.endIndex
    && a.topSpacerHeight === b.topSpacerHeight && a.bottomSpacerHeight === b.bottomSpacerHeight;
}

function useVirtualRange(total, listRef) {
  const [range, setRange] = useState(() => getVirtualRange(total, 0, INITIAL_VIEWPORT));

  const measure = useCallback(() => {
    const node = listRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    /* 레이아웃 1px 이 화면에서 몇 px 로 그려졌는지 */
    const scale = node.offsetHeight > 0 ? rect.height / node.offsetHeight : 1;
    const next = getVirtualRange(
      total,
      Math.max(0, -rect.top) / scale,
      (window.innerHeight || INITIAL_VIEWPORT) / scale,
    );
    setRange((cur) => (sameRange(cur, next) ? cur : next));
  }, [listRef, total]);

  useEffect(() => {
    let frame = null;
    /* 스크롤마다 재지 않고 한 화면 그림에 한 번만 잽니다. */
    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => { frame = null; measure(); });
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  return range;
}

export default function VirtualProductList({ items, itemKey, renderItem }) {
  const listRef = useRef(null);
  const range = useVirtualRange(items.length, listRef);
  const visible = items.slice(range.startIndex, range.endIndex);

  return (
    <div ref={listRef} data-virtual-product-list="true">
      <div aria-hidden="true" style={{ height: range.topSpacerHeight }} />
      {visible.map((item, offset) => {
        const index = range.startIndex + offset;
        return <Fragment key={itemKey(item, index)}>{renderItem(item, index)}</Fragment>;
      })}
      <div aria-hidden="true" style={{ height: range.bottomSpacerHeight }} />
    </div>
  );
}

export { PRODUCT_ROW_HEIGHT };
