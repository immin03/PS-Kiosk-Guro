/* 파미빵 타이쿤 — 3D 굽기판. 규칙(tycoon.js)의 상태를 매 프레임 읽어 그리기만 하고, 누른 틀 번호를 돌려준다.
 * 파미 얼굴 틀 6개(3 × 2), 반죽 → 뒤집기 → 꺼내기 동작, 익은 정도 테두리(흰 진행 → 민트 알맞음 → 주황 조금 탐, 파미 머리 윤곽 띠), 김 · 연기. */
import * as THREE from "three";
import { drawFace } from "../pamitop/faceTexture.js";
import { MOLDS, READY, PERFECT_HI, BURN, step, takeEvents, tapMold } from "./tycoon.js";

const COLS = 3;
const GAP_X = 1.42, GAP_Z = 1.34;
const SCALE = 1.25;               // 파미 머리 단위 → 판 위 크기
const PLATE_TOP = 0.16;
const FILL_COLOR = { 팥: 0x5b2a1e, 슈크림: 0xf2cf6b };

/* 파미 머리 = 타원 + 두 귀(원). 가운데서 바깥으로 훑어 테두리를 뽑는다 */
function inHead(x, y) {
  if ((x / 0.385) ** 2 + (y / 0.315) ** 2 <= 1) return true;
  for (const k of [-1, 1]) if ((x - k * 0.27) ** 2 + (y - 0.235) ** 2 <= 0.125 ** 2) return true;
  return false;
}
function headShape(grow = 0) {
  const pts = [];
  const N = 180;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    let r = 0.62;
    while (r > 0 && !inHead(Math.cos(a) * r, Math.sin(a) * r)) r -= 0.002;
    r += grow;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new THREE.Shape(pts);
}

const moldPos = (i) => {
  const col = i % COLS, row = Math.floor(i / COLS);
  return new THREE.Vector3((col - (COLS - 1) / 2) * GAP_X, PLATE_TOP, (row - 0.5) * GAP_Z);
};

const lerpColor = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t)));

export class PamiGrill {
  constructor(container, { onEvents } = {}) {
    this.container = container;
    this.onEvents = onEvents;
    this.game = null;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.cssText = "position:absolute;inset:0;display:block;width:100%;height:100%;touch-action:none";
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xfff3e0, 0x4a3a30, 1.2));
    const sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
    sun.position.set(-2.5, 7, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
    sun.shadow.bias = -0.0008;
    this.scene.add(sun);
    const glow = new THREE.PointLight(0xff9a4a, 6, 6, 1.6);   // 아래 불기운
    glow.position.set(0, -0.6, 1.4);
    this.scene.add(glow);

    this.buildGrill();
    this.buildMolds();
    this.buildPuffs();

    this.anims = [];
    this.ray = new THREE.Raycaster();
    this.onDown = (e) => {
      e.preventDefault();
      const r = this.renderer.domElement.getBoundingClientRect();
      const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(p, this.camera);
      const hit = this.ray.intersectObjects(this.hits, false)[0];
      if (hit) this.tap(hit.object.userData.i);
    };
    this.renderer.domElement.addEventListener("pointerdown", this.onDown);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.clock = new THREE.Clock();
    this.loop = () => { this.raf = requestAnimationFrame(this.loop); this.update(Math.min(0.05, this.clock.getDelta())); };
    this.loop();
    if (import.meta.env?.DEV) window.__pamiGrill = this;   /* 개발 서버에서만 — 화면 없는 확인용 */
  }

  buildGrill() {
    const iron = new THREE.MeshStandardMaterial({ color: 0x34302d, roughness: 0.45, metalness: 0.6 });
    const W = COLS * GAP_X + 0.5, D = 2 * GAP_Z + 0.55;
    const plateShape = new THREE.Shape();
    const r = 0.22, w = W / 2, d = D / 2;
    plateShape.moveTo(-w + r, -d); plateShape.lineTo(w - r, -d); plateShape.quadraticCurveTo(w, -d, w, -d + r);
    plateShape.lineTo(w, d - r); plateShape.quadraticCurveTo(w, d, w - r, d); plateShape.lineTo(-w + r, d);
    plateShape.quadraticCurveTo(-w, d, -w, d - r); plateShape.lineTo(-w, -d + r); plateShape.quadraticCurveTo(-w, -d, -w + r, -d);
    const plateGeo = new THREE.ExtrudeGeometry(plateShape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
    plateGeo.rotateX(-Math.PI / 2);
    const plate = new THREE.Mesh(plateGeo, iron);
    plate.position.y = PLATE_TOP - 0.27;
    plate.receiveShadow = true; plate.castShadow = true;
    this.scene.add(plate);
    /* 민트 카트 몸통 */
    const body = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 1.6, D + 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1dbfb0, roughness: 0.5 }));
    body.position.y = PLATE_TOP - 0.3 - 0.8;
    body.receiveShadow = true;
    this.scene.add(body);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.56, 0.08, D + 0.36), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    trim.position.y = PLATE_TOP - 0.33;
    this.scene.add(trim);
    this.plateSize = { W, D };
  }

  buildMolds() {
    const head = headShape();
    this.breadGeo = new THREE.ExtrudeGeometry(head, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 4 });
    this.breadGeo.rotateX(-Math.PI / 2);
    this.breadGeo.scale(SCALE, SCALE, SCALE);
    this.batterGeo = new THREE.ExtrudeGeometry(head, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
    this.batterGeo.rotateX(-Math.PI / 2);
    this.batterGeo.scale(SCALE * 0.96, SCALE, SCALE * 0.96);
    const cupGeo = new THREE.ExtrudeGeometry(headShape(0.05), { depth: 0.03, bevelEnabled: false });
    cupGeo.rotateX(-Math.PI / 2); cupGeo.scale(SCALE, SCALE, SCALE);
    const holeGeo = new THREE.ExtrudeGeometry(head, { depth: 0.035, bevelEnabled: false });
    holeGeo.rotateX(-Math.PI / 2); holeGeo.scale(SCALE, SCALE, SCALE);

    const face = new THREE.CanvasTexture(drawFace(document.createElement("canvas"), { rot: 0, edge: false }));
    face.colorSpace = THREE.SRGBColorSpace;
    face.anisotropy = 4;
    face.repeat.set(0.98, 0.98); face.offset.set(0.5, 0.5);   // 윗면 UV = 머리 좌표 → 그림 가운데
    this.faceTex = face;

    const cupMat = new THREE.MeshStandardMaterial({ color: 0x4a4440, roughness: 0.35, metalness: 0.7 });
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x141110, roughness: 0.8 });
    /* 익은 정도 테두리 — 머리 윤곽을 따라 도는 띠 */
    const band = headShape(0.1);
    band.holes.push(new THREE.Path(headShape(0.045).getPoints().reverse()));
    this.ringGeo = new THREE.ShapeGeometry(band);

    this.molds = []; this.hits = [];
    for (let i = 0; i < MOLDS; i++) {
      const at = moldPos(i);
      const cup = new THREE.Mesh(cupGeo, cupMat); cup.position.copy(at); cup.receiveShadow = true; this.scene.add(cup);
      const hole = new THREE.Mesh(holeGeo, holeMat); hole.position.copy(at); hole.position.y += 0.004; this.scene.add(hole);

      const batterMat = new THREE.MeshStandardMaterial({ color: 0xf7e7b5, roughness: 0.55 });
      const batter = new THREE.Mesh(this.batterGeo, batterMat);
      batter.position.copy(at); batter.position.y += 0.02; batter.visible = false; batter.castShadow = true;
      this.scene.add(batter);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshStandardMaterial({ color: 0x5b2a1e, roughness: 0.6, transparent: true }));
      dot.rotation.x = -Math.PI / 2; dot.position.set(at.x, at.y + 0.085, at.z + 0.03); dot.visible = false;
      this.scene.add(dot);

      const capMat = new THREE.MeshStandardMaterial({ map: face, roughness: 0.6, transparent: true });
      const sideMat = new THREE.MeshStandardMaterial({ color: 0xd9984d, roughness: 0.7, transparent: true });
      const bread = new THREE.Mesh(this.breadGeo, [capMat, sideMat]);
      bread.castShadow = true;
      const pivot = new THREE.Group(); pivot.position.copy(at); pivot.add(bread); pivot.visible = false;
      this.scene.add(pivot);

      const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.scale.setScalar(SCALE); ring.position.set(at.x, PLATE_TOP + 0.04, at.z); ring.visible = false;
      this.scene.add(ring);

      const hit = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ visible: false }));
      hit.rotation.x = -Math.PI / 2; hit.position.set(at.x, PLATE_TOP + 0.15, at.z); hit.userData.i = i;
      this.scene.add(hit); this.hits.push(hit);

      this.molds.push({ at, batter, dot, pivot, bread, capMat, sideMat, ring, busy: 0, shown: "empty", puffT: 0 });
    }
  }

  buildPuffs() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    this.puffTex = new THREE.CanvasTexture(c);
    this.puffs = [];
  }

  puff(at, dark) {
    if (this.puffs.length > 60) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, color: dark ? 0x3a3330 : 0xffffff, transparent: true, depthWrite: false, opacity: 0 }));
    s.position.set(at.x + (Math.random() - 0.5) * 0.5, at.y + 0.2, at.z + (Math.random() - 0.5) * 0.4);
    s.scale.setScalar(0.35);
    this.scene.add(s);
    this.puffs.push({ s, age: 0, life: 1.2 + Math.random() * 0.5, dark });
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    /* 판 전체가 들어오게 거리 맞춤 */
    const vf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    const dist = Math.max((this.plateSize.W / 2 + 0.35) / Math.tan(hf), (this.plateSize.D / 2 + 0.9) / Math.tan(vf));
    const dir = new THREE.Vector3(0, 0.86, 0.51).normalize();
    this.camera.position.copy(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, 0, 0.12));
    this.camera.lookAt(0, -0.1, 0.12);
  }

  setGame(g) {
    this.game = g; this.running = !!g;
    this.molds.forEach((m) => { m.busy = 0; m.shown = "empty"; m.pivot.visible = false; m.batter.visible = false; m.dot.visible = false; m.ring.visible = false; });
    this.anims.forEach((a) => a.end?.()); this.anims = [];
  }

  tap(i) {
    if (this.game && this.running) tapMold(this.game, i);
  }

  anim(dur, fn, end) { const a = { t: 0, dur, fn, end }; this.anims.push(a); return a; }

  handle(ev) {
    const m = this.molds[ev.i];
    if (!m) return;
    if (ev.type === "pour") {
      m.batter.visible = true; m.batter.scale.set(0.2, 1, 0.2);
      m.dot.material.color.setHex(FILL_COLOR[ev.fill]); m.dot.visible = true; m.dot.material.opacity = 1;
      this.anim(0.25, (k) => m.batter.scale.set(0.2 + 0.8 * k, 1, 0.2 + 0.8 * k));
    } else if (ev.type === "flip") {
      m.batter.visible = false; m.dot.visible = false;
      m.pivot.visible = true; m.busy += 1;
      this.anim(0.38, (k) => {
        const e = k * k * (3 - 2 * k);
        m.pivot.position.y = m.at.y + Math.sin(e * Math.PI) * 0.55;
        m.pivot.rotation.x = Math.PI * (1 - e);
      }, () => { m.busy -= 1; m.pivot.rotation.x = 0; m.pivot.position.y = m.at.y; });
    } else if (ev.type === "done" || ev.type === "discard") {
      /* 빵만 따로 떼어 날리고, 틀은 바로 비운다 */
      const fly = m.bread.clone();
      fly.material = [m.capMat.clone(), m.sideMat.clone()];
      fly.position.copy(m.at); this.scene.add(fly);
      m.pivot.visible = false; m.batter.visible = false; m.dot.visible = false;
      const to = ev.type === "done" ? new THREE.Vector3(2.4, 1.2, 2.2) : new THREE.Vector3(m.at.x, -1.5, m.at.z + 1.2);
      const from = m.at.clone();
      this.anim(ev.type === "done" ? 0.45 : 0.5, (k) => {
        fly.position.lerpVectors(from, to, k);
        fly.position.y += Math.sin(k * Math.PI) * (ev.type === "done" ? 1.2 : 0.3);
        fly.rotation.y = k * (ev.type === "done" ? 1.2 : 2.4);
        fly.scale.setScalar(1 - k * 0.45);
        fly.material.forEach((x) => (x.opacity = 1 - Math.max(0, k - 0.6) / 0.4));
      }, () => { this.scene.remove(fly); fly.material.forEach((x) => x.dispose()); });
      if (ev.type === "discard") for (let k = 0; k < 4; k++) this.puff(m.at, true);
    }
  }

  /* 틀 하나 그리기 — 상태에 따라 반죽 색 · 빵 색 · 테두리 */
  drawMold(m, s, dt) {
    const raw = s.stage === "sideA", top = s.stage === "sideB" || s.stage === "burnt";
    if (s.stage === "empty") { m.ring.visible = false; if (!m.busy) { m.pivot.visible = false; m.batter.visible = false; m.dot.visible = false; } return; }
    if (raw) {
      m.batter.visible = true;
      const col = s.c < READY ? lerpColor(0xf8ecc4, 0xedc27a, s.c / READY)
        : s.c < PERFECT_HI ? lerpColor(0xedc27a, 0xe3a85c, (s.c - READY) / (PERFECT_HI - READY))
        : lerpColor(0xe3a85c, 0x4a2a15, (s.c - PERFECT_HI) / (BURN - PERFECT_HI));
      m.batter.material.color.copy(col);
      m.dot.material.opacity = Math.max(0, 1 - s.c / 0.6);
      m.dot.visible = m.dot.material.opacity > 0;
    }
    if (top) {
      m.pivot.visible = true; m.batter.visible = false;
      const burnK = s.stage === "burnt" ? 1 : Math.max(0, (s.c - PERFECT_HI) / (BURN - PERFECT_HI));
      const paleK = Math.max(0, 1 - s.c / READY);
      m.capMat.color.copy(lerpColor(0xffffff, 0x3a2a20, burnK)).lerp(new THREE.Color(0xfff4dc), paleK * 0.4);
      m.sideMat.color.copy(lerpColor(0xd9984d, 0x2e2018, burnK));
    }
    /* 테두리 */
    if (s.stage === "burnt") { m.ring.visible = false; }
    else {
      m.ring.visible = true;
      const now = performance.now() / 1000;
      if (s.c < READY) {           // 익는 중 — 흰 띠가 점점 진해짐
        m.ring.material.color.setHex(0xffffff); m.ring.material.opacity = 0.08 + 0.3 * (s.c / READY);
      } else if (s.c <= PERFECT_HI) {   // 알맞음 — 민트로 깜빡
        m.ring.material.color.setHex(0x2ee6c8); m.ring.material.opacity = 0.8 + 0.2 * Math.sin(now * 10);
      } else {                     // 조금 탐 — 주황으로 빠르게 깜빡
        m.ring.material.color.setHex(0xff7a2f); m.ring.material.opacity = 0.55 + 0.45 * Math.sin(now * 20);
      }
    }
    /* 김 · 연기 */
    m.puffT -= dt;
    if (m.puffT <= 0) {
      if (s.stage === "burnt") { this.puff(m.at, true); m.puffT = 0.18; }
      else if (s.c >= READY) { this.puff(m.at, s.c > PERFECT_HI); m.puffT = s.c > PERFECT_HI ? 0.2 : 0.35; }
      else m.puffT = 0.3;
    }
  }

  update(dt) {
    const g = this.game;
    if (g && !g.over && this.running) step(g, dt);
    if (g) {
      const evs = takeEvents(g);
      evs.forEach((e) => this.handle(e));
      if (evs.length) this.onEvents?.(evs);
      g.molds.forEach((s, i) => this.drawMold(this.molds[i], s, dt));
    }
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.fn(k);
      if (k >= 1) { a.end?.(); this.anims.splice(i, 1); }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      const k = p.age / p.life;
      p.s.position.y += dt * 0.7;
      p.s.scale.setScalar(0.35 + k * 0.7);
      p.s.material.opacity = (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8) * (p.dark ? 0.75 : 0.55);
      if (k >= 1) { this.scene.remove(p.s); p.s.material.dispose(); this.puffs.splice(i, 1); }
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.renderer.domElement.removeEventListener("pointerdown", this.onDown);
    const seen = new Set();
    this.scene.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach((m) => { if (!seen.has(m)) { seen.add(m); m.dispose(); } });
    });
    this.faceTex.dispose(); this.puffTex.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
