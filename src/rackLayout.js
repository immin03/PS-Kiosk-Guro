/* 자동 생성 — 직접 고치지 마세요.
 * 정본: PS-OS catalog/racks.json (2026-11-10 기준)
 * 갱신: node scripts/sync-racks.mjs
 *
 * 좌표는 격자 기준입니다. c=왼쪽 열, r=위쪽 행, w=너비, h=높이.
 * 판매장 비례는 도면과 맞습니다 (44,030 × 14,250mm · 3.09:1). 한 칸은 250mm 입니다.
 */
export const STORE_ID = "guro";
export const STORE_NAME = "구로";
export const GRID = {"rows":94,"cols":173};

/* 판매장 외곽과 축척. 벽이 없으면 매대 덩어리만 허공에 떠 보입니다. */
export const OUTLINE = [[2,2],[178,2],[178,59],[2,59]];
export const SCALE = {"mm_per_unit":250,"source":"FL-000 1/150 · 판매장 44,030 × 14,250mm"};

/* 매장 집기 — 입구 · 계산대 · 체험존처럼 상품이 놓이지 않는 자리 */
export const MARKS = [
  {
    "kind": "음료판매대",
    "c": 68,
    "r": 8,
    "w": 40,
    "h": 6,
    "fixture": "RM-RFG-1800-V1-G",
    "qty": 2
  },
  {
    "kind": "행사 · 파마베스트",
    "c": 44,
    "r": 57,
    "w": 33,
    "h": 4,
    "zone": "프로모션",
    "fixture": "RW-SHF-FIX-V1"
  },
  {
    "kind": "계단 입구",
    "c": 80,
    "r": 54,
    "w": 29,
    "h": 6
  },
  {
    "kind": "엘리베이터 입구",
    "c": 4,
    "r": 58,
    "w": 14,
    "h": 5
  },
  {
    "kind": "체험존",
    "c": 128,
    "r": 79,
    "w": 16,
    "h": 6,
    "fixture": "CT-BSN-450-500-V1-G"
  },
  {
    "kind": "앤드1",
    "c": 28,
    "r": 44,
    "w": 14,
    "h": 4,
    "fixture": "SGN-RB-LOGO-SC-V1-G"
  },
  {
    "kind": "앤드2",
    "c": 48,
    "r": 44,
    "w": 14,
    "h": 4,
    "fixture": "SGN-RB-LOGO-SC-V1-G"
  },
  {
    "kind": "앤드3",
    "c": 68,
    "r": 44,
    "w": 14,
    "h": 4,
    "fixture": "SGN-RB-LOGO-SC-V1-G"
  },
  {
    "kind": "앤드4",
    "c": 88,
    "r": 44,
    "w": 14,
    "h": 4,
    "fixture": "SGN-RB-LOGO-SC-V1-G"
  },
  {
    "kind": "앤드5",
    "c": 108,
    "r": 44,
    "w": 14,
    "h": 4,
    "fixture": "SGN-RB-LOGO-SC-V1-G"
  },
  {
    "kind": "기둥",
    "c": 121,
    "r": 2,
    "w": 6,
    "h": 5
  },
  {
    "kind": "셀프 계산대",
    "c": 127,
    "r": 0,
    "w": 23,
    "h": 8
  },
  {
    "kind": "셀프 1",
    "c": 128,
    "r": 4,
    "w": 6,
    "h": 3,
    "fixture": "DD-POS-SELF-V1"
  },
  {
    "kind": "셀프 2",
    "c": 128,
    "r": 1,
    "w": 6,
    "h": 3,
    "fixture": "DD-POS-SELF-V1"
  },
  {
    "kind": "셀프 3",
    "c": 143,
    "r": 4,
    "w": 6,
    "h": 3,
    "fixture": "DD-POS-SELF-V1"
  },
  {
    "kind": "셀프 4",
    "c": 143,
    "r": 1,
    "w": 6,
    "h": 3,
    "fixture": "DD-POS-SELF-V1"
  },
  {
    "kind": "유인 계산대",
    "c": 151,
    "r": 8,
    "w": 20,
    "h": 6
  },
  {
    "kind": "포스 5",
    "c": 164,
    "r": 9,
    "w": 6,
    "h": 4,
    "fixture": "DD-POS-CSH-V1"
  },
  {
    "kind": "사무실",
    "c": 153,
    "r": 0,
    "w": 18,
    "h": 7
  },
  {
    "kind": "스태프 창고",
    "c": 86,
    "r": 61,
    "w": 17,
    "h": 5
  },
  {
    "kind": "듀라셀",
    "c": 127,
    "r": 8,
    "w": 8,
    "h": 5,
    "fixture": "RP-BRD-V1"
  },
  {
    "kind": "창고",
    "c": 68,
    "r": 1,
    "w": 53,
    "h": 7
  },
  {
    "kind": "음향 장비",
    "c": 69,
    "r": 2,
    "w": 9,
    "h": 5,
    "up": true,
    "fixture": "LT-AUD-V1-G",
    "note": "창고 안 왼쪽"
  },
  {
    "kind": "P&G 매대",
    "c": 108,
    "r": 16,
    "w": 14,
    "h": 4,
    "fixture": "RP-BRD-V1",
    "item": "[한국피앤지] P&G 브랜드 매대 — A33 · A36 엔드캡 앞"
  }
];

/* 랙 — code 가 매출 히트맵 · SKU 시트와 공유하는 열쇠입니다 */
export const RACKS = [
  {
    "code": "A1",
    "c": 8,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "펫 모래 · 패드",
    "zone": "펫",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A2",
    "c": 8,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "펫 건강",
    "zone": "펫",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A3",
    "c": 8,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "펫 위생용품",
    "zone": "펫",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A4",
    "c": 15,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "페스룸",
    "zone": "펫",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A5",
    "c": 15,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "페스룸",
    "zone": "펫",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A6",
    "c": 15,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "펫 사료 · 간식",
    "zone": "펫",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A7",
    "c": 28,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "숙취해소",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A8",
    "c": 28,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "간 건강",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A9",
    "c": 28,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "수면 · 스트레스",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A10",
    "c": 35,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "이너뷰티",
    "zone": "뷰티",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A11",
    "c": 35,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "여성 건강",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A12",
    "c": 35,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "남성 건강",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A13",
    "c": 48,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "면역",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A14",
    "c": 48,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "항산화",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A15",
    "c": 48,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "홍삼",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A16",
    "c": 55,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "종합비타민",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A17",
    "c": 55,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "비타민B · D",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A18",
    "c": 55,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "비타민C",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A19",
    "c": 68,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "단백질 · 아미노산",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A20",
    "c": 68,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "활력 · 에너지",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A21",
    "c": 68,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "어린이 건강",
    "zone": "키즈",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A22",
    "c": 75,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "혈당 · 체중관리",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A23",
    "c": 75,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "쉐이크 · 식사대용",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A24",
    "c": 75,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "디톡스",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A25",
    "c": 88,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "식품",
    "zone": "식품·음료",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A26",
    "c": 88,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "식이섬유 · 효소",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A27",
    "c": 88,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "유산균",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A28",
    "c": 95,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "구강 건강",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A29",
    "c": 95,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "구강청결",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A30",
    "c": 95,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "구강용품",
    "zone": "뷰티",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A31",
    "c": 108,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "콘드로이친",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A32",
    "c": 108,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "뼈 건강",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A33",
    "c": 108,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "관절·근육 건강",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A34",
    "c": 115,
    "r": 36,
    "w": 7,
    "h": 8,
    "cat": "오메가3",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A35",
    "c": 115,
    "r": 28,
    "w": 7,
    "h": 8,
    "cat": "기억력 · 인지력",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "A36",
    "c": 115,
    "r": 20,
    "w": 7,
    "h": 8,
    "cat": "눈 건강",
    "zone": "건기식",
    "fixture": "RC-2400-1200-450-V2"
  },
  {
    "code": "B1",
    "c": 2,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "농협 · 한삼인",
    "zone": "건기식",
    "fixture": "RW-2400-1200-450-V2"
  },
  {
    "code": "B2",
    "c": 10,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "대상 웰라이프",
    "zone": "건기식",
    "fixture": "RW-2400-1200-450-V2"
  },
  {
    "code": "B3",
    "c": 18,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "대상 웰라이프",
    "zone": "건기식",
    "fixture": "RW-2400-1200-450-V2"
  },
  {
    "code": "B4",
    "c": 26,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "네이처가든",
    "zone": "건기식",
    "fixture": "RW-2400-1200-450-V2"
  },
  {
    "code": "B5",
    "c": 34,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "익스트림",
    "zone": "건기식",
    "fixture": "RW-2400-1200-450-V2"
  },
  {
    "code": "B6",
    "c": 42,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "있나요 · 뉴핏",
    "zone": "건기식",
    "fixture": "RW-2400-1200-450-V2"
  },
  {
    "code": "B7",
    "c": 50,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "어린이 간식",
    "zone": "키즈",
    "fixture": "RW-2400-1200-450-V2"
  },
  {
    "code": "B8",
    "c": 58,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "어린이 간식",
    "zone": "키즈",
    "fixture": "RW-2400-1200-450-V2"
  },
  {
    "code": "B9",
    "c": 108,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "이벤트존",
    "zone": "프로모션",
    "fixture": "RW-2400-1125-450-V2"
  },
  {
    "code": "B10",
    "c": 116,
    "r": 8,
    "w": 8,
    "h": 6,
    "cat": "이벤트존",
    "zone": "프로모션",
    "fixture": "RW-2400-1125-450-V2"
  },
  {
    "code": "C1",
    "c": 128,
    "r": 60,
    "w": 3,
    "h": 16,
    "cat": "마스크팩",
    "zone": "뷰티",
    "fixture": "RC-BEA-670-V1"
  },
  {
    "code": "C2",
    "c": 131,
    "r": 68,
    "w": 8,
    "h": 8,
    "cat": "토너 · 세럼· 미스트",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C3",
    "c": 139,
    "r": 68,
    "w": 8,
    "h": 8,
    "cat": "앰플 · 에센스",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C4",
    "c": 147,
    "r": 68,
    "w": 8,
    "h": 8,
    "cat": "크림",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C5",
    "c": 155,
    "r": 60,
    "w": 3,
    "h": 16,
    "cat": "아이케어",
    "zone": "뷰티",
    "fixture": "RC-BEA-670-V1"
  },
  {
    "code": "C6",
    "c": 147,
    "r": 60,
    "w": 8,
    "h": 8,
    "cat": "립 메이크업",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C7",
    "c": 139,
    "r": 60,
    "w": 8,
    "h": 8,
    "cat": "베이스 메이크업",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C8",
    "c": 131,
    "r": 60,
    "w": 8,
    "h": 8,
    "cat": "베이스 메이크업",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C9",
    "c": 128,
    "r": 40,
    "w": 3,
    "h": 16,
    "cat": "마스크팩",
    "zone": "뷰티",
    "fixture": "RC-BEA-670-V1"
  },
  {
    "code": "C10",
    "c": 131,
    "r": 48,
    "w": 8,
    "h": 8,
    "cat": "선케어",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C11",
    "c": 139,
    "r": 48,
    "w": 8,
    "h": 8,
    "cat": "바디로션",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C12",
    "c": 147,
    "r": 48,
    "w": 8,
    "h": 8,
    "cat": "프레시케어",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C13",
    "c": 155,
    "r": 40,
    "w": 3,
    "h": 16,
    "cat": "뷰티 디바이스",
    "zone": "뷰티",
    "fixture": "RC-BEA-670-V1"
  },
  {
    "code": "C14",
    "c": 147,
    "r": 40,
    "w": 8,
    "h": 8,
    "cat": "샴푸",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C15",
    "c": 139,
    "r": 40,
    "w": 8,
    "h": 8,
    "cat": "트리트먼트 · 팩",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C16",
    "c": 131,
    "r": 40,
    "w": 8,
    "h": 8,
    "cat": "헤어케어 · 염색",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C18",
    "c": 131,
    "r": 28,
    "w": 8,
    "h": 8,
    "cat": "성인용품",
    "zone": "라이프",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C19",
    "c": 139,
    "r": 28,
    "w": 8,
    "h": 8,
    "cat": "여성 위생용품",
    "zone": "라이프",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C20",
    "c": 147,
    "r": 28,
    "w": 8,
    "h": 8,
    "cat": "제모용품 · 스크럽",
    "zone": "라이프",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C21",
    "c": 155,
    "r": 20,
    "w": 3,
    "h": 16,
    "cat": "헤어 스타일링",
    "zone": "뷰티",
    "fixture": "RC-BEA-670-V1"
  },
  {
    "code": "C22",
    "c": 147,
    "r": 20,
    "w": 8,
    "h": 8,
    "cat": "생활 위생용품",
    "zone": "라이프",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C23",
    "c": 139,
    "r": 20,
    "w": 8,
    "h": 8,
    "cat": "생활용품",
    "zone": "라이프",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C24",
    "c": 131,
    "r": 20,
    "w": 8,
    "h": 8,
    "cat": "핸드크림 · 립밤",
    "zone": "뷰티",
    "fixture": "RC-BEA-840-V1"
  },
  {
    "code": "C25",
    "c": 128,
    "r": 20,
    "w": 3,
    "h": 16,
    "cat": "탈취 · 방향제",
    "zone": "라이프",
    "fixture": "RC-BEA-670-V1"
  },
  {
    "code": "D1",
    "c": 131,
    "r": 86,
    "w": 8,
    "h": 6,
    "cat": "글로벌 뷰티",
    "zone": "뷰티",
    "fixture": "RW-BEA-BP-V1"
  },
  {
    "code": "D2",
    "c": 139,
    "r": 86,
    "w": 8,
    "h": 6,
    "cat": "클랜징",
    "zone": "뷰티",
    "fixture": "RW-BEA-BP-V1"
  },
  {
    "code": "D3",
    "c": 147,
    "r": 86,
    "w": 8,
    "h": 6,
    "cat": "핸드워시",
    "zone": "뷰티",
    "fixture": "RW-BEA-BP-V1"
  },
  {
    "code": "D4",
    "c": 155,
    "r": 86,
    "w": 8,
    "h": 6,
    "cat": "바디케어",
    "zone": "뷰티",
    "fixture": "RW-BEA-BP-V1"
  },
  {
    "code": "D5",
    "c": 163,
    "r": 86,
    "w": 8,
    "h": 6,
    "cat": "티에스",
    "zone": "브랜드존",
    "fixture": "RW-BEA-BP-V1"
  },
  {
    "code": "D6",
    "c": 163,
    "r": 80,
    "w": 8,
    "h": 6,
    "cat": "티에스",
    "zone": "브랜드존",
    "fixture": "RW-BEA-BP-V1"
  },
  {
    "code": "D7",
    "c": 163,
    "r": 74,
    "w": 8,
    "h": 6,
    "cat": "코코도르",
    "zone": "브랜드존",
    "fixture": "RW-BEA-BP-V1"
  },
  {
    "code": "D8",
    "c": 163,
    "r": 68,
    "w": 8,
    "h": 6,
    "cat": "더블유랩",
    "zone": "브랜드존",
    "fixture": "RW-BEA-BP-V1"
  },
  {
    "code": "D9",
    "c": 163,
    "r": 62,
    "w": 8,
    "h": 6,
    "cat": "어나더페이스",
    "zone": "브랜드존",
    "fixture": "RW-BEA-NB-V1"
  },
  {
    "code": "D10",
    "c": 163,
    "r": 56,
    "w": 8,
    "h": 6,
    "cat": "믹순",
    "zone": "브랜드존",
    "fixture": "RW-BEA-NB-V1"
  },
  {
    "code": "D11",
    "c": 163,
    "r": 50,
    "w": 8,
    "h": 6,
    "cat": "데싱디바",
    "zone": "브랜드존",
    "fixture": "RW-BEA-NB-V1"
  },
  {
    "code": "D12",
    "c": 163,
    "r": 44,
    "w": 8,
    "h": 6,
    "cat": "풀리오",
    "zone": "브랜드존",
    "fixture": "RW-BEA-NB-V1"
  },
  {
    "code": "D13",
    "c": 163,
    "r": 38,
    "w": 8,
    "h": 6,
    "cat": "스파알",
    "zone": "브랜드존",
    "fixture": "RW-BEA-NB-V1"
  },
  {
    "code": "D14",
    "c": 163,
    "r": 32,
    "w": 8,
    "h": 6,
    "cat": "쉐이빙",
    "zone": "뷰티",
    "fixture": "RW-BEA-NB-V1"
  },
  {
    "code": "D15",
    "c": 163,
    "r": 26,
    "w": 8,
    "h": 6,
    "cat": "맨즈케어",
    "zone": "뷰티",
    "fixture": "RW-BEA-NB-V1"
  }
];

export const RACK_BY_CODE = Object.fromEntries(RACKS.map((r) => [r.code, r]));

/* 랙 카테고리. 정본 기준이라 예전 rack-sections.json 보다 이쪽이 맞습니다. */
export const RACK_CAT = Object.fromEntries(RACKS.map((r) => [r.code, r.cat]));
export const RACK_ZONE = Object.fromEntries(RACKS.map((r) => [r.code, r.zone]));
