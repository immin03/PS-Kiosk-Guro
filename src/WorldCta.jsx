/* 파마스퀘어 월드 배너(src/promo/2612-world-0.jpg)의 「오픈 예정」 버튼 자리 — 그림에 박힌 버튼 위에 같은 크기의 투명 알약을 얹어
   마우스를 올리면 버튼만 살짝 어둡게, 누르면 조금 더(키오스크 기본 버튼 .ui-btn1 의 brightness .95 와 같은 결).
   빛 테두리 · 그림자 · 위로 뜨기는 걷음(2026-11-25 사용자 「호버 디자인 왜 이래」).
   자리는 1600 × 900 그림 기준 x 112 ~ 356 · y 680 ~ 776(그림에서 잰 값과 맞음). 배너를 새로 그리면 여기 비율도 같이 고친다.
   배너 전체가 누르는 자리라 부모(.world-hit)에 올려도 같이 반응한다 */
const CSS = `
.world-cta{position:absolute;left:7%;top:75.56%;width:15.25%;height:10.67%;border-radius:999px;pointer-events:none;background:rgba(0,0,0,0);transition:background .15s ease}
@media (hover:hover){.world-hit:hover .world-cta{background:rgba(0,0,0,.06)}}
.world-hit:active .world-cta{background:rgba(0,0,0,.12)}
@media (prefers-reduced-motion: reduce){.world-cta{transition:none}}
`;
export default function WorldCta() {
  return (<><style>{CSS}</style><span className="world-cta" aria-hidden="true" /></>);
}
