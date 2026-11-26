import tycoonCover from "./tycoon.webp";
import pamitopCover from "./pamitop.webp";
import { useEffect, useState } from "react";
import { STORE } from "../store.js";
import { fetchRank, scoreText, GAME_NAME } from "./rank.js";

/* 아케이드 — 키오스크 게임 모음(2026-11-26 사용자 「아케이드로 하나로 묶어 더보기에」).
 * 게임이 눈에 띄게 큰 표지 카드(같은 날 「저런 버튼보다 더 게임이 어필되어야지 카드 더 키워」): 실제 게임 화면을 표지로,
 * 표지 아래 짙은 띠에 이름 · 설명, 오른쪽 「플레이」(글씨가 표지를 가리지 않게). 카드 전체를 눌러도 시작. 게임은 한국어 전용이라 문구도 한국어만. */
const GAMES = [
  { page: "pamibread", game: "tycoon", cover: tycoonCover, title: "파미빵 타이쿤", sub: "60초 동안 파미빵을 구워 팔아요", tag: "매출 5,000원마다 스탬프" },
  { page: "pamitop", game: "pamitop", cover: pamitopCover, title: "파미탑", sub: "파미를 딱 맞춰 높이 쌓아요", tag: "5층마다 스탬프" },
];

const CSS = `
.ac-list{padding:16px 20px 28px;display:flex;flex-direction:column;gap:16px}
.ac-card{position:relative;display:block;width:100%;padding:0;border:none;border-radius:16px;overflow:hidden;cursor:pointer;background:#1B2A33;text-align:left;box-shadow:0 8px 24px rgba(45,55,61,.18);transition:transform .15s}
.ac-card:active{transform:scale(.98)}
.ac-card img{display:block;width:100%;aspect-ratio:720/567;object-fit:cover}
.ac-body{display:flex;align-items:center;gap:12px;padding:14px 16px 16px;background:#1B2A33;color:#fff}
.ac-text{flex:1;min-width:0}
.ac-tag{position:absolute;left:14px;top:14px;padding:4px 10px;border-radius:12px;background:rgba(15,22,28,.6);color:#fff;font-size:13px;font-weight:600}
.ac-title{display:block;font-size:24px;font-weight:600;line-height:1.3}
.ac-sub{display:block;margin-top:2px;font-size:14px;line-height:1.45;opacity:.85;word-break:keep-all}
.ac-rank{margin-top:8px;padding:18px 16px 8px;border-radius:16px;background:#fff;border:1px solid #E3E8E8}
.ac-rank h3{margin:0;font-size:18px;font-weight:600;color:#2D373D}
.ac-rank small{display:block;margin-top:2px;font-size:14px;color:#5E6A70}
.ac-chips{display:flex;gap:8px;margin:14px 0 6px}
.ac-chip{height:40px;padding:0 16px;border-radius:20px;border:1px solid #D5DDDD;background:#fff;color:#2D373D;font-size:15px;font-weight:500;cursor:pointer}
.ac-chip.on{background:#2D373D;border-color:#2D373D;color:#fff}
.ac-row{display:flex;align-items:center;gap:12px;height:44px;border-top:1px solid #EEF1F1;font-size:15px;color:#2D373D}
.ac-row:first-of-type{border-top:none}
.ac-no{width:24px;text-align:center;font-weight:600}
.ac-nick{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-mem{margin-left:6px;padding:1px 7px;border-radius:9px;background:#E0F5F1;color:#00806D;font-size:12px;font-weight:600}
.ac-score{font-weight:600}
.ac-empty{padding:16px 0 12px;font-size:15px;color:#5E6A70;word-break:keep-all}
.ac-play{flex:none;height:48px;padding:0 22px;border-radius:24px;background:#01C0A4;color:#fff;font-size:17px;font-weight:600;display:flex;align-items:center;gap:6px}
`;

function RankBoard() {
  const [game, setGame] = useState(GAMES[0].game);
  const [rows, setRows] = useState(undefined);   // undefined 읽는 중 · null 못 읽음 · [] 비었음
  useEffect(() => {
    let alive = true;
    setRows(undefined);
    fetchRank(STORE, game).then((r) => { if (alive) setRows(r); });
    return () => { alive = false; };
  }, [game]);
  return (
    <section className="ac-rank" aria-label="이번 주 랭킹">
      <h3>이번 주 랭킹</h3>
      <small>게임이 끝나면 QR 로 내 기록에 저장해요. 월요일마다 새로 시작해요.</small>
      <div className="ac-chips">
        {GAMES.map((g) => <button key={g.game} type="button" className={"ac-chip" + (g.game === game ? " on" : "")} onClick={() => setGame(g.game)}>{GAME_NAME[g.game]}</button>)}
      </div>
      {rows === undefined ? <div className="ac-empty">불러오는 중</div>
        : rows === null ? <div className="ac-empty">지금은 랭킹을 불러올 수 없어요.</div>
        : rows.length === 0 ? <div className="ac-empty">아직 이번 주 기록이 없어요. 첫 1등이 되어 보세요!</div>
        : rows.map((r, i) => (
          <div key={i} className="ac-row">
            <span className="ac-no">{i + 1}</span>
            <span className="ac-nick">{r.nick}{r.member && <span className="ac-mem">회원</span>}</span>
            <span className="ac-score">{scoreText(game, r.score)}</span>
          </div>
        ))}
    </section>
  );
}

export default function Arcade({ onOpen }) {
  return (
    <div className="ac-list">
      <style>{CSS}</style>
      {GAMES.map((g) => (
        <button key={g.page} type="button" className="ac-card" aria-label={`${g.title} 시작`} onClick={() => onOpen(g.page)}>
          <img src={g.cover} alt="" />
          <span className="ac-tag">{g.tag}</span>
          <span className="ac-body">
            <span className="ac-text">
              <span className="ac-title">{g.title}</span>
              <span className="ac-sub">{g.sub}</span>
            </span>
            <span className="ac-play" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.8v10.4L12 7z" fill="#fff" /></svg>플레이
            </span>
          </span>
        </button>
      ))}
      <RankBoard />
    </div>
  );
}
