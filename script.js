import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ================= 基本セットアップ ================= */
const container = document.getElementById('scene-container');
const loadingEl = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc3e8);
scene.fog = new THREE.Fog(0x9fc3e8, 260, 620);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(95, 62, 150);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 52, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 35;
controls.maxDistance = 380;
controls.minPolarAngle = 0;            // 真上から見下ろせる
controls.maxPolarAngle = Math.PI / 2 - 0.03; // 地面の下には潜らない
controls.autoRotateSpeed = 0.8;

/* ================= 乱数（決定的） ================= */
let seed = 1234567;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
function noise2(x, z) {
  return Math.sin(x * 0.31 + Math.sin(z * 0.23) * 2.1) * Math.cos(z * 0.27 + Math.sin(x * 0.19) * 1.7);
}

/* ================= 手続きテクスチャ ================= */
function canvasTexture(size, painter, repeatX, repeatY) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  painter(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX || 1, repeatY || 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function speckle(ctx, size, colors, count, rMin, rMax) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.globalAlpha = 0.12 + rand() * 0.25;
    const r = rMin + rand() * (rMax - rMin);
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* 石壁：石のブロック目地＋色むら */
const stoneTex = canvasTexture(512, (ctx, s) => {
  ctx.fillStyle = '#a4916f'; ctx.fillRect(0, 0, s, s);
  speckle(ctx, s, ['#8f7c5c', '#b7a582', '#97835f', '#c0ae8a'], 2600, 2, 9);
  ctx.strokeStyle = 'rgba(70,58,40,0.55)'; ctx.lineWidth = 3;
  const rows = 8, rh = s / rows;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * rh); ctx.lineTo(s, r * rh); ctx.stroke();
    const cols = 4, cw = s / cols, off = (r % 2) * cw / 2;
    for (let col = 0; col <= cols; col++) {
      ctx.beginPath(); ctx.moveTo(col * cw + off, r * rh); ctx.lineTo(col * cw + off, (r + 1) * rh); ctx.stroke();
    }
  }
}, 2, 2);

/* 屋根：スレートの鱗状パターン */
const slateTex = canvasTexture(512, (ctx, s) => {
  ctx.fillStyle = '#454e5e'; ctx.fillRect(0, 0, s, s);
  speckle(ctx, s, ['#39414f', '#525d70', '#2f3642'], 1500, 2, 7);
  ctx.strokeStyle = 'rgba(18,22,30,0.6)'; ctx.lineWidth = 2;
  const rows = 10, rh = s / rows;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * rh); ctx.lineTo(s, r * rh); ctx.stroke();
    const cols = 6, cw = s / cols, off = (r % 2) * cw / 2;
    for (let col = 0; col <= cols; col++) {
      ctx.beginPath(); ctx.moveTo(col * cw + off, r * rh); ctx.lineTo(col * cw + off, (r + 1) * rh); ctx.stroke();
    }
  }
}, 3, 3);

/* 岩肌：地層とひび */
const rockTex = canvasTexture(512, (ctx, s) => {
  ctx.fillStyle = '#7d7264'; ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 6) {
    ctx.fillStyle = ['#6e6355', '#8a7e6d', '#756a59', '#93876f'][Math.floor(rand() * 4)];
    ctx.globalAlpha = 0.25 + rand() * 0.3;
    ctx.fillRect(0, y, s, 3 + rand() * 5);
  }
  ctx.globalAlpha = 1;
  speckle(ctx, s, ['#5d5346', '#998b74', '#6b6051'], 2200, 2, 8);
  ctx.strokeStyle = 'rgba(40,34,26,0.35)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    let x = rand() * s, y = rand() * s;
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) { x += (rand() - 0.5) * 40; y += rand() * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  }
}, 4, 2);

/* 地面：草地＋土のまだら */
const groundTex = canvasTexture(1024, (ctx, s) => {
  ctx.fillStyle = '#5d7a3d'; ctx.fillRect(0, 0, s, s);
  speckle(ctx, s, ['#4c6630', '#6d8c49', '#55703a', '#79975a', '#87743f'], 9000, 3, 14);
  ctx.strokeStyle = 'rgba(60,80,35,0.35)'; ctx.lineWidth = 1;
  for (let i = 0; i < 2600; i++) {
    const x = rand() * s, y = rand() * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 3, y - 3 - rand() * 5); ctx.stroke();
  }
}, 18, 18);

/* 木材 */
const woodTex = canvasTexture(256, (ctx, s) => {
  ctx.fillStyle = '#6e4f30'; ctx.fillRect(0, 0, s, s);
  for (let x = 0; x < s; x += 5) {
    ctx.fillStyle = ['#5f4227', '#7d5a38', '#68492c'][Math.floor(rand() * 3)];
    ctx.globalAlpha = 0.3 + rand() * 0.3;
    ctx.fillRect(x, 0, 2 + rand() * 3, s);
  }
  ctx.globalAlpha = 1;
}, 1, 1);

/* ================= マテリアル ================= */
const stoneMat  = new THREE.MeshStandardMaterial({ map: stoneTex, bumpMap: stoneTex, bumpScale: 0.6, roughness: 0.95 });
const stoneDark = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xbdb09a, bumpMap: stoneTex, bumpScale: 0.5, roughness: 1 });
const slateMat  = new THREE.MeshStandardMaterial({ map: slateTex, bumpMap: slateTex, bumpScale: 0.4, roughness: 0.85 });
const rockMat   = new THREE.MeshStandardMaterial({ map: rockTex, bumpMap: rockTex, bumpScale: 1.2, roughness: 1, flatShading: true });
const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 });
const woodMat   = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9 });
const windowMat = new THREE.MeshStandardMaterial({ color: 0x2b2118, emissive: 0xffb84d, emissiveIntensity: 0.25, roughness: 0.4 });
const leafMat   = new THREE.MeshStandardMaterial({ color: 0x39543a, roughness: 1, flatShading: true });
const leafMat2  = new THREE.MeshStandardMaterial({ color: 0x476b41, roughness: 1, flatShading: true });
const trunkMat  = new THREE.MeshStandardMaterial({ color: 0x5a4230, roughness: 1 });

function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

/* ================= ライティング ================= */
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x6a7a52, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
sun.position.set(120, 160, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -170; sun.shadow.camera.right = 170;
sun.shadow.camera.top = 170; sun.shadow.camera.bottom = -170;
sun.shadow.camera.far = 600;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);

/* ================= 地面（見える範囲いっぱいの地形） ================= */
const groundGeo = new THREE.CircleGeometry(700, 96, 0, Math.PI * 2);
groundGeo.rotateX(-Math.PI / 2);
{
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z);
    // 城山のふもと付近は平らにし、遠くほど緩やかな丘にする
    const h = d < 130 ? 0 : noise2(x * 0.05, z * 0.05) * Math.min((d - 130) * 0.06, 9);
    pos.setY(i, h - 0.15);
  }
  groundGeo.computeVertexNormals();
}
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);

/* ================= 岩山 ================= */
const PLATEAU_Y = 36;
const rockGeo = new THREE.CylinderGeometry(46, 118, PLATEAU_Y, 72, 10);
{
  const pos = rockGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const d = Math.hypot(x, z);
    if (d > 1) {
      const n = noise2(x * 0.08, z * 0.08 + y * 0.05) * 5.5 + noise2(x * 0.3, z * 0.3) * 1.6;
      const s = (d + n) / d;
      pos.setX(i, x * s); pos.setZ(i, z * s);
    }
  }
  rockGeo.computeVertexNormals();
}
const rock = shadowed(new THREE.Mesh(rockGeo, rockMat));
rock.position.y = PLATEAU_Y / 2;
scene.add(rock);

/* 山頂の平地（城の敷地） */
const plateau = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(52, 50, 3, 48), groundMat));
plateau.position.y = PLATEAU_Y + 1.5;
scene.add(plateau);

/* ================= 城 ================= */
const castle = new THREE.Group();
castle.position.y = PLATEAU_Y + 3;
scene.add(castle);

function addBattlements(parent, width, depth, y) {
  const size = 1.4, gap = 2.6;
  const geo = new THREE.BoxGeometry(size, 1.5, size);
  const nx = Math.floor(width / gap), nz = Math.floor(depth / gap);
  for (let i = 0; i <= nx; i++) {
    const x = -width / 2 + i * gap;
    for (const zSign of [-1, 1]) {
      const m = shadowed(new THREE.Mesh(geo, stoneDark));
      m.position.set(x, y, zSign * depth / 2); parent.add(m);
    }
  }
  for (let i = 1; i < nz; i++) {
    const z = -depth / 2 + i * gap;
    for (const xSign of [-1, 1]) {
      const m = shadowed(new THREE.Mesh(geo, stoneDark));
      m.position.set(xSign * width / 2, y, z); parent.add(m);
    }
  }
}

function addWindow(parent, x, y, z, ry) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.6), windowMat);
  w.position.set(x, y, z);
  w.rotation.y = ry || 0;
  parent.add(w);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.0, 0.25), stoneDark);
  frame.position.set(x, y, z);
  frame.rotation.y = ry || 0;
  frame.translateZ(-0.16);
  parent.add(frame);
}

/* 塔：円筒＋円錐屋根＋周囲の窓 */
function makeTower(x, z, r, h, roofH, opts) {
  opts = opts || {};
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, h, 20), stoneMat));
  body.position.y = h / 2;
  g.add(body);
  // 屋根の下の張り出し（コーベル）
  const collar = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 0.98, 2.2, 20), stoneDark));
  collar.position.y = h + 1.1;
  g.add(collar);
  const roof = shadowed(new THREE.Mesh(new THREE.ConeGeometry(r * 1.22, roofH, 20), slateMat));
  roof.position.y = h + 2.2 + roofH / 2;
  g.add(roof);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), slateMat);
  finial.position.y = h + 2.2 + roofH + 0.4;
  g.add(finial);
  // 窓を数方向に
  const levels = opts.windowLevels || [0.45, 0.72];
  for (const lv of levels) {
    const wy = h * lv;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (opts.angleOffset || 0) + lv * 2;
      const rr = r * 0.96 + 0.08;
      addWindow(g, Math.cos(a) * rr, wy, Math.sin(a) * rr, -a + Math.PI / 2 + Math.PI);
    }
  }
  castle.add(g);
  return g;
}

/* 中央の大塔 */
makeTower(2, -14, 7.5, 34, 17, { windowLevels: [0.35, 0.58, 0.8] });
/* 大塔の小塔（てっぺん横） */
makeTower(9.5, -19, 2.4, 40, 8, { windowLevels: [0.85] });
/* 右の塔の群れ */
makeTower(26, -6, 5.2, 27, 13, { windowLevels: [0.4, 0.7] });
makeTower(35, 4, 4.2, 21, 11, { windowLevels: [0.5, 0.78] });
makeTower(20, 8, 3.6, 17, 9, { windowLevels: [0.55] });
makeTower(32, -16, 3.8, 24, 12, { windowLevels: [0.45, 0.72] });
/* 左奥と手前の小塔 */
makeTower(-30, -12, 4.4, 20, 11, { windowLevels: [0.45, 0.72] });
makeTower(-24, 12, 3.4, 15, 8, { windowLevels: [0.55] });

/* 大広間の棟（左）：箱＋切妻屋根 */
{
  const hall = new THREE.Group();
  hall.position.set(-22, 0, -2);
  hall.rotation.y = 0.06;
  const body = shadowed(new THREE.Mesh(new THREE.BoxGeometry(30, 13, 14), stoneMat));
  body.position.y = 6.5;
  hall.add(body);
  // 切妻屋根（三角柱）
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-8.6, 0); roofShape.lineTo(8.6, 0); roofShape.lineTo(0, 6.4); roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 31.5, bevelEnabled: false });
  roofGeo.rotateY(Math.PI / 2);
  const roof = shadowed(new THREE.Mesh(roofGeo, slateMat));
  roof.position.set(-15.75, 13, 0);
  hall.add(roof);
  addBattlements(hall, 30, 14, 13.4);
  // 窓の列（長辺の両側）
  for (let i = 0; i < 6; i++) {
    const x = -12.5 + i * 5;
    addWindow(hall, x, 7, 7.06, 0);
    addWindow(hall, x, 7, -7.06, Math.PI);
  }
  // 煙突
  for (const cx of [-9, 6]) {
    const ch = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2, 5, 2), stoneDark));
    ch.position.set(cx, 18.5, 0); hall.add(ch);
  }
  castle.add(hall);
}

/* 塔をつなぐ城壁 */
function makeWall(x, z, len, h, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = ry || 0;
  const w = shadowed(new THREE.Mesh(new THREE.BoxGeometry(len, h, 3.4), stoneMat));
  w.position.y = h / 2;
  g.add(w);
  addBattlements(g, len, 3.4, h + 0.6);
  castle.add(g);
  return g;
}
makeWall(15, -11, 20, 13, 0.5);
makeWall(28, 12, 18, 10, -0.35);
makeWall(-6, 14, 26, 11, 0.08);
makeWall(-33, 2, 16, 10, Math.PI / 2 - 0.1);

/* 正面の門と城壁 */
{
  const gate = new THREE.Group();
  gate.position.set(4, 0, 24);
  const wallL = shadowed(new THREE.Mesh(new THREE.BoxGeometry(15, 12, 3.6), stoneMat));
  wallL.position.set(-11.5, 6, 0); gate.add(wallL);
  const wallR = wallL.clone(); wallR.position.x = 11.5; gate.add(wallR);
  const top = shadowed(new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 3.6), stoneMat));
  top.position.set(0, 14.2, 0); gate.add(top);
  addBattlements(gate, 30, 3.6, 12.4);
  // アーチ型の門口（暗い面＋木の扉）
  const arch = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 9.5), new THREE.MeshStandardMaterial({ color: 0x191410, roughness: 1 }));
  arch.position.set(0, 4.75, 1.83); gate.add(arch);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 8.6), woodMat);
  door.position.set(0, 4.3, 1.9); gate.add(door);
  castle.add(gate);
  makeTower(-9, 25, 3.6, 16, 9, { windowLevels: [0.55] });
  makeTower(17, 25, 3.6, 16, 9, { windowLevels: [0.55] });
}

/* ================= 山腹の階段道 ================= */
{
  const stairMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xcac0aa, roughness: 1 });
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    // 正面やや右へ、ジグザグに下る
    const x = 10 + Math.sin(t * Math.PI * 1.6) * 14 + t * 10;
    const z = 44 + t * 52;
    const y = PLATEAU_Y + 2 - t * (PLATEAU_Y + 1);
    const step = shadowed(new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, 3.4), stairMat));
    step.position.set(x, y, z);
    step.rotation.y = Math.cos(t * Math.PI * 1.6) * 0.5;
    scene.add(step);
  }
}

/* ================= ふもとの小屋 ================= */
{
  const hut = new THREE.Group();
  hut.position.set(58, 0, 74);
  hut.rotation.y = -0.5;
  const body = shadowed(new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), stoneMat));
  body.position.y = 3; hut.add(body);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-5.2, 0); roofShape.lineTo(5.2, 0); roofShape.lineTo(0, 4); roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 11, bevelEnabled: false });
  roofGeo.rotateY(Math.PI / 2);
  const roof = shadowed(new THREE.Mesh(roofGeo, slateMat));
  roof.position.set(-5.5, 6, 0); hut.add(roof);
  const spire = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 6, 10), stoneMat));
  spire.position.set(3.6, 9, 2.6); hut.add(spire);
  const spireRoof = shadowed(new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.4, 10), slateMat));
  spireRoof.position.set(3.6, 14.2, 2.6); hut.add(spireRoof);
  addWindow(hut, 0, 3.2, 4.06, 0);
  scene.add(hut);
}

/* ================= 木々と岩 ================= */
{
  const foliageGeo = new THREE.ConeGeometry(3.2, 8.5, 8);
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 2.6, 6);
  const treeCount = 130;
  const foliage = new THREE.InstancedMesh(foliageGeo, leafMat, treeCount * 2);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const dummy = new THREE.Object3D();
  let placed = 0, guard = 0;
  while (placed < treeCount && guard++ < 3000) {
    const a = rand() * Math.PI * 2;
    const d = 95 + rand() * 260;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (z > 30 && Math.abs(x - 22) < 20 && d < 190) continue; // 階段道のあたりは空ける
    const s = 0.75 + rand() * 0.9;
    dummy.position.set(x, 1.2 * s, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = rand() * Math.PI;
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = (2.6 + 4.2) * s;
    dummy.updateMatrix();
    foliage.setMatrixAt(placed * 2, dummy.matrix);
    dummy.position.y = (2.6 + 7.6) * s;
    dummy.scale.setScalar(s * 0.68);
    dummy.updateMatrix();
    foliage.setMatrixAt(placed * 2 + 1, dummy.matrix);
    placed++;
  }
  foliage.count = placed * 2; trunks.count = placed;
  foliage.castShadow = true; trunks.castShadow = true;
  scene.add(foliage); scene.add(trunks);

  const rockGeoS = new THREE.DodecahedronGeometry(2.4, 0);
  const rocks = new THREE.InstancedMesh(rockGeoS, rockMat, 60);
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2;
    const d = 90 + rand() * 240;
    dummy.position.set(Math.cos(a) * d, 0.8, Math.sin(a) * d);
    dummy.scale.set(0.6 + rand() * 1.8, 0.5 + rand() * 1.1, 0.6 + rand() * 1.8);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.castShadow = true; rocks.receiveShadow = true;
  scene.add(rocks);
}

/* ================= 雲と星 ================= */
const clouds = new THREE.Group();
{
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, roughness: 1, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const cl = new THREE.Group();
    const n = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(6 + rand() * 7, 10, 8), cloudMat);
      s.position.set(j * 7 - n * 3.2, rand() * 2.4, rand() * 5);
      s.scale.y = 0.45;
      cl.add(s);
    }
    const a = rand() * Math.PI * 2, d = 200 + rand() * 260;
    cl.position.set(Math.cos(a) * d, 120 + rand() * 70, Math.sin(a) * d);
    clouds.add(cl);
  }
}
scene.add(clouds);

let stars;
{
  const n = 900, posArr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, e = rand() * Math.PI * 0.48 + 0.05, d = 850;
    posArr[i * 3] = Math.cos(a) * Math.cos(e) * d;
    posArr[i * 3 + 1] = Math.sin(e) * d;
    posArr[i * 3 + 2] = Math.sin(a) * Math.cos(e) * d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 }));
  scene.add(stars);
}

/* ================= 時間帯プリセット ================= */
const presets = {
  day:   { bg: 0x9fc3e8, fog: 0x9fc3e8, sun: 0xfff1d6, sunI: 2.2, hemiI: 0.9, win: 0.25, stars: 0, sunPos: [120, 160, 80], exposure: 1.05 },
  dusk:  { bg: 0xe8a56b, fog: 0xe0a06a, sun: 0xff9a3c, sunI: 1.7, hemiI: 0.55, win: 1.6, stars: 0.15, sunPos: [-150, 46, 60], exposure: 1.0 },
  night: { bg: 0x0d1830, fog: 0x0d1830, sun: 0x9db8ff, sunI: 0.5, hemiI: 0.22, win: 2.6, stars: 1, sunPos: [-80, 140, -60], exposure: 0.95 }
};
let currentPreset = presets.day;
let targetPreset = presets.day;
function applyPreset(name) {
  targetPreset = presets[name];
  document.querySelectorAll('[data-time]').forEach(b => b.classList.toggle('active', b.dataset.time === name));
}
document.querySelectorAll('[data-time]').forEach(b => {
  b.addEventListener('click', () => applyPreset(b.dataset.time));
});

/* ================= 視点プリセットと移動アニメ ================= */
const CENTER = new THREE.Vector3(0, 52, 0);
const views = {
  front: new THREE.Vector3(0, 58, 185),
  top:   new THREE.Vector3(0.01, 235, 0.01),
  side:  new THREE.Vector3(188, 60, 8),
  back:  new THREE.Vector3(-10, 66, -182),
  close: new THREE.Vector3(38, 88, 62)
};
let camTween = null;
function flyTo(pos) {
  camTween = {
    fromPos: camera.position.clone(), toPos: pos.clone(),
    fromTg: controls.target.clone(), toTg: CENTER.clone(),
    t: 0
  };
}
document.querySelectorAll('[data-view]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x === b));
    flyTo(views[b.dataset.view]);
  });
});
document.getElementById('resetView').addEventListener('click', () => flyTo(views.front));
const rotateBtn = document.getElementById('rotateToggle');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.textContent = '自動回転：' + (controls.autoRotate ? 'オン' : 'オフ');
  rotateBtn.setAttribute('aria-pressed', controls.autoRotate ? 'true' : 'false');
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

/* ================= 描画ループ ================= */
const clock = new THREE.Clock();
const tmpColor = new THREE.Color();
function lerpPreset(dt) {
  const k = Math.min(dt * 2.2, 1);
  tmpColor.setHex(targetPreset.bg);
  scene.background.lerp(tmpColor, k);
  scene.fog.color.copy(scene.background);
  sun.color.lerp(tmpColor.setHex(targetPreset.sun), k);
  sun.intensity += (targetPreset.sunI - sun.intensity) * k;
  hemi.intensity += (targetPreset.hemiI - hemi.intensity) * k;
  windowMat.emissiveIntensity += (targetPreset.win - windowMat.emissiveIntensity) * k;
  stars.material.opacity += (targetPreset.stars - stars.material.opacity) * k;
  renderer.toneMappingExposure += (targetPreset.exposure - renderer.toneMappingExposure) * k;
  sun.position.lerp(new THREE.Vector3(...targetPreset.sunPos), k);
  currentPreset = targetPreset;
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (camTween) {
    camTween.t += dt / 1.15;
    const t = Math.min(camTween.t, 1);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
    controls.target.lerpVectors(camTween.fromTg, camTween.toTg, e);
    if (t >= 1) camTween = null;
  }
  clouds.children.forEach((cl, i) => {
    cl.position.x += dt * (1.1 + (i % 4) * 0.3);
    if (cl.position.x > 520) cl.position.x = -520;
  });
  lerpPreset(dt);
  controls.update();
  renderer.render(scene, camera);
  if (loadingEl && !loadingEl.classList.contains('hidden')) loadingEl.classList.add('hidden');
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
