/* 파미빵 윗면 그림 — 노릇한 빵 위에 파미 얼굴을 구운 자국으로 그린다(캔버스).
 * 비율은 PS-OS 3D 월드 파미 v2(tools/world3d-template.html)와 같은 값: 머리 타원 0.385 × 0.315, 귀 (±0.27, 0.235) r 0.125,
 * 눈 (±0.112, -0.03), ω 입, 볼 (±0.205, -0.1), 오른쪽 위 캡슐 머리핀. 볼과 캡슐은 민트 · 흰 아이싱.
 * 카메라가 대각선(-x, -z 쪽)에서 보므로 얼굴 위쪽이 화면 위로 오게 135도 돌려 그린다. */
const S = 1024;
const K = S * 0.98;                       // 머리 단위 → 픽셀
const P = (x, y) => [x * K, -y * K];      // 머리 좌표(위가 +) → 캔버스(아래가 +)

function speckle(ctx, n, color, rMax) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = Math.random() * rMax + 0.6;
    ctx.globalAlpha = Math.random() * 0.25 + 0.05;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function headPath(ctx, grow = 0) {
  const g = grow * K;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.385 * K + g, 0.315 * K + g, 0, 0, Math.PI * 2);
  for (const k of [-1, 1]) {
    const [x, y] = P(k * 0.27, 0.235);
    ctx.moveTo(x + 0.125 * K + g, y);
    ctx.arc(x, y, 0.125 * K + g, 0, Math.PI * 2);
  }
}

export function drawFace(canvas) {
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d");
  /* 빵 바탕 — 가운데 밝고 가장자리 진한 구움색 */
  const bg = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.72);
  bg.addColorStop(0, "#F3C77F"); bg.addColorStop(0.7, "#E2A65A"); bg.addColorStop(1, "#C98743");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
  speckle(ctx, 900, "#8A4F1E", 3);
  speckle(ctx, 500, "#FFF1CF", 2.5);

  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(Math.PI * 0.75);
  ctx.translate(0, -0.02 * K);

  /* 틀에 눌린 홈(진한 테두리) → 볼록한 얼굴 */
  headPath(ctx, 0.022); ctx.fillStyle = "#A8662B"; ctx.fill();
  ctx.save(); ctx.shadowColor = "rgba(90,45,10,0.45)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
  headPath(ctx); const fg = ctx.createRadialGradient(-0.08 * K, -0.12 * K, 0.02 * K, 0, 0, 0.5 * K);
  fg.addColorStop(0, "#FAD99A"); fg.addColorStop(0.65, "#EDB86C"); fg.addColorStop(1, "#D9984D");
  ctx.fillStyle = fg; ctx.fill(); ctx.restore();
  /* 귀 안쪽 이음매 */
  ctx.strokeStyle = "rgba(150,85,30,0.55)"; ctx.lineWidth = 0.012 * K;
  for (const k of [-1, 1]) { const [x, y] = P(k * 0.27, 0.235); ctx.beginPath(); ctx.arc(x, y, 0.07 * K, Math.PI * (k < 0 ? 0.9 : 0.1) - 0.9, Math.PI * (k < 0 ? 0.9 : 0.1) + 0.9); ctx.stroke(); }

  /* 볼 — 민트 아이싱 */
  for (const k of [-1, 1]) {
    const [x, y] = P(k * 0.205, -0.1);
    ctx.fillStyle = "#A7E4DD"; ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.ellipse(x, y, 0.066 * K, 0.058 * K, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.ellipse(x - 0.018 * K, y - 0.02 * K, 0.02 * K, 0.014 * K, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  /* 눈 — 진하게 구운 타원 + 반짝 */
  for (const k of [-1, 1]) {
    const [x, y] = P(k * 0.112, -0.03);
    ctx.fillStyle = "#3B200D";
    ctx.beginPath(); ctx.ellipse(x, y, 0.039 * 0.84 * K, 0.039 * 1.15 * K, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFF6E2";
    ctx.beginPath(); ctx.arc(x + 0.01 * K, y - 0.018 * K, 0.0105 * K, 0, Math.PI * 2); ctx.fill();
  }
  /* ω 입 */
  const mouth = [[-0.066, -0.088], [-0.052, -0.106], [-0.03, -0.11], [-0.009, -0.099], [0, -0.09], [0.009, -0.099], [0.03, -0.11], [0.052, -0.106], [0.066, -0.088]].map(([x, y]) => P(x, y));
  ctx.strokeStyle = "#3B200D"; ctx.lineWidth = 0.016 * K; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(...mouth[0]);
  for (let i = 1; i < mouth.length - 1; i++) { const [x1, y1] = mouth[i], [x2, y2] = mouth[i + 1]; ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2); }
  ctx.lineTo(...mouth[mouth.length - 1]); ctx.stroke();

  /* 캡슐 머리핀 — 보는 쪽 오른쪽 위, 왼아래 민트 · 오른위 흰색 */
  {
    const [x, y] = P(0.2, 0.15);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(-1.1, 1));
    const L = 0.1 * K, R = 0.043 * K;
    ctx.shadowColor = "rgba(90,45,10,0.35)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#1DBFB0"; ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(-L / 2, -R); ctx.arc(-L / 2, 0, R, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(0, R); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(L / 2, -R); ctx.arc(L / 2, 0, R, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, R); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle = "#C98743"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, S - 6, S - 6);
  return canvas;
}

/* 옆면 — 위아래 노릇한 껍질, 가운데 폭신한 속(기공) */
export function drawSide(canvas, crust = "#C9823A", crumb = "#FBE6BC") {
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = crumb; ctx.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 256, y = 12 + Math.random() * 40, r = Math.random() * 2.4 + 0.6;
    ctx.globalAlpha = 0.18 + Math.random() * 0.2;
    ctx.fillStyle = Math.random() < 0.6 ? "#E9C688" : "#FFF7E4";
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const [y0, y1, flip] of [[0, 13, false], [51, 64, true]]) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(flip ? 1 : 0, crust); g.addColorStop(flip ? 0 : 1, "rgba(233,178,102,0)");
    ctx.fillStyle = g; ctx.fillRect(0, y0, 256, y1 - y0);
  }
  return canvas;
}
