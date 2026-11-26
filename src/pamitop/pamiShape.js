/* 파미 머리 윤곽(도무송 칼선) — 타원 + 두 귀. 비율은 faceTexture.js 와 같은 PS-OS 3D 월드 파미 v2 값.
 * 파미탑 층은 이 윤곽을 사각 범위로 잘라 만든다(어긋난 만큼 얼굴도 같이 잘림). 화면 없는 순수 함수. */
import { FULL } from "./cut.js";

export function inHead(x, y) {
  if ((x / 0.385) ** 2 + (y / 0.315) ** 2 <= 1) return true;
  for (const k of [-1, 1]) if ((x - k * 0.27) ** 2 + (y - 0.235) ** 2 <= 0.125 ** 2) return true;
  return false;
}

/* 머리 단위(가로 약 ±0.5) 윤곽 점 — 가운데서 바깥으로 훑는다 */
export function headOutline(grow = 0, n = 160) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 0.62;
    while (r > 0 && !inHead(Math.cos(a) * r, Math.sin(a) * r)) r -= 0.002;
    r += grow;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/* 탑 바닥 좌표(x, z)로 — 얼굴 그림(drawFace, rot)과 같은 돌림 · 같은 비율(K = 0.98)이라 칼선과 그림이 맞는다 */
export function towerHead(rot) {
  const c = Math.cos(rot), s = Math.sin(rot), k = 0.98 * FULL;
  return headOutline().map(([hx, hy]) => {
    const a = hx, b = -hy - 0.02;
    return [(a * c - b * s) * k, (a * s + b * c) * k];
  });
}

/* 다각형을 사각 범위로 자르기(Sutherland–Hodgman) */
export function clipRect(poly, x0, x1, z0, z1) {
  const edges = [
    (p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= z0, (p) => p[1] <= z1,
  ];
  const cross = [
    (a, b) => { const t = (x0 - a[0]) / (b[0] - a[0]); return [x0, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (x1 - a[0]) / (b[0] - a[0]); return [x1, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (z0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), z0]; },
    (a, b) => { const t = (z1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), z1]; },
  ];
  let out = poly;
  for (let e = 0; e < 4 && out.length; e++) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      const ia = edges[e](a), ib = edges[e](b);
      if (ia && ib) out.push(b);
      else if (ia && !ib) out.push(cross[e](a, b));
      else if (!ia && ib) { out.push(cross[e](a, b)); out.push(b); }
    }
  }
  return out;
}

export function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}
