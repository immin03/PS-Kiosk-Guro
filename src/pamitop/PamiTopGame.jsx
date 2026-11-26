import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { INK, SUB, LINE, SOFT, MINT } from "../ui.jsx";
import { stampsFor, STAMP_MAX, STAMP_EVERY, SHIELD_AFTER, SPEED_EVERY, RANDOM_DIR_AT } from "./cut.js";
import pamiHi from "./pami-hi.webp";
import pamiPeek from "./pami-peek.webp";
import ScoreSave from "../arcade/ScoreSave.jsx";

/* 파미탑 — 화면을 눌러 하얀 파미 얼굴을 높이 쌓는 한 판 게임. 3D 엔진(three.js)은 이 화면을 열 때만 받아 온다.
 * 5층마다 스탬프 하나(최대 5). 스탬프는 직원이 봉투 겉에 찍는다 — 키오스크는 개수만 보여 준다.
 * 점수 = 층 수 + 퍼펙트 연속 보너스. 퍼펙트 5연속이면 실드(한 번 놓쳐도 이어감). 규칙은 docs/arcade-rules.md */
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
.pb-dim{position:absolute;inset:0;z-index:3;background:rgba(6,24,28,.5)}
.pb-card{z-index:4;position:absolute;left:20px;right:20px;bottom:20px;background:#fff;border-radius:20px;padding:22px 20px 20px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.25)}
.pb-card .pb-pami{display:block;width:84px!important;max-width:none!important;height:auto;margin:-72px auto 6px}
.pb-card h2{margin:0;font-size:24px;font-weight:600;color:${INK}}
.pb-card p{margin:8px 0 0;font-size:15px;line-height:1.6;color:${SUB};word-break:keep-all}
.pb-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
.pb-btn{flex:1;height:56px;border-radius:14px;font-size:17px;font-weight:600;cursor:pointer;border:1px solid ${LINE};background:#fff;color:${INK}}
.pb-btn.main{border:none;background:${MINT};color:#fff}
.pb-stamps{display:flex;gap:8px;justify-content:center;margin:16px 0 4px}
.pb-stamps i{width:40px;height:40px;border-radius:50%;background:${SOFT};border:2px solid ${LINE}}
.pb-stamps i.on{background:${MINT};border-color:${MINT}}
.pb-shield{z-index:2;position:absolute;left:16px;top:18px;display:flex;align-items:center;gap:6px;padding:6px 12px 6px 8px;border-radius:16px;background:rgba(255,255,255,.14);color:#fff;font-size:14px;font-weight:600;pointer-events:none}
.pb-shield.off{opacity:.45}
.pb-sum{display:flex;justify-content:center;gap:28px;margin:12px 0 2px}
.pb-sum div{display:flex;flex-direction:column;gap:2px}
.pb-sum span{font-size:13px;color:${SUB}}
.pb-sum strong{font-size:22px;font-weight:600;color:${INK}}
`;

export default function PamiTopGame({ onExit }) {
  const stageRef = useRef(null);
  const engRef = useRef(null);
  const [phase, setPhase] = useState("ready");   // ready | play | over | fail
  const [score, setScore] = useState(0);     // 층 수
  const [points, setPoints] = useState(0);   // 점수(층 + 퍼펙트 연속 보너스)
  const [shield, setShield] = useState(false);
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
          onScore: (n, p) => { setScore(n); setPoints(p); },
          onPerfect: (c) => { setPop({ text: c > 1 ? `퍼펙트 ${c}연속` : "퍼펙트", k: Date.now() }); setCheer((x) => x + 1); },
          onShield: (on, why) => {
            setShield(on);
            if (why === "got") setPop({ text: "실드 얻음!", k: Date.now() });
            if (why === "used") setPop({ text: "실드로 버텼어요", k: Date.now() });
          },
          onOver: (n, p) => { setScore(n); setPoints(p); setPhase("over"); },
        });
      } catch {
        setPhase("fail");
      }
    }).catch(() => alive && setPhase("fail"));
    return () => { alive = false; engRef.current?.dispose(); engRef.current = null; };
  }, []);

  const start = () => { setScore(0); setPoints(0); setShield(false); setPop(null); setPhase("play"); engRef.current?.start(); };
  const stamps = stampsFor(score);

  return (
    <div>
      <style>{CSS}</style>
      <div className="pb-stage" ref={stageRef} style={{ height: stageH }}>
        {phase === "play" && (
          <div className="pb-hud">
            <b>{score}</b>
            <span>점수 {points}, 스탬프 {stamps} / {STAMP_MAX}</span>
          </div>
        )}
        {phase === "play" && (
          <div className={"pb-shield" + (shield ? "" : " off")} aria-label={shield ? "실드 있음" : "실드 없음"}>
            <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true"><path d="M9 1 L17 4 V10 C17 14.5 13.5 17.8 9 19 C4.5 17.8 1 14.5 1 10 V4 Z" fill={shield ? "#A7E4DD" : "none"} stroke="#fff" strokeWidth="1.6" /></svg>
            실드
          </div>
        )}
        {phase === "play" && pop && <div key={pop.k} className="pb-pop">{pop.text}</div>}
        {phase === "play" && <img key={cheer} className={"pb-peek" + (cheer ? " cheer" : "")} src={pamiPeek} alt="" />}

        {phase !== "play" && <div className="pb-dim" />}   {/* 안내 카드 뒤 딤(2026-11-26 사용자 「뒤에 딤드 넣어」) */}
        {phase === "ready" && (
          <div className="pb-card">
            <img className="pb-pami" src={pamiHi} alt="" />
            <h2>파미탑</h2>
            <p>움직이는 파미가 아래 파미와 겹칠 때 화면을 누르세요.<br />어긋난 만큼 잘려요. {STAMP_EVERY}층마다 스탬프 하나!</p>
            <p>딱 맞추면 퍼펙트, 이어 맞출수록 점수가 더 붙어요. 퍼펙트 {SHIELD_AFTER}연속이면 실드로 한 번 버틸 수 있어요. {SPEED_EVERY}층마다 빨라지고 {RANDOM_DIR_AT}층부터는 어느 쪽에서 나올지 몰라요.</p>
            <div className="pb-btns"><button type="button" className="pb-btn main" onClick={start}>시작하기</button></div>
          </div>
        )}

        {phase === "over" && (
          <div className="pb-card">
            <img className="pb-pami" src={pamiHi} alt="" />
            <h2>{score}층 쌓았어요</h2>
            <div className="pb-sum">
              <div><span>점수</span><strong>{points}</strong></div>
              <div><span>층</span><strong>{score}</strong></div>
            </div>
            <div className="pb-stamps" aria-label={`스탬프 ${stamps}개`}>
              {Array.from({ length: STAMP_MAX }, (_, i) => <i key={i} className={i < stamps ? "on" : ""} />)}
            </div>
            <ScoreSave game="pamitop" score={points} detail={{ floors: score }} />
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
