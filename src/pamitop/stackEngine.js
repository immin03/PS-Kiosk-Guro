/* 파미탑 — 쌓기 엔진.
 * 원작: Stack by Konrad Linkowski (https://github.com/KonradLinkowski/Stack), MIT License — 전문은 LICENSE-stack.txt.
 * 바꾼 것: 네모 상자 → 하얀 파미 얼굴 도무송(머리 윤곽 칼선, 2026-11-26 사용자 「스퀘어가 아니라 도무송」 「파미 얼굴은 하얗게」).
 *   층마다 칼선 다각형을 사각 범위로 잘라 만들고, 얼굴 그림은 그 층에 붙어 함께 움직인다(어긋난 만큼 얼굴도 잘림). 잘린 조각은 떨어짐,
 * 퍼펙트 연속이면 다시 넓어짐, 눈, 그림자, 터치(pointerdown), 컨테이너 크기에 맞춤, 시작 · 끝 콜백. */
import * as THREE from "three";
import { cutTile, grow, speedFor, spawnSide, floorPoints, earnsShield, FULL } from "./cut.js";
import { drawFace } from "./faceTexture.js";
import { towerHead, clipRect } from "./pamiShape.js";

const H = 16;                 // 한 층 두께
const RANGE = 110;            // 움직이는 폭
const SIDES = [0xf4f7f7, 0xe3eeed, 0xf4f7f7, 0xd8efeb];   // 옆면 — 하양과 옅은 민트를 번갈아(층이 보이게)
const ROT = Math.PI * 0.75;   // 얼굴 위쪽이 화면 위로 — 그림과 칼선이 같은 값
const OFFSET = new THREE.Vector3(-300, 290, -300);

/* 층 윗면 그림 맞춤 — 칼선 점(층 가운데 기준) → 얼굴 그림. ox, oz 는 이 층 얼굴이 원래 자리에서 밀린 만큼 */
function fitTop(tex, t) {
  tex.repeat.set(1 / FULL, -1 / FULL);
  tex.offset.set((t.cx - (t.ox || 0) + FULL / 2) / FULL, 1 - (t.cz - (t.oz || 0) + FULL / 2) / FULL);
}

export class PamiStack {
  constructor(container, { onScore, onPerfect, onOver } = {}) {
    this.container = container;
    this.cb = { onScore, onPerfect, onOver };
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.cssText = "position:absolute;inset:0;z-index:0;display:block;width:100%;height:100%;touch-action:none";
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 3000);
    this.watch = new THREE.Vector3(0, 0, 0);
    this.camFrom = new THREE.Vector3(); this.camTo = new THREE.Vector3(); this.camT = 1;
    this.camScale = 1;

    this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x2a4a50, 1.1));
    const sun = new THREE.DirectionalLight(0xffe7c4, 2.2);
    sun.position.set(-1, 1.75, -0.5).multiplyScalar(160);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 10, far: 900 });
    sun.shadow.bias = -0.0006;
    this.sun = sun; this.scene.add(sun); this.scene.add(sun.target);

    /* 윗면 그림은 한 장, 층마다 자리만 다르게 잘라 씀 */
    this.faceTex = new THREE.CanvasTexture(drawFace(document.createElement("canvas"), { rot: ROT, edge: false, white: true }));
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    this.faceTex.anisotropy = 4;
    this.head = towerHead(ROT);
    this.sideMats = SIDES.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));

    /* 받침 — 첫 층 아래 긴 빵 기둥 */
    this.base = this.makeTile({ cx: 0, cz: 0, sx: FULL, sz: FULL, ox: 0, oz: 0 }, 0, 400);
    const stand = new THREE.MeshStandardMaterial({ color: 0x7fd3c7, roughness: 0.55 });
    this.base.material = [this.base.material[0], stand];
    this.base.position.y = -200 + H / 2;
    this.scene.add(this.base);

    this.makeSnow();
    this.tiles = []; this.falling = []; this.effects = [];
    this.playing = false; this.moving = null;
    this.prev = { cx: 0, cz: 0, sx: FULL, sz: FULL, ox: 0, oz: 0 };
    this.index = 0; this.combo = 0;

    this.onDown = (e) => { e.preventDefault(); this.tap(); };
    this.renderer.domElement.addEventListener("pointerdown", this.onDown);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.setWatch(0, true);
    this.clock = new THREE.Clock();
    this.loop = () => { this.raf = requestAnimationFrame(this.loop); this.update(Math.min(0.05, this.clock.getDelta())); };
    this.loop();
    if (import.meta.env?.DEV) window.__pamiStack = this;   /* 개발 서버에서만 — 창이 가려져 그리기가 멈출 때 손으로 돌려 확인 */
  }

  /* 한 층 메시: 파미 칼선을 이 층 사각 범위로 자른 모양. 윗면 = 얼굴 그림, 옆면 = 하양 · 옅은 민트 */
  makeTile(t, index, height = H) {
    const ox = t.ox || 0, oz = t.oz || 0;
    const poly = clipRect(this.head.map(([x, z]) => [x + ox, z + oz]), t.cx - t.sx / 2, t.cx + t.sx / 2, t.cz - t.sz / 2, t.cz + t.sz / 2);
    let geo;
    if (poly.length >= 3) {
      const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x - t.cx, z - t.cz)));
      geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 1 });
      geo.rotateX(Math.PI / 2);          // 모양 (x, y) → 바닥 (x, z), 윗면이 y = 0, 아래로 height
      geo.translate(0, height / 2, 0);
    } else {
      geo = new THREE.BufferGeometry();
    }
    const top = this.faceTex.clone();
    top.needsUpdate = true;
    fitTop(top, t);
    const topMat = new THREE.MeshStandardMaterial({ map: top, roughness: 0.5 });
    const side = this.sideMats[index % this.sideMats.length];
    const m = new THREE.Mesh(geo, [topMat, side]);
    m.position.set(t.cx, index * H, t.cz);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.topMat = topMat;
    return m;
  }

  disposeMesh(m) {
    m.geometry.dispose();
    if (m.userData.topMat) { m.userData.topMat.map.dispose(); m.userData.topMat.dispose(); }
    if (m.userData.fadeMats) m.userData.fadeMats.forEach((x) => x.dispose());
  }

  makeSnow() {
    const c = document.createElement("canvas"); c.width = c.height = 32;
    const g = c.getContext("2d"); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
    const n = 220, pos = new Float32Array(n * 3);
    this.snowV = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 600; pos[i * 3 + 1] = Math.random() * 600 - 150; pos[i * 3 + 2] = (Math.random() - 0.5) * 600;
      this.snowV[i] = 18 + Math.random() * 26;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const tex = new THREE.CanvasTexture(c);
    this.snow = new THREE.Points(geo, new THREE.PointsMaterial({ size: 4.5, map: tex, transparent: true, depthWrite: false, opacity: 0.9 }));
    this.scene.add(this.snow);
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.camScale = 0.78 * Math.min(1.9, Math.max(1, 0.95 / this.camera.aspect));   // 파미 칼선은 네모보다 작아 보여 조금 당김
    this.setWatch(this.watch.y, true);
  }

  setWatch(y, now = false) {
    this.watch.set(0, y, 0);
    const dest = this.watch.clone().add(OFFSET.clone().multiplyScalar(this.camScale));
    this.camFrom.copy(this.camera.position); this.camTo.copy(dest); this.camT = 0;
    if (now) { this.camera.position.copy(dest); this.camT = 1; }
    this.camera.lookAt(this.watch.x, this.watch.y + 18, this.watch.z);
    this.sun.position.set(-1, 1.75, -0.5).multiplyScalar(160).add(this.watch);
    this.sun.target.position.copy(this.watch);
  }

  /* 새 판 */
  start() {
    [...this.tiles, ...this.falling.map((f) => f.mesh)].forEach((m) => { this.scene.remove(m); this.disposeMesh(m); });
    this.effects.forEach((e) => { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); });
    if (this.moving) { this.scene.remove(this.moving.mesh); this.disposeMesh(this.moving.mesh); }
    this.tiles = []; this.falling = []; this.effects = []; this.moving = null;
    this.prev = { cx: 0, cz: 0, sx: FULL, sz: FULL, ox: 0, oz: 0 };
    this.index = 0; this.combo = 0; this.score = 0; this.shield = false;
    this.setWatch(0);
    this.playing = true;
    this.cb.onScore?.(0, 0);
    this.cb.onShield?.(false);
    this.spawnMoving();
  }

  spawnMoving(again = false) {
    if (!again) this.index += 1;
    const axis = this.index % 2 === 0 ? "x" : "z";
    const t = { ...this.prev };
    const side = spawnSide(this.index, Math.random());
    t[axis === "x" ? "cx" : "cz"] = side * RANGE;
    t.ox = this.prev.ox + (t.cx - this.prev.cx); t.oz = this.prev.oz + (t.cz - this.prev.cz);   // 얼굴도 같이 밀려 있음
    const mesh = this.makeTile(t, this.index);
    this.scene.add(mesh);
    this.moving = { mesh, axis, dir: -side, t };
  }

  /* 누르면 내려놓기 */
  tap() {
    if (!this.playing || !this.moving) return;
    const { mesh } = this.moving;
    const r = cutTile(this.prev, { cx: mesh.position.x, cz: mesh.position.z });
    const shift = { ox: this.prev.ox + (mesh.position.x - this.prev.cx), oz: this.prev.oz + (mesh.position.z - this.prev.cz) };
    this.scene.remove(mesh); this.disposeMesh(mesh); this.moving = null;
    if (r.miss) {
      /* 통째로 떨어뜨림. 실드가 있으면 쓰고 같은 층을 다시, 없으면 끝 */
      const t = { ...this.prev, cx: mesh.position.x, cz: mesh.position.z, ...shift };
      this.drop(t, this.index, 1);
      this.combo = 0;
      if (this.shield) {
        this.shield = false;
        this.cb.onShield?.(false, "used");
        this.spawnMoving(true);
        return;
      }
      this.playing = false;
      const floors = this.index - 1, score = this.score;
      setTimeout(() => this.cb.onOver?.(floors, score), 1000);
      return;
    }
    let placed = r.perfect ? { ...r.placed } : { ...r.placed, ...shift };
    if (r.perfect) {
      this.combo += 1;
      placed = grow(placed, this.combo);
      this.spawnRing(this.prev);
      this.cb.onPerfect?.(this.combo);
      if (earnsShield(this.combo, this.shield)) { this.shield = true; this.cb.onShield?.(true, "got"); }
    } else {
      this.combo = 0;
      this.drop({ ...r.piece, ...shift }, this.index, 0);
    }
    const tile = this.makeTile(placed, this.index);
    this.scene.add(tile); this.tiles.push(tile);
    this.prev = placed;
    this.score += floorPoints(r.perfect, this.combo);
    this.cb.onScore?.(this.index, this.score);
    this.setWatch(this.index * H);
    this.spawnMoving();
  }

  drop(t, index, push) {
    const m = this.makeTile(t, index);
    const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => { const c = x.clone(); c.transparent = true; return c; });
    m.material = mats; m.userData.fadeMats = mats;
    this.scene.add(m);
    const away = new THREE.Vector3(t.cx - this.prev.cx, 0, t.cz - this.prev.cz).normalize();
    this.falling.push({ mesh: m, vy: 20 + push * 30, v: away.multiplyScalar(40 + push * 20), spin: new THREE.Vector3(away.z, 0, -away.x).multiplyScalar(2.2), age: 0 });
  }

  spawnRing(t) {
    const geo = new THREE.PlaneGeometry(t.sx + 8, t.sz + 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xa7e4dd, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(t.cx, (this.index - 1) * H + H / 2 + 0.6, t.cz);
    this.scene.add(mesh);
    this.effects.push({ mesh, age: 0 });
  }

  update(dt) {
    if (this.moving) {
      const { mesh, axis } = this.moving;
      mesh.position[axis] += dt * speedFor(this.index) * this.moving.dir;
      if (Math.abs(mesh.position[axis]) >= RANGE) {
        mesh.position[axis] = Math.sign(mesh.position[axis]) * RANGE;
        this.moving.dir *= -1;
      }
    }
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.age += dt; f.vy -= 420 * dt;
      f.mesh.position.y += f.vy * dt;
      f.mesh.position.addScaledVector(f.v, dt);
      f.mesh.rotation.x += f.spin.x * dt; f.mesh.rotation.z += f.spin.z * dt;
      if (f.age > 0.9) f.mesh.userData.fadeMats.forEach((m) => (m.opacity = Math.max(0, 1 - (f.age - 0.9) / 0.6)));
      if (f.age > 1.5) { this.scene.remove(f.mesh); this.disposeMesh(f.mesh); this.falling.splice(i, 1); }
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.age += dt;
      const k = e.age / 0.45;
      e.mesh.scale.setScalar(1 + k * 0.35);
      e.mesh.material.opacity = Math.max(0, 0.95 * (1 - k));
      if (k >= 1) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); this.effects.splice(i, 1); }
    }
    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / 0.5);
      const s = this.camT * this.camT * (3 - 2 * this.camT);
      this.camera.position.lerpVectors(this.camFrom, this.camTo, s);
      this.camera.lookAt(this.watch.x, this.watch.y + 18, this.watch.z);
    }
    const pos = this.snow.geometry.attributes.position;
    for (let i = 0; i < this.snowV.length; i++) {
      let y = pos.array[i * 3 + 1] - this.snowV[i] * dt;
      if (y < this.watch.y - 200) y += 600;
      pos.array[i * 3 + 1] = y;
    }
    pos.needsUpdate = true;
    this.snow.position.set(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.renderer.domElement.removeEventListener("pointerdown", this.onDown);
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    this.faceTex.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
