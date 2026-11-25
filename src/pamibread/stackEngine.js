/* 파미빵 타이쿤 — 쌓기 엔진.
 * 원작: Stack by Konrad Linkowski (https://github.com/KonradLinkowski/Stack), MIT License — 전문은 LICENSE-stack.txt.
 * 바꾼 것: 상자 색 → 파미 얼굴을 구운 빵(윗면 그림이 자리에 고정돼 잘리면 얼굴도 같이 잘림), 잘린 조각은 떨어짐,
 * 퍼펙트 연속이면 다시 넓어짐, 눈, 그림자, 터치(pointerdown), 컨테이너 크기에 맞춤, 시작 · 끝 콜백. */
import * as THREE from "three";
import { cutTile, grow, speedFor, FULL } from "./cut.js";
import { drawFace, drawSide } from "./faceTexture.js";

const H = 16;                 // 한 층 두께
const RANGE = 110;            // 움직이는 폭
const SHADES = [["#C47A33", "#FBE6BC"], ["#B96F2B", "#F8E0B0"], ["#CC8540", "#FCEAC6"], ["#BF7631", "#F9E3B6"]];
const OFFSET = new THREE.Vector3(-300, 290, -300);

/* 윗면 그림을 세계 자리에 고정 — 층이 어디 있든 그 자리의 얼굴 조각이 보인다 */
function placeTop(tex, t) {
  tex.repeat.set(t.sx / FULL, t.sz / FULL);
  tex.offset.set((t.cx - t.sx / 2 + FULL / 2) / FULL, 1 - (t.cz + t.sz / 2 + FULL / 2) / FULL);
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
    this.faceTex = new THREE.CanvasTexture(drawFace(document.createElement("canvas")));
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    this.faceTex.anisotropy = 4;
    this.sideMats = SHADES.map(([a, b]) => {
      const t = new THREE.CanvasTexture(drawSide(document.createElement("canvas"), a, b));
      t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.78 });
    });

    /* 받침 — 첫 층 아래 긴 빵 기둥 */
    this.base = this.makeTile({ cx: 0, cz: 0, sx: FULL, sz: FULL }, 0, 400);
    const stand = new THREE.MeshStandardMaterial({ color: 0x7fd3c7, roughness: 0.55 });
    this.base.material = this.base.material.map((m, i) => (i === 2 ? m : stand));
    this.base.position.y = -200 + H / 2;
    this.scene.add(this.base);

    this.makeSnow();
    this.tiles = []; this.falling = []; this.effects = [];
    this.playing = false; this.moving = null;
    this.prev = { cx: 0, cz: 0, sx: FULL, sz: FULL };
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

  /* 한 층 메시: 옆면 4 · 윗면(얼굴 조각) · 아랫면 */
  makeTile(t, index, height = H) {
    const geo = new THREE.BoxGeometry(t.sx, height, t.sz);
    const top = this.faceTex.clone();
    top.needsUpdate = true;
    placeTop(top, t);
    const topMat = new THREE.MeshStandardMaterial({ map: top, roughness: 0.62 });
    const side = this.sideMats[index % this.sideMats.length];
    const m = new THREE.Mesh(geo, [side, side, topMat, side, side, side]);
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
    this.camScale = Math.min(1.9, Math.max(1, 0.95 / this.camera.aspect));
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
    this.prev = { cx: 0, cz: 0, sx: FULL, sz: FULL };
    this.index = 0; this.combo = 0;
    this.setWatch(0);
    this.playing = true;
    this.cb.onScore?.(0);
    this.spawnMoving();
  }

  spawnMoving() {
    this.index += 1;
    const axis = this.index % 2 === 0 ? "x" : "z";
    const t = { ...this.prev };
    t[axis === "x" ? "cx" : "cz"] = -RANGE;
    const mesh = this.makeTile(t, this.index);
    this.scene.add(mesh);
    this.moving = { mesh, axis, dir: 1, t };
  }

  /* 누르면 내려놓기 */
  tap() {
    if (!this.playing || !this.moving) return;
    const { mesh } = this.moving;
    const r = cutTile(this.prev, { cx: mesh.position.x, cz: mesh.position.z });
    this.scene.remove(mesh); this.disposeMesh(mesh); this.moving = null;
    if (r.miss) {
      /* 통째로 떨어뜨리고 끝 */
      const t = { ...this.prev, cx: mesh.position.x, cz: mesh.position.z };
      this.drop(t, this.index, 1);
      this.playing = false;
      const floors = this.index - 1;
      setTimeout(() => this.cb.onOver?.(floors), 1000);
      return;
    }
    let placed = r.placed;
    if (r.perfect) {
      this.combo += 1;
      placed = grow(placed, this.combo);
      this.spawnRing(this.prev);
      this.cb.onPerfect?.(this.combo);
    } else {
      this.combo = 0;
      this.drop(r.piece, this.index, 0);
    }
    const tile = this.makeTile(placed, this.index);
    this.scene.add(tile); this.tiles.push(tile);
    this.prev = placed;
    this.cb.onScore?.(this.index);
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
      const tt = this.moving.t; tt.cx = mesh.position.x; tt.cz = mesh.position.z;
      placeTop(mesh.userData.topMat.map, tt);
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
