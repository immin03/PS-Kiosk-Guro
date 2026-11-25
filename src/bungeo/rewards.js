/* 보상 자리. 보상 종류(진짜 붕어빵 · 핫팩 · 쿠폰)는 아직 정하지 않았다.
 * 키오스크 화면에는 보상 이름을 띄우지 않고(REWARD_VISIBLE=false), 스탬프 개수만 보여 준다.
 * 보상 확정 뒤 REWARD_VISIBLE 과 tiers 를 고친다. 뽑기는 이 게임과 따로 간다. */
export const REWARD_VISIBLE = false;
export const REWARD_TIERS = [
  { min: 1, label: "쿠폰 (종류 미정)" },
  { min: 3, label: "핫팩 (미정)" },
  { min: 5, label: "진짜 붕어빵 (미정)" },
];

export function rewardFor(stamps) {
  let hit = null;
  for (const t of REWARD_TIERS) if (stamps >= t.min) hit = t;
  return hit;
}
