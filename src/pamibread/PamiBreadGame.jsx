import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { INK, SUB, LINE, SOFT, MINT } from "../ui.jsx";
import { createGame, setFilling, serve, trayCount, stampsFor, FILLINGS, STAMP_MAX, STAMP_EVERY, TRAY_MAX, ROUND } from "./tycoon.js";
import pamiHi from "../pamitop/pami-hi.webp";

/* 파미빵 타이쿤 — 60초 동안 파미 얼굴 틀에 빵을 구워 손님에게 파는 게임. 3D 굽기판(three.js)은 이 화면을 열 때만 받아 온다.
 * 판 개수 3개마다 스탬프 하나(최대 5). 스탬프는 직원이 봉투 겉에 찍는다 — 키오스크는 개수만 보여 준다. */
const LOOKS = [["#F6C9A8", "#E2574C"], ["#F3D2B5", "#2D373D"], ["#EBC09E", "#01C0A4"], ["#F7D7BE", "#F2A93B"]];
const FILL_DOT = { 팥: "#5B2A1E", 슈크림: "#F2CF6B" };
const won = (n) => n.toLocaleString("ko-KR") + "원";

const CSS = `
.pt-stage{position:relative;overflow:hidden;display:flex;flex-direction:column;background:linear-gradient(180deg,#152A3A 0%,#24384A 32%,#3A2E2A 62%,#2A211D 100%);user-select:none;-webkit-user-select:none}
.pt-lights{position:absolute;left:0;right:0;top:58px;height:20px;pointer-events:none;background:radial-gradient(circle,#FFE3A3 0 3px,rgba(255,200,110,.35) 4px,transparent 9px) 0 0/34px 20px repeat-x;opacity:.9}
.pt-top{position:relative;z-index:2;display:flex;align-items:center;gap:12px;height:60px;padding:0 18px;color:#fff}
.pt-time{font-size:30px;font-weight:600;min-width:56px}
.pt-time.low{color:#FF8A6B}
.pt-bar{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden}
.pt-bar i{display:block;height:100%;background:#fff;border-radius:4px}
.pt-money{font-size:17px;font-weight:600;text-align:right;min-width:92px}
.pt-guests{position:relative;z-index:2;height:176px;display:flex;gap:10px;padding:18px 14px 0;align-items:flex-start}
.pt-guest{flex:1;max-width:33.3%;display:flex;flex-direction:column;align-items:center;cursor:pointer;animation:ptIn .35s ease-out}
@keyframes ptIn{0%{transform:translateY(24px);opacity:0}100%{transform:none;opacity:1}}
.pt-guest.shake{animation:ptShake .35s}
@keyframes ptShake{25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
.pt-bubble{position:relative;background:#fff;border-radius:14px;padding:8px 10px;min-height:44px;display:flex;flex-wrap:wrap;gap:4px 8px;justify-content:center;align-items:center;box-shadow:0 6px 18px rgba(0,0,0,.25)}
.pt-bubble:after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-7px;border:7px solid transparent;border-bottom:0;border-top-color:#fff}
.pt-bubble.ok{outline:3px solid ${MINT}}
.pt-ord{display:flex;align-items:center;gap:4px;font-size:15px;font-weight:600;color:${INK};white-space:nowrap}
.pt-face{width:62px;height:62px;border-radius:50%;margin-top:12px;position:relative;box-shadow:inset 0 -6px 0 rgba(0,0,0,.08)}
.pt-face:before,.pt-face:after{content:"";position:absolute;top:26px;width:7px;height:9px;border-radius:50%;background:#2D373D}
.pt-face:before{left:19px}.pt-face:after{right:19px}
.pt-face b{position:absolute;left:6px;right:6px;top:-6px;height:20px;border-radius:12px 12px 4px 4px}
.pt-face.mad:before,.pt-face.mad:after{height:4px;top:28px;border-radius:2px}
.pt-pat{width:70px;height:6px;border-radius:3px;background:rgba(255,255,255,.18);margin-top:8px;overflow:hidden}
.pt-pat i{display:block;height:100%;border-radius:3px}
.pt-pay{position:absolute;z-index:4;left:0;right:0;text-align:center;font-size:24px;font-weight:600;color:#A7E4DD;text-shadow:0 2px 10px rgba(0,0,0,.4);pointer-events:none;animation:ptPay .9s ease-out forwards}
@keyframes ptPay{0%{transform:translateY(10px) scale(.7);opacity:0}25%{transform:scale(1.1);opacity:1}100%{transform:translateY(-30px);opacity:0}}
.pt-grill{position:relative;flex:1;min-height:240px}
.pt-toast{position:absolute;z-index:3;left:50%;top:10px;transform:translateX(-50%);background:rgba(20,20,20,.75);color:#fff;font-size:15px;padding:8px 14px;border-radius:20px;white-space:nowrap;pointer-events:none;animation:ptFade 1.1s forwards}
@keyframes ptFade{0%,70%{opacity:1}100%{opacity:0}}
.pt-bottom{position:relative;z-index:2;display:flex;align-items:center;gap:10px;height:92px;padding:0 14px 6px;background:rgba(0,0,0,.28)}
.pt-chip{height:56px;padding:0 16px;border-radius:14px;border:2px solid rgba(255,255,255,.25);background:transparent;color:#fff;font-size:17px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer}
.pt-chip.on{background:#fff;color:${INK};border-color:#fff}
.pt-dot{width:14px;height:14px;border-radius:50%;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.6)}
.pt-tray{flex:1;display:flex;flex-direction:column;align-items:flex-end;gap:4px;color:#fff}
.pt-tray small{font-size:12px;opacity:.7}
.pt-tray div{display:flex;gap:10px;font-size:17px;font-weight:600}
.pt-bread{display:inline-block;position:relative;width:24px;height:19px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#FAD99A,#D9984D);vertical-align:middle}
.pt-bread:before,.pt-bread:after{content:"";position:absolute;top:-4px;width:10px;height:10px;border-radius:50%;background:#E3A85C}
.pt-bread:before{left:0}.pt-bread:after{right:0}
.pt-card{z-index:5;position:absolute;left:20px;right:20px;bottom:24px;background:#fff;border-radius:20px;padding:22px 20px 20px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3)}
.pt-card .pt-pami{display:block;width:84px!important;max-width:none!important;height:auto;margin:-72px auto 6px}
.pt-card h2{margin:0;font-size:24px;font-weight:600;color:${INK}}
.pt-card p{margin:8px 0 0;font-size:15px;line-height:1.6;color:${SUB};word-break:keep-all}
.pt-steps{margin:14px 0 0;padding:0;list-style:none;text-align:left;display:flex;flex-direction:column;gap:8px}
.pt-steps li{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45;color:${INK};word-break:keep-all}
.pt-steps b{flex:none;width:24px;height:24px;border-radius:50%;background:${SOFT};font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center}
.pt-sum{display:flex;justify-content:center;gap:28px;margin:14px 0 2px}
.pt-sum div{display:flex;flex-direction:column;gap:2px}
.pt-sum span{font-size:13px;color:${SUB}}
.pt-sum strong{font-size:22px;font-weight:600;color:${INK}}
.pt-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
.pt-btn{flex:1;height:56px;border-radius:14px;font-size:17px;font-weight:600;cursor:pointer;border:1px solid ${LINE};background:#fff;color:${INK}}
.pt-btn.main{border:none;background:${MINT};color:#fff}
.pt-stamps{display:flex;gap:8px;justify-content:center;margin:14px 0 4px}
.pt-stamps i{width:40px;height:40px;border-radius:50%;background:${SOFT};border:2px solid ${LINE}}
.pt-stamps i.on{background:${MINT};border-color:${MINT}}
`;

const TOAST = { wait: "아직 덜 익었어요", full: "쟁반이 꽉 찼어요. 손님에게 먼저 건네요", short: "쟁반에 빵이 모자라요", burn: "앗, 탔어요! 눌러서 버려요", leave: "손님이 기다리다 갔어요" };

export default function PamiBreadGame({ onExit }) {
  const stageRef = useRef(null);
  const grillRef = useRef(null);
  const engRef = useRef(null);
  const gameRef = useRef(null);
  const [phase, setPhase] = useState("ready");   // ready | play | over | fail
  const [, setTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [pays, setPays] = useState([]);
  const [shake, setShake] = useState(null);
  const [stageH, setStageH] = useState(720);

  /* 화면 높이 맞춤 — 키오스크는 폭에 맞춘 zoom 이 걸려 있어 vh 를 쓰지 않는다(App.jsx 껍데기 주석). 아래 탭 줄 64 를 뺀다 */
  useLayoutEffect(() => {
    const fit = () => {
      const el = stageRef.current; if (!el) return;
      const z = parseFloat(document.documentElement.style.zoom) || 1;
      const top = el.getBoundingClientRect().top;
      setStageH(Math.max(560, Math.round((window.innerHeight - top) / z - 64)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let alive = true, frame = 0;
    const onEvents = (evs) => {
      for (const e of evs) {
        if (TOAST[e.type]) setToast({ text: TOAST[e.type], k: Date.now() + Math.random() });
        if (e.type === "short") setShake({ id: e.id, k: Date.now() });
        if (e.type === "serve") setPays((p) => [...p.slice(-3), { id: e.id, pay: e.pay, k: Date.now() + Math.random() }]);
        if (e.type === "over") setTimeout(() => alive && setPhase("over"), 600);
      }
      setTick((x) => x + 1);
    };
    import("./grillEngine.js").then(({ PamiGrill }) => {
      if (!alive || !grillRef.current) return;
      try {
        const eng = new PamiGrill(grillRef.current, { onEvents });
        const base = eng.update.bind(eng);
        eng.update = (dt) => { base(dt); if (++frame % 6 === 0) setTick((x) => x + 1); };   // 시간 · 인내심 막대는 1초에 10번만 다시 그림
        engRef.current = eng;
        eng.setGame(createGame(1));
        eng.running = false;
      } catch {
        setPhase("fail");
      }
    }).catch(() => alive && setPhase("fail"));
    return () => { alive = false; engRef.current?.dispose(); engRef.current = null; };
  }, []);

  const start = () => {
    const g = createGame((Date.now() % 100000) + 1);
    gameRef.current = g;
    setPays([]); setToast(null);
    engRef.current?.setGame(g);
    setPhase("play");
  };

  const g = gameRef.current;
  const playing = phase === "play" && g;
  const stamps = g ? stampsFor(g.sold) : 0;
  const pick = (f) => { if (g) { setFilling(g, f); setTick((x) => x + 1); } };

  return (
    <div>
      <style>{CSS}</style>
      <div className="pt-stage" ref={stageRef} style={{ height: stageH }}>
        <div className="pt-lights" />
        <div className="pt-top">
          <span className={"pt-time" + (g && g.left < 10 && phase === "play" ? " low" : "")}>{g ? Math.ceil(g.left) : ROUND}</span>
          <span className="pt-bar"><i style={{ width: `${g ? (g.left / ROUND) * 100 : 100}%` }} /></span>
          <span className="pt-money">{won(g ? g.money : 0)}</span>
        </div>

        <div className="pt-guests">
          {playing && g.customers.map((cu) => {
            const ok = FILLINGS.every((f) => trayCount(g, f) >= cu.order[f]);
            const left = cu.patience / cu.max;
            const [skin, hat] = LOOKS[cu.look];
            return (
              <div key={cu.id + (shake?.id === cu.id ? "-" + shake.k : "")} className={"pt-guest" + (shake?.id === cu.id ? " shake" : "")}
                onPointerDown={(e) => { e.preventDefault(); serve(g, cu.id); }} role="button" aria-label={`손님 ${cu.id} 에게 건네기`}>
                <div className={"pt-bubble" + (ok ? " ok" : "")}>
                  {FILLINGS.filter((f) => cu.order[f] > 0).map((f) => (
                    <span key={f} className="pt-ord"><i className="pt-dot" style={{ background: FILL_DOT[f], boxShadow: "none" }} />{f} {cu.order[f]}</span>
                  ))}
                </div>
                <div className={"pt-face" + (left < 0.3 ? " mad" : "")} style={{ background: skin }}><b style={{ background: hat }} /></div>
                <div className="pt-pat"><i style={{ width: `${left * 100}%`, background: left < 0.3 ? "#FF7A5C" : left < 0.6 ? "#F2CF6B" : "#A7E4DD" }} /></div>
              </div>
            );
          })}
          {pays.map((p) => <div key={p.k} className="pt-pay" style={{ top: 40 }}>+{won(p.pay)}</div>)}
        </div>

        <div className="pt-grill" ref={grillRef}>
          {toast && phase === "play" && <div key={toast.k} className="pt-toast">{toast.text}</div>}
        </div>

        <div className="pt-bottom">
          {FILLINGS.map((f) => (
            <button key={f} type="button" className={"pt-chip" + ((g ? g.filling : "팥") === f ? " on" : "")} onPointerDown={(e) => { e.preventDefault(); pick(f); }}>
              <i className="pt-dot" style={{ background: FILL_DOT[f] }} />{f}
            </button>
          ))}
          <div className="pt-tray">
            <small>쟁반 {g ? g.tray.length : 0} / {TRAY_MAX}</small>
            <div>{FILLINGS.map((f) => <span key={f}><i className="pt-bread" /> {f} {g ? trayCount(g, f) : 0}</span>)}</div>
          </div>
        </div>

        {phase === "ready" && (
          <div className="pt-card">
            <img className="pt-pami" src={pamiHi} alt="" />
            <h2>파미빵 타이쿤</h2>
            <p>{ROUND}초 동안 파미빵을 구워 팔아요. {STAMP_EVERY}개 팔 때마다 스탬프 하나!</p>
            <ol className="pt-steps">
              <li><b>1</b>속(팥, 슈크림)을 고르고 빈 틀을 눌러 반죽을 부어요</li>
              <li><b>2</b>테두리가 민트로 빛나면 눌러서 뒤집어요</li>
              <li><b>3</b>한 번 더 민트일 때 눌러 쟁반에 담아요</li>
              <li><b>4</b>주문만큼 담기면 손님을 눌러 건네요</li>
            </ol>
            <div className="pt-btns"><button type="button" className="pt-btn main" onClick={start}>시작하기</button></div>
          </div>
        )}

        {phase === "over" && g && (
          <div className="pt-card">
            <img className="pt-pami" src={pamiHi} alt="" />
            <h2>{g.sold}개 팔았어요</h2>
            <div className="pt-sum">
              <div><span>매출</span><strong>{won(g.money)}</strong></div>
              <div><span>잘 구운 빵</span><strong>{g.perfectSold}개</strong></div>
            </div>
            <div className="pt-stamps" aria-label={`스탬프 ${stamps}개`}>
              {Array.from({ length: STAMP_MAX }, (_, i) => <i key={i} className={i < stamps ? "on" : ""} />)}
            </div>
            <p>{stamps > 0 ? "이 화면을 직원에게 보여 주세요. 봉투 겉에 스탬프를 찍어 드려요." : `${STAMP_EVERY}개부터 스탬프를 받을 수 있어요. 한 번 더 해 볼까요?`}</p>
            <div className="pt-btns">
              <button type="button" className="pt-btn" onClick={onExit}>나가기</button>
              <button type="button" className="pt-btn main" onClick={start}>다시 하기</button>
            </div>
          </div>
        )}

        {phase === "fail" && (
          <div className="pt-card">
            <h2>이 기기에서는 게임을 열 수 없어요</h2>
            <p>3D 그리기를 지원하지 않는 화면이에요.</p>
            <div className="pt-btns"><button type="button" className="pt-btn" onClick={onExit}>나가기</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
