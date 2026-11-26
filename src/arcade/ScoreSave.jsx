import { useEffect, useState } from "react";
import qrcode from "qrcode-generator";
import { STORE } from "../store.js";
import { postScore, claimUrl, sharedDevice } from "./rank.js";

/* 게임 끝 카드 안 「순위에 올리기」 — 매장 기기는 QR, 손님 휴대폰은 바로 가는 버튼. — 점수를 서버에 올리고 받은 코드로 QR. 손님이 휴대폰으로 찍으면 월드 페이지에서
 * 그 손님 기록에 저장(회원이면 회원 표시, 아니면 닉네임 만들고 회원 확인 안내). 못 올리면 아무것도 안 보인다 */
export function Qr({ text, size = 112 }) {
  const q = qrcode(0, "M");
  q.addData(text); q.make();
  const n = q.getModuleCount(), b = 2;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + b} ${r + b}h1v1h-1z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + b * 2} ${n + b * 2}`} shapeRendering="crispEdges" aria-label="점수 저장 QR" role="img" style={{ display: "block", flex: "none" }}>
      <rect width="100%" height="100%" fill="#fff" /><path d={d} fill="#2D373D" />
    </svg>
  );
}

const CSS = `
.ss{display:flex;gap:14px;align-items:center;margin:14px 0 0;padding:12px;border-radius:14px;background:#F2F5F5;text-align:left}
.ss b{display:block;font-size:16px;font-weight:600;color:#2D373D}
.ss span{display:block;margin-top:4px;font-size:14px;line-height:1.5;color:#5E6A70;word-break:keep-all}
.ss-go{display:block;margin:14px 0 0;padding:14px 16px;border-radius:14px;background:#F2F5F5;text-align:left;text-decoration:none}
.ss-go b{display:flex;align-items:center;justify-content:space-between;font-size:16px;font-weight:600;color:#2D373D}
.ss-go span{display:block;margin-top:4px;font-size:14px;line-height:1.5;color:#5E6A70;word-break:keep-all}
`;

export default function ScoreSave({ game, score, detail }) {
  const [code, setCode] = useState(null);
  useEffect(() => {
    let alive = true;
    setCode(null);
    postScore(STORE, game, score, detail).then((r) => { if (alive && r?.code) setCode(r.code); });
    return () => { alive = false; };
  }, [game, score]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!code) return null;
  /* 손님 휴대폰 — 찍을 QR 이 아니라 바로 월드 페이지로. 닉네임 · 회원 확인은 그 페이지가 한다 */
  if (!sharedDevice()) return (
    <a className="ss-go" href={claimUrl(STORE, code)}>
      <style>{CSS}</style>
      <b>이번 주 랭킹에 올리기<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="#2D373D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></b>
      <span>닉네임으로 올라가요.<br />파마스퀘어 회원이면 순위표에 회원 표시가 붙어요.</span>
    </a>
  );
  return (
    <div className="ss">
      <style>{CSS}</style>
      <Qr text={claimUrl(STORE, code)} />
      <div>
        <b>휴대폰으로 찍어 순위에 올리기</b>
        <span>닉네임으로 이번 주 랭킹에 올라가요.<br />24시간 안에 찍어 주세요.</span>
      </div>
    </div>
  );
}
