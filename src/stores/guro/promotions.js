/* 자동 생성 — 직접 고치지 마세요.
   * 정본: PS-OS catalog/promotions.json (2026-09-29 기준)
   * 갱신: node scripts/sync-racks.mjs
   *
   * 프칼(records) 건이 먼저, 상시(running) 건은 프칼 건이 그날 하나도 없을 때만 뜹니다(src 로 가름).
   * 날짜(from · to)는 키오스크가 그날 기준으로 거릅니다.
   */
  export const PROMOTIONS = [
  {
    "id": "pr-2611-수험생",
    "src": "프칼",
    "status": "확정",
    "from": "2026-10-08",
    "to": "2026-11-19",
    "tag": "시즌 기획전",
    "title": "수능 응원 이벤트",
    "sub": "",
    "link": "https://www.phamasquare.com/event.html",
    "image": "2611-suneung-1.jpg",
    "images": [
      "2611-suneung-1.jpg",
      "2611-suneung-2.jpg",
      "2611-suneung-3.jpg"
    ],
    "imageHasText": true
  },
  {
    "id": "pr-2611-하남기획전",
    "src": "프칼",
    "status": "확정",
    "from": "2026-10-30",
    "to": "2026-11-29",
    "tag": "시즌 기획전",
    "title": "건강한 겨울을 준비할 시간",
    "sub": "",
    "link": "https://www.phamasquare.com/event.html",
    "image": "2611-winter-0.jpg",
    "images": [
      "2611-winter-0.jpg",
      "2611-winter-1.jpg",
      "2611-winter-2.jpg",
      "2611-winter-3.jpg",
      "2611-winter-4.jpg",
      "2611-winter-5.jpg",
      "2611-winter-6.jpg"
    ],
    "imageHasText": true
  },
  {
    "id": "guro-open",
    "rank": 1,
    "status": "live",
    "stores": [
      "guro"
    ],
    "from": "2026-08-01",
    "to": null,
    "tag": "OPEN",
    "title": "구로점 오픈 기념 이벤트",
    "sub": "건강기능식품 · 뷰티 · 펫 1,679종",
    "channels": [
      "event",
      "kiosk",
      "web"
    ],
    "link": "https://www.phamasquare.com/event.html",
    "image": "store-05.jpg",
    "src": "상시"
  },
  {
    "id": "guro-readybag",
    "rank": 2,
    "status": "live",
    "stores": [
      "guro"
    ],
    "from": "2026-08-01",
    "to": null,
    "tag": "선착순",
    "title": "레디백 증정",
    "sub": "스탬프 6개 또는 15만원 이상 구매",
    "limit": "선착순 100명 · 소진 시 조기 마감",
    "channels": [
      "event",
      "kiosk"
    ],
    "link": "https://www.phamasquare.com/event.html",
    "image": "store-c.jpg",
    "src": "상시"
  },
  {
    "id": "guro-welcome-coupon",
    "rank": 3,
    "status": "live",
    "stores": [
      "guro"
    ],
    "from": "2026-08-01",
    "to": null,
    "tag": "쿠폰",
    "title": "오픈 기대평 웰컴 쿠폰",
    "sub": "기대평 남기면 1,000원 할인 쿠폰",
    "channels": [
      "event",
      "kiosk"
    ],
    "link": "https://www.phamasquare.com/event.html",
    "image": "store-exterior.jpg",
    "src": "상시"
  },
  {
    "id": "guro-stamp",
    "rank": 5,
    "status": "live",
    "stores": [
      "guro"
    ],
    "from": "2026-08-01",
    "to": null,
    "tag": "스탬프",
    "title": "스탬프 카드",
    "sub": "6개 모으면 특별 굿즈",
    "channels": [
      "event",
      "kiosk"
    ],
    "link": "https://www.phamasquare.com/event.html",
    "image": "store-floor.jpg",
    "src": "상시"
  }
];
  