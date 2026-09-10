import { useMemo, useRef, useEffect, useState } from "react";
import { GRID, MARKS, RACKS, RACK_BY_CODE } from "./rackLayout.js";
import { zoneLabel, markLabel, t } from "./i18n.js";
import { BRAND, ZONE_COLOR, ZONE_FALLBACK as FALLBACK, YOU_HERE as YOU } from "./theme.js";

/* 매장 지도.
 *
 * 좌표는 PS-OS catalog/racks.json 이 정본입니다(scripts/sync-racks.mjs 로 가져옵니다).
 * 예전 지도는 존마다 좌표가 하나뿐이라 A1 과 A30 이 같은 자리에 찍혔습니다.
 * 이제 랙 하나하나가 제 자리에 그려지고, 경로는 실제로 비어 있는 칸만 밟습니다.
 */

const MARK_FILL = "#E5E5E5";
const MARK_TEXT = "#2D373D";

/* 손님이 출발하는 자리. 키오스크가 놓인 곳이며 지도의 집기 이름과 같아야 합니다. */
export const ORIGIN_MARK = "엘리베이터 입구";

/* 길 안내에 이름을 댈 만한 집기. 앤드1~4 같은 내부 용어는 제외합니다. */
const WAYPOINT = /입구|계산|파마베스트|체험존|행사|음료/;

const zc = (zone) => ZONE_COLOR[zone] || FALLBACK;

/*
 * 존 블록 — 랙 85개를 덩어리로 묶습니다.
 *
 * 손으로 그린 예전 지도는 매장 구조가 한눈에 들어왔지만 좌표가 코드에 박혀 있어
 * 매대를 옮겨도 지도가 따라오지 않았습니다. 그래서 정본 좌표에서 직접 계산합니다.
 * 랙 코드의 앞 글자로 나누고, 같은 글자라도 멀리 떨어져 있으면 (D 는 오른쪽 기둥과
 * 아래 줄로 나뉩니다) 따로 묶습니다.
 */
const BLOCK_GAP = 10;

/* 랙은 도면처럼 그립니다. 7×3 칸이 6.4×2.6 으로 그려집니다.
   전에 긴 축을 0.12 만 들였더니 옆 칸과 선이 맞닿아 한 덩어리로 보였습니다.
   어느 방향이든 칸과 칸 사이가 최소 0.5 칸(125mm) 뜹니다. 여백을 넓히면
   그만큼 매대와 글자가 작아집니다 — 붙어 보이지 않을 만큼만 띄웁니다. */
const BAR_LONG = 0.25;
const BAR_SHORT = 0.15;

/* 매대는 네모난 집기입니다. 모서리를 굴리면 알약이 됩니다. */
const BAR_RADIUS = 0.25;

/* 집기 상자 안쪽 여백. 그림과 글자가 테두리에 붙지 않게 합니다. */
const MARK_PAD = 0.9;

/* 랙 이름을 칸 안에 앉힙니다.
 *
 * 「A1」 대신 「콘드로이친」이 읽혀야 손님이 지도만 보고 매대를 찾습니다.
 * 이름은 칸보다 길어서, 띄어쓰기와 가운뎃점에서 두 줄까지 나누고 남은 만큼
 * 글자를 줄입니다. 한글은 글자폭이 글자크기와 거의 같고 나머지는 그 절반으로
 * 잡습니다. */
const runWidth = (line) =>
  [...line].reduce((n, ch) => {
    if (/\s/.test(ch)) return n + 0.25;
    return n + (/[\u3131-\uD79D\u4E00-\u9FFF]/.test(ch) ? 0.88 : 0.5);
  }, 0);

function fitLabel(text, boxW, boxH) {
  /* 가운뎃점은 앞말에 붙여 둡니다. 떼어 놓으면 「단백질 / · 아미노산」 처럼
     둘째 줄이 점으로 시작합니다. */
  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .reduce((acc, w) => {
      if (w === "·" && acc.length) acc[acc.length - 1] += " ·";
      else acc.push(w);
      return acc;
    }, []);
  const candidates = [[text]];
  for (let i = 1; i < words.length; i += 1)
    candidates.push([words.slice(0, i).join(" "), words.slice(i).join(" ")]);

  let best = null;
  candidates.forEach((lines) => {
    const longest = Math.max(...lines.map(runWidth));
    const size = Math.min(boxW / longest, (boxH / lines.length) * 0.82, 2.2);
    if (!best || size > best.size) best = { lines, size };
  });
  return best;
}

function buildBlocks() {
  const byLetter = {};
  RACKS.forEach((r) => {
    const letter = r.code[0];
    (byLetter[letter] = byLetter[letter] || []).push(r);
  });

  const out = [];
  Object.entries(byLetter).forEach(([letter, list]) => {
    /* 가까이 붙은 랙끼리 잇습니다. 서로 BLOCK_GAP 칸 안에 있으면 같은 덩어리입니다. */
    const parent = list.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const near = (a, b) =>
      a.c - (b.c + b.w) <= BLOCK_GAP && b.c - (a.c + a.w) <= BLOCK_GAP &&
      a.r - (b.r + b.h) <= BLOCK_GAP && b.r - (a.r + a.h) <= BLOCK_GAP;
    for (let i = 0; i < list.length; i += 1)
      for (let j = i + 1; j < list.length; j += 1)
        if (near(list[i], list[j])) parent[find(i)] = find(j);

    const groups = {};
    list.forEach((r, i) => { (groups[find(i)] = groups[find(i)] || []).push(r); });

    /* 손님이 따로 찾아오는 구역은 이름을 따로 답니다. 펫이 그렇습니다.
       기준은 두 가지를 모두 만족할 때입니다 — 같은 구역 랙이 네 개 이상이고,
       코드 번호가 줄의 한쪽 끝에 몰려 있을 것. 한두 칸 섞인 자리(A10 뷰티,
       A25 식품·음료)는 떼지 않습니다. 매장 구역 전부로 쪼개면 블록이 여덟 개로
       늘고 이름이 서로 겹칩니다. */
    const SPLIT_MIN = 4;
    const parts = [];
    Object.values(groups).forEach((racks) => {
      const nums = racks.map((r) => Number(r.code.slice(1))).sort((a, b) => a - b);
      const byZone = {};
      racks.forEach((r) => { (byZone[r.zone] = byZone[r.zone] || []).push(r); });
      const main = Object.entries(byZone).sort((a, b) => b[1].length - a[1].length)[0][0];
      const rest = [];
      Object.entries(byZone).forEach(([zone, rs]) => {
        const ns = rs.map((r) => Number(r.code.slice(1))).sort((a, b) => a - b);
        const atEnd = ns[0] === nums[0] || ns[ns.length - 1] === nums[nums.length - 1];
        const solid = ns[ns.length - 1] - ns[0] + 1 <= ns.length + 1;
        if (zone !== main && rs.length >= SPLIT_MIN && atEnd && solid) parts.push(rs);
        else rest.push(...rs);
      });
      if (rest.length) parts.push(rest);
    });

    parts.forEach((racks) => {
      const nums = racks.map((r) => Number(r.code.slice(1))).sort((a, b) => a - b);
      const zones = {};
      racks.forEach((r) => { zones[r.zone] = (zones[r.zone] || 0) + 1; });
      const zone = Object.entries(zones).sort((a, b) => b[1] - a[1])[0][0];
      const cxs = racks.map((r) => r.c + r.w / 2);
      const cys = racks.map((r) => r.r + r.h / 2);
      out.push({
        /* 이름은 랙들의 한가운데에 얹습니다. ㄱ자 구역이라도 랙 위에 놓입니다. */
        lx: cxs.reduce((a, b) => a + b, 0) / cxs.length,
        ly: cys.reduce((a, b) => a + b, 0) / cys.length,
        id: `${letter}${nums[0]}`,
        letter,
        zone,
        racks,
        range: nums[0] === nums[nums.length - 1] ? `${letter}${nums[0]}` : `${letter}${nums[0]}–${letter}${nums[nums.length - 1]}`,
        c: Math.min(...racks.map((r) => r.c)),
        r: Math.min(...racks.map((r) => r.r)),
        w: Math.max(...racks.map((r) => r.c + r.w)) - Math.min(...racks.map((r) => r.c)),
        h: Math.max(...racks.map((r) => r.r + r.h)) - Math.min(...racks.map((r) => r.r)),
      });
    });
  });
  return out.sort((a, b) => b.racks.length - a.racks.length);
}

const BLOCKS = buildBlocks();

/* 매대와 집기가 실제로 놓인 범위 */
const BOUNDS = (() => {
  const all = [...RACKS, ...MARKS];
  const x = Math.min(...all.map((o) => o.c));
  const y = Math.min(...all.map((o) => o.r));
  return {
    x, y,
    w: Math.max(...all.map((o) => o.c + o.w)) - x,
    h: Math.max(...all.map((o) => o.r + o.h)) - y,
  };
})();

/* 랙마다 막대 비례와 이름 배치를 미리 계산해 둡니다. 정본이 바뀌지 않는 한
   그릴 때마다 다시 셀 이유가 없습니다. 세로로 선 매대는 이름도 세워 씁니다. */
const BAR = (() => {
  const rows = RACKS.map((r) => {
    const upright = r.h > r.w;
    const ix = upright ? BAR_SHORT : BAR_LONG;
    const iy = upright ? BAR_LONG : BAR_SHORT;
    const boxW = (upright ? r.h : r.w) - (upright ? iy : ix) * 2 - 0.3;
    const boxH = (upright ? r.w : r.h) - (upright ? ix : iy) * 2;
    return { code: r.code, upright, ix, iy, label: r.cat ? fitLabel(r.cat, boxW, boxH) : null };
  });

  /* 글자 크기는 한 값입니다. 칸마다 제 이름에 맞춰 키우면 「식품」만 크고
     「식이섬유 · 효소」는 작아져 지도가 들쭉날쭉해집니다. 가장 긴 이름이
     들어가는 크기에 전부를 맞춥니다. */
  const sizes = rows.filter((b) => b.label).map((b) => b.label.size);
  const common = Math.min(...sizes);

  rows.forEach((b) => {
    if (b.label) b.label = { ...b.label, size: common };
  });
  return Object.fromEntries(rows.map((b) => [b.code, b]));
})();

const cx = (o) => o.c + o.w / 2;
const cy = (o) => o.r + o.h / 2;

/* ── 통로 찾기 ──
 * 랙과 집기가 깔린 칸을 막고, 남은 칸으로만 너비우선탐색을 합니다.
 * 격자가 63x180 이라 매번 새로 풀어도 부담이 없습니다. */
function buildBlocked() {
  const { rows, cols } = GRID;
  const g = new Uint8Array(rows * cols);
  const put = (o) => {
    for (let r = o.r; r < o.r + o.h; r++) {
      for (let c = o.c; c < o.c + o.w; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) g[r * cols + c] = 1;
      }
    }
  };
  RACKS.forEach(put);
  MARKS.forEach(put);
  return g;
}

/* 막힌 칸 안이나 근처에서 가장 가까운 빈 칸을 찾습니다. */
function nearestFree(blocked, c0, r0) {
  const { rows, cols } = GRID;
  const free = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows && !blocked[r * cols + c];
  const c = Math.round(c0), r = Math.round(r0);
  if (free(c, r)) return [c, r];
  for (let d = 1; d < Math.max(rows, cols); d++) {
    for (let dc = -d; dc <= d; dc++) {
      for (const dr of [-d, d]) if (free(c + dc, r + dr)) return [c + dc, r + dr];
    }
    for (let dr = -d + 1; dr <= d - 1; dr++) {
      for (const dc of [-d, d]) if (free(c + dc, r + dr)) return [c + dc, r + dr];
    }
  }
  return null;
}

function simplify(pts) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], n = pts[i + 1];
    const straight = (a[0] === b[0] && b[0] === n[0]) || (a[1] === b[1] && b[1] === n[1]);
    if (!straight) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* 출발 집기 → 목표 랙에 붙은 빈 칸까지의 최단 경로. 없으면 null. */
function findRoute(originMark, target) {
  if (!originMark || !target) return null;
  const { rows, cols } = GRID;
  const blocked = buildBlocked();

  const start = nearestFree(blocked, cx(originMark), cy(originMark));
  if (!start) return null;

  const goal = new Uint8Array(rows * cols);
  let anyGoal = false;
  for (let r = target.r - 1; r <= target.r + target.h; r++) {
    for (let c = target.c - 1; c <= target.c + target.w; c++) {
      const inside = r >= target.r && r < target.r + target.h && c >= target.c && c < target.c + target.w;
      if (inside) continue;
      if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
      if (blocked[r * cols + c]) continue;
      goal[r * cols + c] = 1;
      anyGoal = true;
    }
  }
  if (!anyGoal) return null;

  const prev = new Int32Array(rows * cols).fill(-1);
  const seen = new Uint8Array(rows * cols);
  const queue = new Int32Array(rows * cols);
  let head = 0, tail = 0;
  const s = start[1] * cols + start[0];
  seen[s] = 1; queue[tail++] = s;
  let hit = -1;

  while (head < tail) {
    const cur = queue[head++];
    if (goal[cur]) { hit = cur; break; }
    const r = (cur / cols) | 0, c = cur % cols;
    if (c > 0) { const n = cur - 1; if (!seen[n] && !blocked[n]) { seen[n] = 1; prev[n] = cur; queue[tail++] = n; } }
    if (c < cols - 1) { const n = cur + 1; if (!seen[n] && !blocked[n]) { seen[n] = 1; prev[n] = cur; queue[tail++] = n; } }
    if (r > 0) { const n = cur - cols; if (!seen[n] && !blocked[n]) { seen[n] = 1; prev[n] = cur; queue[tail++] = n; } }
    if (r < rows - 1) { const n = cur + cols; if (!seen[n] && !blocked[n]) { seen[n] = 1; prev[n] = cur; queue[tail++] = n; } }
  }
  if (hit < 0) return null;

  const back = [];
  for (let n = hit; n !== -1; n = prev[n]) back.push([n % cols, (n / cols) | 0]);
  back.reverse();

  const pts = back.map(([c, r]) => [c + 0.5, r + 0.5]);
  pts.unshift([cx(originMark), cy(originMark)]);
  pts.push([cx(target), cy(target)]);
  return simplify(pts);
}

/* 경로가 지나는 집기를 순서대로 집어 안내 문구를 만듭니다.
 * 예전에는 존마다 "약 10m" 를 박아뒀는데, 축척 도면이 아니라 미터는 근거가 없습니다.
 * 대신 손님이 실제로 지나치는 지점을 알려줍니다. */
export function routeSteps(rackCode) {
  const target = RACK_BY_CODE[rackCode];
  const origin = MARKS.find((m) => m.kind === ORIGIN_MARK);
  if (!target) return null;
  const route = findRoute(origin, target);
  const passed = [];
  if (route) {
    /* 경로를 촘촘히 훑어 가까이 스치는 집기를 순서대로 모읍니다. */
    const seen = new Set();
    for (let i = 0; i < route.length - 1; i++) {
      const [c1, r1] = route[i], [c2, r2] = route[i + 1];
      const n = Math.max(Math.abs(c2 - c1), Math.abs(r2 - r1));
      for (let k = 0; k <= n; k++) {
        const c = c1 + ((c2 - c1) * k) / n, r = r1 + ((r2 - r1) * k) / n;
        for (const m of MARKS) {
          if (m.kind === ORIGIN_MARK || seen.has(m.kind)) continue;
          if (!WAYPOINT.test(m.kind)) continue;   /* 앤드매대는 손님이 모르는 이름이라 뺍니다 */
          const near =
            c >= m.c - 3 && c <= m.c + m.w + 3 && r >= m.r - 3 && r <= m.r + m.h + 3;
          if (near) { seen.add(m.kind); passed.push(m.kind); }
        }
      }
    }
  }
  return {
    origin: origin ? origin.kind : null,
    passed: passed.slice(0, 2),
    rack: target.code,
    cat: target.cat,
    zone: target.zone,
    reachable: !!route,
  };
}

export default function FloorPlan({
  lang = "ko",
  highlightZone,
  highlightRack,
  showPath = false,
  detail = "all",       // "all" 모든 랙에 코드 표시 · "target" 목표와 주변만
  heading,              // 머리글 줄 왼쪽에 적을 말. 없으면 버튼만 놓입니다.
  onRackClick,
  minWidth,
}) {
  /* 지도는 언제나 화면 폭에 맞춥니다. 가로로 밀어야 보이는 지도는 손님이
     자기가 무엇을 놓쳤는지 알 수 없습니다. */
  const wide = minWidth != null ? minWidth : 0;
  const { rows, cols } = GRID;
  /* 판매장 둘레 여백. 카드에 여백을 주는 대신 그릴 범위를 넓혀 지도를
     한 뼘 작게 그립니다 — 카드 여백은 지도를 잘라 내지만 이쪽은 지도가
     통째로 줄어 매대가 테두리에 닿지 않습니다. */
  const pad = 2;
  const target = highlightRack ? RACK_BY_CODE[highlightRack] : null;
  const origin = useMemo(() => MARKS.find((m) => m.kind === ORIGIN_MARK), []);
  const route = useMemo(
    () => (showPath && target ? findRoute(origin, target) : null),
    [showPath, target, origin]
  );

  /* 좁은 화면에서는 지도가 가로로 넘칩니다. 목표 랙이 보이도록 스스로 밀어줍니다. */
  const scroller = useRef(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !target) return;
    const full = el.scrollWidth;
    const want = ((target.c + target.w / 2 - FULL.x) / FULL.w) * full - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, want), behavior: "smooth" });
  }, [target, cols]);

  /* 목표 주변 랙만 코드를 적을 때 쓰는 판정 */
  const near = (r) => {
    if (!target) return false;
    return (
      r.c < target.c + target.w + 14 && r.c + r.w > target.c - 14 &&
      r.r < target.r + target.h + 10 && r.r + r.h > target.r - 10
    );
  };

  const labelled = (r) => {
    if (grouped) return false;
    /* 구역을 열면 그 구역 이름만 폈더니, 화면에 함께 보이는 옆 구역이
       빈 상자로 남아 여기가 어디인지 알 수 없었습니다. 보이는 매대는
       전부 이름을 답니다. */
    if (openBlock) return true;
    if (detail === "all" || !target) return true;
    return r.code === target.code;
  };

  /* 지도는 화면에 다 들어오지만 랙 이름이 작습니다. 손님이 직접 키워 볼 수 있게
     두 손가락 확대와 버튼을 답니다. 키운 상태에서는 끌어서 옮깁니다. */
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  /* 처음에는 존 덩어리만 보여 매장 구조가 한눈에 들어오게 하고,
     블록을 누르면 그 안의 랙 이름을 폅니다. */
  const [openBlock, setOpenBlock] = useState(null);
  const grouped = detail === "all" && !target && !openBlock;
  const box = useRef(null);
  const gesture = useRef(null);

  const clamp = (v) => {
    const el = box.current;
    if (!el) return v;
    const k = Math.min(Math.max(v.k, 1), 4);
    const w = el.clientWidth, h = el.clientHeight;
    const mx = (w * k - w) / 2, my = (h * k - h) / 2;
    return { k, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  };
  const zoomBy = (f) => setView((v) => clamp({ ...v, k: v.k * f, x: v.x * f, y: v.y * f }));
  const resetView = () => { setView({ k: 1, x: 0, y: 0 }); setOpenBlock(null); };

  /* 구역을 누르면 그 구역만 크게 봅니다.
   *
   * 전체 지도에서 랙 이름은 1픽셀 남짓이라, 눌러서 이름을 펴도 읽히지
   * 않았습니다. 지도를 확대해 미는 대신 그릴 범위를 그 구역으로 줄입니다.
   * 카드 크기는 그대로인데 구역만 화면을 채우니 이름이 그만큼 커집니다.
   * 되돌리기(↺)를 누르면 매장 전체로 돌아옵니다. */
  const zoomToBlock = (b) => {
    setOpenBlock(b);
    setView({ k: 1, x: 0, y: 0 });
  };

  /* 넓은 구역은 범위를 줄이는 것만으로는 부족합니다. A존은 매장 폭을 거의
     다 쓰기 때문에 1.5 배밖에 못 키웁니다. 구역이 카드 높이의 70% 를
     채우도록 한 번 더 키웁니다. 좁은 구역은 이미 차 있어 그대로입니다. */
  useEffect(() => {
    if (!openBlock) return;
    const k = Math.min(3, Math.max(1, (vb.h * 0.7) / (openBlock.h + 2)));
    if (k > 1.05) setView((v) => clamp({ ...v, k }));
    /* vb 는 openBlock 에서 계산되므로 openBlock 만 지켜보면 됩니다. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBlock]);

  /* 그릴 범위. 격자는 180×63 인데 매대와 집기는 6~176 · 4~57 만 씁니다.
     격자를 통째로 그리면 쓰지 않는 둘레만큼 지도가 작아집니다. */
  const FULL = { x: BOUNDS.x - pad, y: BOUNDS.y - pad, w: BOUNDS.w + pad * 2, h: BOUNDS.h + pad * 2 };
  const ratio = FULL.w / FULL.h;
  const vb = (() => {
    if (!openBlock) return FULL;
    const m = 2;
    let w = openBlock.w + m * 2;
    let h = openBlock.h + m * 2;
    if (w / h < ratio) w = h * ratio;
    else h = w / ratio;
    return {
      x: openBlock.c + openBlock.w / 2 - w / 2,
      y: openBlock.r + openBlock.h / 2 - h / 2,
      w, h,
    };
  })();

  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) gesture.current = { d: dist(e.touches), k: view.k };
    else if (e.touches.length === 1 && view.k > 1)
      gesture.current = { px: e.touches[0].clientX, py: e.touches[0].clientY, x: view.x, y: view.y };
  };
  const onTouchMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    if (e.touches.length === 2 && g.d) {
      setView((v) => clamp({ ...v, k: g.k * (dist(e.touches) / g.d) }));
    } else if (e.touches.length === 1 && g.px != null) {
      setView((v) => clamp({ ...v, x: g.x + (e.touches[0].clientX - g.px), y: g.y + (e.touches[0].clientY - g.py) }));
    }
  };
  const onTouchEnd = () => { gesture.current = null; };

  /* 마우스로도 끌어 옮깁니다. 손가락만 받아 두어서 확대한 뒤 커서로는
     움직일 수 없었습니다. 버튼을 뗀 곳이 지도 밖이어도 끝나도록 창에
     붙였다 뗍니다. */
  const [dragging, setDragging] = useState(false);
  const onMouseDown = (e) => {
    if (view.k <= 1 || e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    const from = { px: e.clientX, py: e.clientY, x: view.x, y: view.y };
    const move = (ev) =>
      setView((v) => clamp({ ...v, x: from.x + (ev.clientX - from.px), y: from.y + (ev.clientY - from.py) }));
    const up = () => {
      setDragging(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /* 트랙패드에서 두 손가락을 오므리면 브라우저가 ctrl 을 붙인 휠로 보냅니다.
     그때만 확대하고, 그냥 스크롤은 페이지에 넘깁니다. */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setView((v) => clamp({ ...v, k: v.k * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const btn = {
    width: 26, height: 26, borderRadius: 8, border: `1px solid ${BRAND.border}`,
    background: BRAND.surface, color: BRAND.text, fontSize: 14, fontWeight: 600,
    lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ position: "relative" }}>
      {/* 머리글 줄. 버튼은 지도 안이 아니라 제목 오른쪽 끝에 둡니다 —
          지도 위에 얹으면 매대를 가리고, 아래에 두면 자리를 또 먹습니다. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingLeft: 0 }}>
        {heading && (
          /* 소제목은 화면 어디서나 한 값입니다 — 「카테고리 바로가기」와
             나란히 놓이는데 두께가 달라 층이 다르게 읽혔습니다. */
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: BRAND.text,
            letterSpacing: "-0.01em" }}>{heading}</p>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(() => {
            const on = view.k > 1 || openBlock;
            return (
              <button
                type="button" aria-label="지도 원래대로" disabled={!on}
                style={{ ...btn, fontSize: 15, opacity: on ? 1 : 0.35, cursor: on ? "pointer" : "default" }}
                onClick={resetView}
              >
                ↺
              </button>
            );
          })()}
          <button type="button" aria-label="지도 확대" style={btn} onClick={() => zoomBy(1.4)}>+</button>
          <button type="button" aria-label="지도 축소" style={btn} onClick={() => zoomBy(1 / 1.4)}>−</button>
        </div>
      </div>

      {/* 지도는 카드 안쪽을 다 씁니다. 안쪽 여백을 두면 그만큼 잘립니다. */}
      <div style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}`,
        borderRadius: 8, overflow: "hidden" }}>
    <div
      ref={box}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      style={{ overflow: "hidden", touchAction: "none",
        cursor: view.k > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
    >
    <div ref={scroller} style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch",
      transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
      transformOrigin: "center center", transition: gesture.current ? "none" : "transform 0.18s ease" }}>
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ display: "block", width: "100%", minWidth: wide }}
        role="img"
        aria-label={
          target
            ? `매장 지도 — ${target.code} ${target.cat} 위치`
            : "파마스퀘어 구로점 매장 지도"
        }
      >
        <rect x={FULL.x} y={FULL.y} width={FULL.w} height={FULL.h} rx="1.5" fill="#FFFFFF" />

        {/* 집기 — 상품이 놓이지 않는 자리.
            매대와 같은 규칙으로 그립니다. 여기만 알약처럼 굴려 두면
            한 도면 안에서 집기와 매대가 다른 물건으로 보입니다. */}
        {MARKS.map((m, i) => {
          /* 상품이 놓이는 집기(파마베스트 · 행사)는 정본에 구역이 달려
             있습니다. 그런 자리는 매대와 같은 색으로 그리고, 나머지 시설은
             테두리 없는 회색 상자 하나로 통일합니다. */
          const color = m.zone ? zc(m.zone) : null;
          const isStair = m.kind.includes("계단");
          const ix = m.h > m.w ? BAR_SHORT : BAR_LONG;
          const iy = m.h > m.w ? BAR_LONG : BAR_SHORT;
          return (
            <g key={`m${i}`}>
              <rect
                x={m.c + ix} y={m.r + iy}
                width={m.w - ix * 2} height={m.h - iy * 2}
                rx={BAR_RADIUS}
                fill={color || MARK_FILL}
                fillOpacity={color ? 0.16 : 1}
                stroke={color || "none"}
                strokeOpacity={color ? 0.9 : 0}
                strokeWidth={color ? 0.12 : 0}
              />
              {/* 그림과 글자를 한 덩어리로 묶어 상자 한가운데에 놓습니다.
                  전에는 그림을 왼쪽 끝에 붙이고 글자만 어림잡아 밀어서,
                  둘이 서로 붙고 덩어리는 한쪽으로 쏠려 있었습니다. */}
              {m.kind !== ORIGIN_MARK && (() => {
                const label = markLabel(lang, m.kind);
                const boxW = m.w - ix * 2;
                const boxH = m.h - iy * 2;
                const inner = boxW - MARK_PAD * 2;

                const icon = isStair ? Math.min(boxH * 0.5, 2.4) : 0;
                const gap = isStair ? icon * 0.55 : 0;
                const fs = Math.min(1.9, boxH * 0.62, (inner - icon - gap) / runWidth(label));
                const textW = runWidth(label) * fs;

                const x0 = cx(m) - (icon + gap + textW) / 2;
                const pts = [[0, 1], [0, 0.66], [0.34, 0.66], [0.34, 0.33],
                             [0.67, 0.33], [0.67, 0], [1, 0]];
                return (
                  <>
                    {isStair && (
                      <polyline
                        points={pts
                          .map(([px, py]) => `${x0 + px * icon},${cy(m) - icon / 2 + py * icon}`)
                          .join(" ")}
                        fill="none" stroke={MARK_TEXT} strokeWidth="0.22"
                        strokeLinejoin="round" strokeLinecap="round" opacity="0.75"
                      />
                    )}
                    <text
                      x={x0 + icon + gap} y={cy(m) + fs * 0.36}
                      fontSize={fs} fill={color || MARK_TEXT}
                      fontWeight={color ? 600 : 500}
                    >
                      {label}
                    </text>
                  </>
                );
              })()}
            </g>
          );
        })}

        {/* 랙 */}
        {RACKS.map((r) => {
          const color = zc(r.zone);
          const bar = BAR[r.code];
          const isTarget = target && r.code === target.code;
          const zoneOn = !target && highlightZone && r.zone === highlightZone;
          const dim = target && !isTarget;
          /* 연 구역 밖의 매대 — 이름은 남기되 한 겹 물립니다. */
          const aside = openBlock && !openBlock.racks.includes(r);
          return (
            <g
              key={r.code}
              onClick={
                grouped
                  ? () => zoomToBlock(BLOCKS.find((b) => b.racks.includes(r)) || null)
                  : onRackClick ? () => onRackClick(r) : undefined
              }
              style={grouped || onRackClick ? { cursor: "pointer" } : undefined}
            >
              <rect
                x={r.c + bar.ix} y={r.r + bar.iy}
                width={r.w - bar.ix * 2} height={r.h - bar.iy * 2} rx={BAR_RADIUS}
                fill={color}
                fillOpacity={grouped ? 0.42 : isTarget ? 1 : zoneOn ? 0.34 : dim ? 0.1 : aside ? 0.09 : 0.16}
                stroke={color}
                strokeOpacity={isTarget ? 1 : dim ? 0.4 : aside ? 0.45 : 0.9}
                strokeWidth={isTarget ? 0.3 : 0.12}
              />
              {labelled(r) && !isTarget && bar.label && (
                <g
                  transform={
                    bar.upright
                      ? `rotate(-90 ${cx(r)} ${cy(r)})`
                      : undefined
                  }
                  style={{ pointerEvents: "none" }}
                >
                  {bar.label.lines.map((line, i) => (
                    <text
                      key={i}
                      x={cx(r)}
                      y={
                        cy(r) +
                        bar.label.size * 0.36 +
                        (i - (bar.label.lines.length - 1) / 2) * bar.label.size * 1.12
                      }
                      textAnchor="middle" fontSize={bar.label.size} fontWeight="600"
                      fill={color} fillOpacity={dim ? 0.55 : aside ? 0.55 : 1}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* 구역 이름.
            전에는 큰 글자에 흰 테두리를 둘러 매대 위에 겹쳐 놓았습니다.
            글자가 매대를 파먹는 것처럼 보여서, 지도 라벨답게 구역 색을 채운
            표 하나로 바꿉니다. 이름과 랙 범위를 한 줄에 담습니다. */}
        {grouped && BLOCKS.map((b) => {
          const name = zoneLabel(lang, b.zone) || b.zone;
          const FS = 3.6;
          const padX = FS * 0.7;
          /* 이름과 랙 번호 사이. 공백 하나로는 두 말이 붙어 보입니다. */
          const NUM_GAP = 0.62;
          const w = (runWidth(name) + runWidth(b.range) * 0.72 + NUM_GAP) * FS + padX * 2;
          const h = FS * 1.85;
          /* 오른쪽 끝 구역은 표가 판매장 밖으로 삐져나갑니다. 안쪽으로 붙입니다. */
          const x = Math.min(Math.max(b.lx - w / 2, FULL.x + 0.5), FULL.x + FULL.w - w - 0.5);
          return (
            <g key={`b${b.id}`} style={{ pointerEvents: "none" }}>
              <rect
                x={x} y={b.ly - h / 2} width={w} height={h} rx={h / 2}
                fill={zc(b.zone)}
              />
              <text
                x={x + w / 2} y={b.ly + FS * 0.36} textAnchor="middle"
                fontSize={FS} fontWeight="700" fill="#FFFFFF"
              >
                {name}
                <tspan dx={FS * NUM_GAP} fontSize={FS * 0.72} fillOpacity="0.75">{b.range}</tspan>
              </text>
            </g>
          );
        })}

        {/* 걸어가는 길 — 빈 칸만 밟은 경로 */}
        {route && (
          <polyline
            points={route.map(([c, r]) => `${c},${r}`).join(" ")}
            fill="none" stroke={YOU} strokeWidth="0.45"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="0.9 1.6" opacity="0.7"
          >
            <animate attributeName="stroke-dashoffset" values="0;-5" dur="1.1s" repeatCount="indefinite" />
          </polyline>
        )}

        {/* 현재 위치 */}
        {origin && (
          <g>
            <circle cx={cx(origin)} cy={cy(origin)} r="1.5" fill={YOU} />
            <circle cx={cx(origin)} cy={cy(origin)} r="2.6" fill="none" stroke={YOU} strokeWidth="0.5" opacity="0.45">
              <animate attributeName="r" values="1.9;3.6;1.9" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.05;0.5" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <text
              x={cx(origin)} y={cy(origin) + 5.4} textAnchor="middle"
              fontSize="2.6" fontWeight="800" fill={YOU}
              stroke="#FFFFFF" strokeWidth="0.9" paintOrder="stroke"
            >
              {t(lang, "youAreHere")}
            </text>
            {/* 「현재 위치」만으로는 매장 어디인지 모릅니다. 무슨 자리인지 적습니다. */}
            <text
              x={cx(origin)} y={cy(origin) + 8.6} textAnchor="middle"
              fontSize="2.1" fontWeight="600" fill={MARK_TEXT}
              stroke="#FFFFFF" strokeWidth="0.8" paintOrder="stroke"
            >
              {markLabel(lang, ORIGIN_MARK)}
            </text>
          </g>
        )}

        {/* 목표 랙 말풍선 */}
        {target && (() => {
          const above = target.r > 9;
          return (
          <g>
            <circle cx={cx(target)} cy={cy(target)} r="3.4" fill="none" stroke={zc(target.zone)} strokeWidth="0.6" opacity="0.5">
              <animate attributeName="r" values="2.6;4.6;2.6" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0.05;0.55" dur="1.4s" repeatCount="indefinite" />
            </circle>
            {/* 위쪽 끝에 붙은 랙은 말풍선을 아래로 내립니다 — 위로 두면 잘립니다 */}
            <text
              x={cx(target)} y={above ? target.r - 4.6 : target.r + target.h + 4.2}
              textAnchor="middle" fontSize="4.2" fontWeight="800" fill={zc(target.zone)}
              stroke="#FFFFFF" strokeWidth="1.1" paintOrder="stroke"
            >
              {target.code}
            </text>
            <text
              x={cx(target)} y={above ? target.r - 1.4 : target.r + target.h + 7.4}
              textAnchor="middle" fontSize="2.8" fontWeight="600" fill="#2D373D"
              stroke="#FFFFFF" strokeWidth="0.9" paintOrder="stroke"
            >
              {target.cat}
            </text>
          </g>
          );
        })()}
      </svg>
    </div>
    </div>
      </div>
    </div>
  );
}
