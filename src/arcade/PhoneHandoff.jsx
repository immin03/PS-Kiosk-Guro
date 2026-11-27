import { INK, SUB, LINE } from "../ui.jsx";
import { Qr } from "./ScoreSave.jsx";

/* 3D 를 못 그리는 매장 기기 — 게임 · 파마스퀘어 월드를 열려다 「이 기기에서는 게임을 열 수 없어요」 로 끝나던 것을
 * 휴대폰으로 넘기는 QR 로 바꿈(2026-11-27 사용자 「모바일로 보내는 큐알코드를 띄워야」, 하남 50" 키오스크).
 * three 0.170 은 WebGL2 만 쓰므로 webgl2 로 잰다. 한 번 재고 기억한다 */
let gl2;
export function canWebGL() {
  if (gl2 !== undefined) return gl2;
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("gl") === "0") return (gl2 = false);   // 시험용
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("webgl2");
    gl2 = !!ctx;
    ctx?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { gl2 = false; }
  return gl2;
}

const CSS = `
.ph{display:flex;flex-direction:column;align-items:center;padding:48px 24px 32px;text-align:center}
.ph-qr{padding:16px;border-radius:20px;background:#fff;border:1px solid ${LINE}}
.ph h2{margin:28px 0 0;font-size:24px;font-weight:600;line-height:1.35;color:${INK};word-break:keep-all}
.ph p{margin:8px 0 0;font-size:16px;line-height:1.6;color:${SUB};word-break:keep-all}
.ph-out{margin-top:28px;height:56px;min-width:200px;padding:0 28px;border-radius:14px;border:1px solid ${LINE};background:#fff;color:${INK};font-size:17px;font-weight:600;cursor:pointer}
`;

const topic = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? "은" : "는"); };

export default function PhoneHandoff({ url, name, onExit }) {
  return (
    <div className="ph">
      <style>{CSS}</style>
      <div className="ph-qr"><Qr text={url} size={240} /></div>
      <h2>{topic(name)}<br />휴대폰에서 열어 주세요</h2>
      <p>이 화면은 3D 를 지원하지 않아요.<br />휴대폰 카메라로 QR 을 찍으면 바로 열려요.</p>
      {onExit && <button type="button" className="ph-out" onClick={onExit}>나가기</button>}
    </div>
  );
}
