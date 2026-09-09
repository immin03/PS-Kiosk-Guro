import { useMemo, useRef, useEffect, useState } from "react";
import { GRID, MARKS, RACKS, RACK_BY_CODE } from "./rackLayout.js";
import { zoneLabel, markLabel, t } from "./i18n.js";
import { BRAND, ZONE_COLOR, ZONE_FALLBACK as FALLBACK, YOU_HERE as YOU } from "./theme.js";

/* 매장 배치도.
 *
 * 좌표는 PS-OS catalog/racks.json 이 정본입니다(scripts/sync-racks.mjs 로 가져옵니다).
 * 예전 배치도는 존마다 좌표가 하나뿐이라 A1 과 A30 이 같은 자리에 찍혔습니다.
 * 이제 랙 하나하나가 제 자리에 그려지고, 경로는 실제로 비어 있는 칸만 밟습니다.
 */

const MARK_FILL = "#E5E5E5";
const MARK_LINE = "#D8E1E2";
const MARK_TEXT = "#2D373D";

/* 손님이 출발하는 자리. 키오스크가 놓인 곳이며 배치도의 집기 이름과 같아야 합니다. */
export const ORIGIN_MARK = "엘리베이터 입구";

/* 길 안내에 이름을 댈 만한 집기. 앤드1~4 같은 내부 용어는 제외합니다. */
const WAYPOINT = /입구|계산|PHAMA BEST|체험존|행사|음료/;

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

/* 매대는 실제로 맞붙어 있습니다. 좌표는 그대로 두고 그릴 때만 살짝 들여
   그려 칸이 구분되게 합니다. */
const INSET = 0.35;

/* 랙은 도면처럼 그립니다 — 긴 축은 거의 붙여 한 줄의 매대로 이어 보이게 하고,
   짧은 축만 넉넉히 들여 얇고 긴 막대가 되게 합니다. 7×3 칸이 6.8×2.0 으로
   그려져 도면의 매대 비례에 가까워집니다. */
const BAR_LONG = 0.12;
const BAR_SHORT = 0.5;

/* 랙 이름을 칸 안에 앉힙니다.
 *
 * 「A1」 대신 「콘드로이친」이 읽혀야 손님이 지도만 보고 매대를 찾습니다.
 * 이름은 칸보다 길어서, 띄어쓰기와 가운뎃점에서 두 줄까지 나누고 남은 만큼
 * 글자를 줄입니다. 한글은 글자폭이 글자크기와 거의 같고 나머지는 그 절반으로
 * 잡습니다. */
const runWidth = (line) =>
  [...line].reduce((n, ch) => n + (/[\u3131-\uD79D\u4E00-\u9FFF]/.test(ch) ? 1 : 0.5), 0);

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

  /* 칸마다 제 이름에 맞춰 글자를 키우면 「식품」만 크고 「식이섬유 · 효소」는
     작아져 지도가 들쭉날쭉해집니다. 대부분이 소화할 수 있는 한 크기로 맞추고,
     그보다도 이름이 긴 몇 칸만 더 줄입니다. */
  const sizes = rows.filter((b) => b.label).map((b) => b.label.size).sort((a, b) => a - b);
  const common = sizes[Math.floor(sizes.length * 0.5)];

  rows.forEach((b) => {
    if (b.label) b.label = { ...b.label, size: Math.min(b.label.size, common) };
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
  onRackClick,
  minWidth,
}) {
  /* 지도는 언제나 화면 폭에 맞춥니다. 가로로 밀어야 보이는 지도는 손님이
     자기가 무엇을 놓쳤는지 알 수 없습니다. */
  const wide = minWidth != null ? minWidth : 0;
  const { rows, cols } = GRID;
  const pad = 3;
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
    const want = ((target.c + target.w / 2 + pad) / (cols + pad * 2)) * full - el.clientWidth / 2;
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
    if (openBlock) return openBlock.racks.includes(r);
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
    width: 30, height: 30, borderRadius: 8, border: `1px solid ${BRAND.border}`,
    background: BRAND.surface, color: BRAND.text, fontSize: 15, fontWeight: 600,
    lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ position: "relative" }}>
    <div
      ref={box}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overflow: "hidden", touchAction: "none", cursor: view.k > 1 ? "grab" : "default" }}
    >
    <div ref={scroller} style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch",
      transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
      transformOrigin: "center center", transition: gesture.current ? "none" : "transform 0.18s ease" }}>
      <svg
        viewBox={`${-pad} ${-pad} ${cols + pad * 2} ${rows + pad * 2}`}
        style={{ display: "block", width: "100%", minWidth: wide }}
        role="img"
        aria-label={
          target
            ? `매장 배치도 — ${target.code} ${target.cat} 위치`
            : "파마스퀘어 구로점 매장 배치도"
        }
      >
        <rect x={-pad} y={-pad} width={cols + pad * 2} height={rows + pad * 2} rx="1.5" fill="#FFFFFF" />

        {/* 집기 — 상품이 놓이지 않는 자리 */}
        {MARKS.map((m, i) => {
          const isDoor = m.kind.includes("입구");
          return (
            <g key={`m${i}`}>
              <rect
                x={m.c + INSET} y={m.r + INSET}
                width={m.w - INSET * 2} height={m.h - INSET * 2} rx="1"
                fill={isDoor ? "#D9E4E3" : MARK_FILL}
                stroke={isDoor ? "#63CAC1" : MARK_LINE}
                strokeWidth="0.3"
              />
              {m.kind !== ORIGIN_MARK && (
                <text
                  x={cx(m)} y={cy(m) + 0.62} textAnchor="middle"
                  fontSize={Math.min(1.9, m.h * 0.72)} fill={isDoor ? "#005251" : MARK_TEXT}
                  fontWeight={isDoor ? 700 : 500}
                >
                  {markLabel(lang, m.kind)}
                </text>
              )}
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
          return (
            <g
              key={r.code}
              onClick={
                grouped
                  ? () => setOpenBlock(BLOCKS.find((b) => b.racks.includes(r)) || null)
                  : onRackClick ? () => onRackClick(r) : undefined
              }
              style={grouped || onRackClick ? { cursor: "pointer" } : undefined}
            >
              <rect
                x={r.c + bar.ix} y={r.r + bar.iy}
                width={r.w - bar.ix * 2} height={r.h - bar.iy * 2} rx="0.5"
                fill={color}
                fillOpacity={grouped ? 0.42 : isTarget ? 1 : zoneOn ? 0.34 : dim ? 0.1 : 0.16}
                stroke={color}
                strokeOpacity={isTarget ? 1 : dim ? 0.3 : 0.55}
                strokeWidth={isTarget ? 0.7 : 0.3}
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
                      fill={color} fillOpacity={dim ? 0.55 : 1}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* 블록 이름 — 덩어리로 볼 때만 크게 얹습니다 */}
        {grouped && BLOCKS.map((b) => (
          <g key={`b${b.id}`} style={{ pointerEvents: "none" }}>
            <text
              x={b.lx} y={b.ly - 0.2} textAnchor="middle"
              fontSize="4.6" fontWeight="800" fill={zc(b.zone)}
              stroke="#FFFFFF" strokeWidth="1.1" paintOrder="stroke"
            >
              {zoneLabel(lang, b.zone) || b.zone}
            </text>
            <text
              x={b.lx} y={b.ly + 4.4} textAnchor="middle"
              fontSize="3" fontWeight="600" fill="#2D373D"
              stroke="#FFFFFF" strokeWidth="0.9" paintOrder="stroke"
            >
              {b.range}
            </text>
          </g>
        ))}

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

      {/* 지도 위에 얹으면 오른쪽 끝 블록 이름을 가립니다. 지도 아래에 둡니다. */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8, paddingRight: 6 }}>
        {/* 되돌리기는 왼쪽에 붙입니다. 오른쪽에 두면 나타날 때 +·− 가 밀려
            연달아 누르던 손이 끊깁니다. */}
        {(view.k > 1 || openBlock) && (
          <button type="button" aria-label="지도 원래대로" style={{ ...btn, fontSize: 15 }} onClick={resetView}>
            ↺
          </button>
        )}
        <button type="button" aria-label="지도 확대" style={btn} onClick={() => zoomBy(1.4)}>+</button>
        <button type="button" aria-label="지도 축소" style={btn} onClick={() => zoomBy(1 / 1.4)}>−</button>
      </div>
    </div>
  );
}

/* 범례는 지도 밖에 둡니다 — SVG 안에 넣으면 지도가 좁아질수록 같이 뭉개집니다. */
export function FloorPlanLegend({ lang = "ko" }) {
  const used = [];
  RACKS.forEach((r) => { if (!used.includes(r.zone)) used.push(r.zone); });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
      {used.map((z) => (
        <span key={z} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#2D373D" }}>
          <span style={{ width: 9, height: 9, borderRadius: 8, background: zc(z) }} />
          {zoneLabel(lang, z) || z}
        </span>
      ))}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#2D373D" }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: YOU }} />
        {t(lang, "youAreHere")}
      </span>
    </div>
  );
}
