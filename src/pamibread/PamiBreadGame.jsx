import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { INK, SUB, LINE, SOFT, MINT } from "../ui.jsx";
import { stampsFor, STAMP_MAX, STAMP_EVERY } from "./cut.js";
import pamiHi from "./pami-hi.webp";
import pamiPeek from "./pami-peek.webp";

/* 파미빵 타이쿤 — 화면을 눌러 파미빵을 높이 쌓는 한 판 게임. 3D 엔진(three.js)은 이 화면을 열 때만 받아 온다.
 * 5층마다 스탬프 하나(최대 5). 스탬프는 직원이 봉투 겉에 찍는다 — 키오스크는 개수만 보여 준다. */
const CSS = `
.pb-stage{position:relative;min-height:440px;overflow:hidden;background:linear-gradient(180deg,#0B2C31 0%,#124A4E 55%,#1C5F5F 100%)}
.pb-hud{z-index:2;position:absolute;left:0;right:0;top:18px;text-align:center;pointer-events:none;color:#fff}
.pb-hud b{display:block;font-size:64px;font-weight:600;line-height:1;text-shadow:0 4px 18px rgba(0,0,0,.25)}
.pb-hud span{display:block;margin-top:8px;font-size:15px;opacity:.85}
.pb-pop{z-index:2;position:absolute;left:0;right:0;top:132px;text-align:center;font-size:28px;text-shadow:0 2px 12px rgba(0,0,0,.3);font-weight:600;color:#A7E4DD;pointer-events:none;animation:pbPop .7s ease-out forwards}
@keyframes pbPop{0%{transform:scale(.6);opacity:0}25%{transform:scale(1.15);opacity:1}100%{transform:translateY(-24px);opacity:0}}
.pb-peek{z-index:2;position:absolute;right:-16px;bottom:-6px;width:92px!important;max-width:none!important;height:auto;pointer-events:none;transition:transform .25s}
.pb-peek.cheer{animation:pbCheer .5s ease-out}
@keyframes pbCheer{0%{transform:translateY(0)}40%{transform:translateY(-22px) rotate(-6deg)}100%{transform:translateY(0)}}
.pb-card{z-index:3;position:absolute;left:20px;right:20px;bottom:20px;background:#fff;border-radius:20px;padding:22px 20px 20px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.25)}
.pb-card .pb-pami{display:block;width:84px!important;max-width:none!important;height:auto;margin:-72px auto 6px}
.pb-card h2{margin:0;font-size:24px;font-weight:600;color:${INK}}
.pb-card p{margin:8px 0 0;font-size:15px;line-height:1.6;color:${SUB};word-break:keep-all}
.pb-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
.pb-btn{flex:1;height:56px;border-radius:14px;font-size:17px;font-weight:600;cursor:pointer;border:1px solid ${LINE};background:#fff;color:${INK}}
.pb-btn.main{border:none;background:${MINT};color:#fff}
.pb-stamps{display:flex;gap:8px;justify-content:center;margin:16px 0 4px}
.pb-stamps i{width:40px;height:40px;border-radius:50%;background:${SOFT};border:2px solid ${LINE}}
.pb-stamps i.on{background:${MINT};border-color:${MINT}}
`;

export default function PamiBreadGame({ onExit }) {
  const stageRef = useRef(null);
  const engRef = useRef(null);
  const [phase, setPhase] = useState("ready");   // ready | play | over | fail
  const [score, setScore] = useState(0);
  const [pop, setPop] = useState(null);
  const [cheer, setCheer] = useState(0);
  const [stageH, setStageH] = useState(640);

  /* 화면 높이 맞춤 — 키오스크는 폭에 맞춘 zoom 이 걸려 있어 vh 를 쓰지 않는다(App.jsx 껍데기 주석). 아래 탭 줄 64 를 뺀다 */
  useLayoutEffect(() => {
    const fit = () => {
      const el = stageRef.current; if (!el) return;
      const z = parseFloat(document.documentElement.style.zoom) || 1;
      const top = el.getBoundingClientRect().top;
      setStageH(Math.max(440, Math.round((window.innerHeight - top) / z - 64)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let alive = true;
    import("./stackEngine.js").then(({ PamiStack }) => {
      if (!alive || !stageRef.current) return;
      try {
        engRef.current = new PamiStack(stageRef.current, {
          onScore: (n) => setScore(n),
          onPerfect: (c) => { setPop({ c, k: Date.now() }); setCheer((x) => x + 1); },
          onOver: (n) => { setScore(n); setPhase("over"); },
        });
      } catch {
        setPhase("fail");
      }
    }).catch(() => alive && setPhase("fail"));
    return () => { alive = false; engRef.current?.dispose(); engRef.current = null; };
  }, []);

  const start = () => { setScore(0); setPop(null); setPhase("play"); engRef.current?.start(); };
  const stamps = stampsFor(score);

  return (
    <div>
      <style>{CSS}</style>
      <div className="pb-stage" ref={stageRef} style={{ height: stageH }}>
        {phase === "play" && (
          <div className="pb-hud">
            <b>{score}</b>
            <span>스탬프 {stamps} / {STAMP_MAX}, {STAMP_EVERY}층마다 하나</span>
          </div>
        )}
        {phase === "play" && pop && <div key={pop.k} className="pb-pop">{pop.c > 1 ? `퍼펙트 ${pop.c}연속` : "퍼펙트"}</div>}
        {phase === "play" && <img key={cheer} className={"pb-peek" + (cheer ? " cheer" : "")} src={pamiPeek} alt="" />}

        {phase === "ready" && (
          <div className="pb-card">
            <img className="pb-pami" src={pamiHi} alt="" />
            <h2>파미빵 타이쿤</h2>
            <p>움직이는 파미빵이 아래 빵과 겹칠 때 화면을 누르세요.<br />어긋난 만큼 잘려요. {STAMP_EVERY}층마다 스탬프 하나!</p>
            <div className="pb-btns"><button type="button" className="pb-btn main" onClick={start}>시작하기</button></div>
          </div>
        )}

        {phase === "over" && (
          <div className="pb-card">
            <img className="pb-pami" src={pamiHi} alt="" />
            <h2>{score}층 쌓았어요</h2>
            <div className="pb-stamps" aria-label={`스탬프 ${stamps}개`}>
              {Array.from({ length: STAMP_MAX }, (_, i) => <i key={i} className={i < stamps ? "on" : ""} />)}
            </div>
            <p>{stamps > 0 ? "이 화면을 직원에게 보여 주세요. 봉투 겉에 스탬프를 찍어 드려요." : `${STAMP_EVERY}층부터 스탬프를 받을 수 있어요. 한 번 더 해 볼까요?`}</p>
            <div className="pb-btns">
              <button type="button" className="pb-btn" onClick={onExit}>나가기</button>
              <button type="button" className="pb-btn main" onClick={start}>다시 하기</button>
            </div>
          </div>
        )}

        {phase === "fail" && (
          <div className="pb-card">
            <h2>이 기기에서는 게임을 열 수 없어요</h2>
            <p>3D 그리기를 지원하지 않는 화면이에요.</p>
            <div className="pb-btns"><button type="button" className="pb-btn" onClick={onExit}>나가기</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
