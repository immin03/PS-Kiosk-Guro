import tycoonCover from "./tycoon.webp";
import pamitopCover from "./pamitop.webp";

/* 아케이드 — 키오스크 게임 모음(2026-11-26 사용자 「아케이드로 하나로 묶어 더보기에」).
 * 게임이 눈에 띄게 큰 표지 카드(같은 날 「저런 버튼보다 더 게임이 어필되어야지 카드 더 키워」): 실제 게임 화면을 표지로,
 * 표지 아래 짙은 띠에 이름 · 설명, 오른쪽 「플레이」(글씨가 표지를 가리지 않게). 카드 전체를 눌러도 시작. 게임은 한국어 전용이라 문구도 한국어만. */
const GAMES = [
  { page: "pamibread", cover: tycoonCover, title: "파미빵 타이쿤", sub: "60초 동안 파미빵을 구워 팔아요", tag: "3개 팔 때마다 스탬프" },
  { page: "pamitop", cover: pamitopCover, title: "파미탑", sub: "파미를 딱 맞춰 높이 쌓아요", tag: "5층마다 스탬프" },
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
.ac-play{flex:none;height:48px;padding:0 22px;border-radius:24px;background:#01C0A4;color:#fff;font-size:17px;font-weight:600;display:flex;align-items:center;gap:6px}
`;

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
    </div>
  );
}
