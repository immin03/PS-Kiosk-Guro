/* 파마스퀘어 월드 배너(src/promo/2612-world-0.jpg)의 「오픈 예정」 버튼 자리 — 그림에 박힌 버튼 위에 같은 크기의 투명 알약을 얹어
   마우스를 올리면 빛 테두리 · 밝은 막, 누르면 살짝 어둡게(2026-11-22 사용자 「월드 배너 버튼 호버 기능」).
   자리는 1600 × 900 그림 기준 x 112 ~ 356 · y 680 ~ 776. 배너를 새로 그리면 여기 비율도 같이 고친다.
   배너 전체가 누르는 자리라 부모(.world-hit)에 올려도 같이 반응한다 */
const CSS = `
.world-cta{position:absolute;left:7%;top:75.56%;width:15.25%;height:10.67%;border-radius:999px;pointer-events:none;
  box-shadow:0 0 0 0 rgba(1,192,164,0);background:rgba(255,255,255,0);transition:box-shadow .25s ease,background .25s ease,transform .2s ease}
.world-hit:hover .world-cta{box-shadow:0 0 0 5px rgba(1,192,164,.28),0 8px 22px rgba(1,150,128,.35);background:rgba(255,255,255,.16);transform:translateY(-1px)}
.world-hit:active .world-cta{background:rgba(0,40,36,.12);box-shadow:0 0 0 3px rgba(1,192,164,.3);transform:translateY(0)}
@media (prefers-reduced-motion: reduce){.world-cta{transition:none}}
`;
export default function WorldCta() {
  return (<><style>{CSS}</style><span className="world-cta" aria-hidden="true" /></>);
}
