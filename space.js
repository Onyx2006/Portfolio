import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/* 1. CONFIG & PROJECT DATA */
const STAR_COUNT = 10000;
const STAR_GROUPS = 6;
const COMET_COUNT = 50;
const COMET_TRAIL_LENGTH = 40;
const SHOOTING_STAR_COUNT = 15;
const ACCRETION_FLOW_COUNT = 1100;
const DEBRIS_BELT_COUNT = 400;

const BLACK_HOLE_CORE_RADIUS = 50;
const BLACK_HOLE_DISK_INNER = 100;
const BLACK_HOLE_DISK_OUTER = 34;
const BLACK_HOLE_DEBRIS_INNER = 80;
const BLACK_HOLE_DEBRIS_OUTER = 62;
const BLACK_HOLE_ABSORB_RADIUS = 13;
const BLACK_HOLE_GRAVITY_RADIUS = 240;
const BLACK_HOLE_GRAVITY_STRENGTH = 15000;

const SUNS = [
  { position: new THREE.Vector3(340, 110, -230), size: 30, hue: 32 },
  { position: new THREE.Vector3(-420, 70, 280), size: 12, hue: 46 },
];

// FX budget for the electric-storm planet (clouds + lightning + asteroid
// shatter debris) — kept as named constants alongside the other FX counts.
const STORM_CLOUD_COUNT = 90;
const STORM_BOLT_COUNT = 18;
const STORM_FRAGMENT_COUNT = 90;

const PLANETS = [
  {
    id: "algorithms",
    kicker: "Project 01 — Algorithms",
    name: "ALGO::DASHBOARD",
    color: 0x38f2c8,
    emissive: 0x0a2b24,
    size: 10,
    orbitA: 190,
    orbitB: 156,
    speed: 0.05,
    tilt: 0.60,
    hasRing: true,
    ringColor: 0x66ffe0,
    hasAsteroids: true,
    circuit: true,
    description:
      "A dashboard designed to sharpen algorithmic thinking: pathfinding (BFS/A), a neuroevolutionary Snake, boids, Voronoi diagrams, Conway’s Game of Life, a sonified sorting visualizer, and an interactive Mandelbrot fractal — all built in vanilla JavaScript with Canvas2D, with no external dependencies.",
    tags: ["JavaScript", "Canvas2D", "A* Search", "Algoritmos Genéticos", "Fractales"],
    github: "https://github.com/Onyx2006/ALGO-DASHBOARD.git",
  },
  {
    id: "blastscript",
    kicker: "Project 02 — Language",
    name: "BLASTSCRIPT",
    color: 0x7c5cff,
    emissive: 0x140a33,
    size: 12,
    orbitA: 200,
    orbitB: 220,
    speed: 0.036,
    tilt: -0.1,
    hasMoon: true,
    ocean: true,
    description:
      "A custom programming language designed and compiled from scratch: its own lexer, parser, type checker, and interpreter/compiler, featuring a vocabulary inspired by arcade shooters.",
    tags: ["Compiladores", "TypeScript", "Lexing", "Parsing", "Type Checking"],
    github: "https://github.com/Onyx2006/BlastScript.git",
  },
  {
    id: "agora",
    kicker: "Project 03 — Infrastructure",
    name: "AGORA",
    color: 0xff4d33,
    emissive: 0x2a0a04,
    size: 9,
    orbitA: 171,
    orbitB: 195,
    speed: 0.027,
    tilt: 0.22,
    hasStorm: true,
    lava: true,
    description:
      "A blockchain-based electronic voting system designed to provide secure, transparent, and tamper-resistant elections, with decentralized vote verification and an auditable voting process.",
    tags: ["Networking", "Microservices", "Security", "Automation", "Monitoring", "Private"],
    github: "https://github.com/OnyxVariables/AGORA",
  },
  {
    id: "snake",
    kicker: "Project 04 — Game Dev",
    name: "Snake Evolution",
    color: 0xffb02e,
    emissive: 0x2e1800,
    size: 8,
    orbitA: 250,
    orbitB: 230,
    speed: 0.02,
    tilt: -0.18,
    hasRing: true,
    ringColor: 0xffd98a,
    hasAsteroids: true,
    hasLightning: true,
    bands: true,
    description:
      "A classic Snake game rebuilt with a modern twist: smooth controls, dynamic gameplay, increasing difficulty, and a polished interactive experience, all built on FLUTTER with Dart",
    tags: ["Game", "Funny", "Interactive", "Flutter", "Dart"],
    github: "https://github.com/Onyx2006/flutter-snake.git",
  },
  {
    id: "tempest",
    kicker: "Project 05 — Coming Soon",
    name: "TEMPEST",
    color: 0xfff066,
    emissive: 0x3a2f00,
    size: 12,
    orbitA: 300,
    orbitB: 258,
    speed: 0.017,
    tilt: 0.60,
    hasRing: true,
    ringColor: 0xfff2a3,
    hasAsteroids: true,
    hasElectricStorm: true,
    bands: true,
    upcoming: true,
    description:
      "This one is still taking shape. A permanent electrical storm rages through its cloud belt, arcing between the surrounding asteroids and shattering them into drifting debris. Full details, source, and write-up land here soon.",
    tags: ["Coming Soon"],
    github: null,
  },
];

/* 2. STATE */
const state = {
  initialized: false,
  active: false,
  animationId: null,

  scene: null,
  camera: null,
  renderer: null,
  composer: null,
  bloomPass: null,
  controls: null,
  clock: null,

  starGroups: [],
  suns: [],
  blackHole: null,
  accretionDisk: null,
  accretionDiskInner: null,
  accretionFlow: null,
  debrisBelt: null,
  comets: [],
  shootingStars: [],
  nextShootingStarAt: 2,
  deepSky: [],
  planetMeshes: [],

  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  focused: null,

  camDefaultPos: new THREE.Vector3(0, 95, 265),
  lookAtDefault: new THREE.Vector3(0, 0, 0),
  camTargetPos: new THREE.Vector3(),
  lookAtTarget: new THREE.Vector3(),
  isCameraTransitioning: false,
};

let dom = {};

/* 3. BOOTSTRAP — cheap: just wires the click listener, no WebGL yet */
function bootstrap() {
  dom = {
    launchBtn: document.getElementById("btn-universe-mode"),
    exitBtn: document.getElementById("btn-exit-universe"),
    container: document.getElementById("canvas-container"),
    loading: document.getElementById("universe-loading"),
    panel: document.getElementById("planet-info-panel"),
  };

  if (!dom.launchBtn || !dom.container) return;

  dom.launchBtn.addEventListener("click", enterUniverse);
  dom.exitBtn.addEventListener("click", exitUniverse);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

/* 4. ENTER / EXIT UNIVERSE MODE */
function enterUniverse() {
  document.body.classList.add("universe-mode-on");
  dom.container.classList.add("universe-active");
  dom.container.setAttribute("aria-hidden", "false");
  state.active = true;

  if (!state.initialized) {
    dom.loading.classList.remove("hidden");
    requestAnimationFrame(() => {
      initUniverse();
      dom.loading.classList.add("hidden");
      startRenderLoop();
    });
  } else {
    startRenderLoop();
  }
}

function exitUniverse() {
  document.body.classList.remove("universe-mode-on");
  dom.container.classList.remove("universe-active");
  dom.container.setAttribute("aria-hidden", "true");
  hidePanel();
  state.active = false;

  if (state.camera) {
    state.camera.position.copy(state.camDefaultPos);
    state.controls.target.copy(state.lookAtDefault);
    state.controls.update();
  }
  state.focused = null;
  state.isCameraTransitioning = false;

  stopRenderLoop();
}

function startRenderLoop() {
  if (state.animationId !== null) return;
  state.clock.getDelta();
  animate();
}

function stopRenderLoop() {
  if (state.animationId !== null) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
}

/* 5. SCENE INITIALIZATION (runs once, on first activation) */
function initUniverse() {
  const { container } = dom;

  state.scene = new THREE.Scene();
  state.scene.fog = new THREE.FogExp2(0x000005, 0.0012);

  state.camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    4000
  );
  state.camera.position.copy(state.camDefaultPos);

  state.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.setSize(container.clientWidth, container.clientHeight);
  state.renderer.setClearColor(0x000005, 1);
  state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state.renderer.toneMappingExposure = 1.0;
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.prepend(state.renderer.domElement);

  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableDamping = true;
  state.controls.dampingFactor = 0.06;
  state.controls.minDistance = 12;
  state.controls.maxDistance = 950;
  state.controls.target.copy(state.lookAtDefault);

  state.clock = new THREE.Clock();

  // Ambient/hemisphere fill so shadowed hemispheres never go pure black,
  // plus the suns (below) provide real directional + point lighting.
  state.scene.add(new THREE.AmbientLight(0x2a3550, 0.55));
  state.scene.add(new THREE.HemisphereLight(0x8899ff, 0x0a0614, 0.35));

  state.composer = new EffectComposer(state.renderer);
  state.composer.addPass(new RenderPass(state.scene, state.camera));
  state.bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0.8,  // strength
    0.4,  // radius
    0.4   // threshold — only the truly brightest pixels bloom
  );
  state.composer.addPass(state.bloomPass);
  state.composer.addPass(new OutputPass());

  createStarfield();
  createDeepSky();
  createSuns();
  createBlackHole();
  createAccretionFlow();
  createDebrisBelt();
  createComets();
  createShootingStars();
  createPlanets();

  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("click", onCanvasClick);
  window.addEventListener("resize", onResize);
  dom.panel.addEventListener("click", onPanelClick);

  state.initialized = true;
}

/* 6. TEXTURE HELPERS (procedural, canvas-based — no external image assets) */

function rgba(color, alpha) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildPlanetTexture(data) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const base = new THREE.Color(data.color).multiplyScalar(0.32);
  const accent = new THREE.Color(data.color).lerp(new THREE.Color(0xffffff), data.lava ? 0.35 : 0.22);

  ctx.fillStyle = rgba(base, 1);
  ctx.fillRect(0, 0, w, h);

  if (data.bands) {
    const bandCount = 14;
    for (let i = 0; i < bandCount; i++) {
      const y = (i / bandCount) * h;
      const bandH = (h / bandCount) * (0.4 + Math.random() * 0.9);
      ctx.fillStyle = rgba(accent, 0.14 + Math.random() * 0.26);
      ctx.fillRect(0, y, w, bandH);
    }
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 14 + Math.random() * 30;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgba(accent, 0.3));
      grad.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const blobCount = data.lava ? 70 : 42;
    for (let i = 0; i < blobCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = (data.lava ? 6 : 12) + Math.random() * (data.lava ? 22 : 38);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgba(accent, 0.5 + Math.random() * 0.4));
      grad.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const polar = ctx.createLinearGradient(0, 0, 0, h);
  polar.addColorStop(0, "rgba(255,255,255,0.22)");
  polar.addColorStop(0.14, "rgba(255,255,255,0)");
  polar.addColorStop(0.86, "rgba(255,255,255,0)");
  polar.addColorStop(1, "rgba(255,255,255,0.22)");
  ctx.fillStyle = polar;
  ctx.fillRect(0, 0, w, h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildBumpTexture(data) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, w, h);

  const blobCount = data.lava ? 90 : 60;
  for (let i = 0; i < blobCount; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 4 + Math.random() * (data.lava ? 20 : 30);
    const dark = Math.random() > 0.5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(128,128,128,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/** Re-maps a RingGeometry's UVs so U follows the true radial distance
 *  (inner -> outer) and V follows the angle around the ring. The default
 *  RingGeometry UVs are a flat planar projection, which makes a texture
 *  look "square" instead of like real concentric dust bands — this fixes
 *  that so the ring reads correctly from any camera angle. */
function remapRingUVs(geometry, innerRadius, outerRadius) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const radius = Math.sqrt(v.x * v.x + v.y * v.y);
    const u = THREE.MathUtils.clamp((radius - innerRadius) / (outerRadius - innerRadius), 0, 1);
    const angle = Math.atan2(v.y, v.x);
    const vCoord = (angle + Math.PI) / (Math.PI * 2);
    uv.setXY(i, u, vCoord);
  }
  uv.needsUpdate = true;
}

/** Grainy, radially-banded dust texture (with real gaps) for rings — reads
 *  as fine debris/dust rather than a flat translucent disc. Width = radial
 *  axis (maps to the remapped U), height = angular grain (maps to V). */
function buildRingTexture(colorHex) {
  const w = 512;
  const h = 48;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const color = new THREE.Color(colorHex);

  for (let bx = 0; bx < w; bx++) {
    const t = bx / w;
    let density =
      0.32 +
      0.22 * Math.sin(t * Math.PI * 16 + 1.1) +
      0.15 * Math.sin(t * Math.PI * 41 + 0.6) +
      0.12 * Math.sin(t * Math.PI * 83 + 2.4);
    density = THREE.MathUtils.clamp(density, 0, 1);
    if (Math.random() < 0.008) density *= 0.05; // occasional true gap (Cassini-division style)

    for (let by = 0; by < h; by++) {
      const grain = 0.7 + Math.random() * 0.6;
      const alpha = THREE.MathUtils.clamp(density * grain, 0, 1);
      const tint = color.clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.22);
      ctx.fillStyle = rgba(tint, alpha);
      ctx.fillRect(bx, by, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapT = THREE.RepeatWrapping;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildMoonTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#b9bccb";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 3 + Math.random() * 12;
    ctx.fillStyle = `rgba(70,72,90,${0.25 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Bright, branching crack texture (transparent background) used as an
 *  additive overlay on the volcanic planet — animated by scrolling its
 *  offset for a "flowing lava" look. */
function buildLavaVeinTexture() {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const veins = 12;
  for (let i = 0; i < veins; i++) {
    let x = Math.random() * w;
    let y = Math.random() * h;
    ctx.lineWidth = 1.5 + Math.random() * 2.5;
    ctx.strokeStyle = "rgba(255,170,60,0.85)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 24 + Math.floor(Math.random() * 28);
    for (let s = 0; s < segments; s++) {
      x += (Math.random() - 0.5) * 22;
      y += (Math.random() - 0.5) * 14;
      x = (x + w) % w;
      y = Math.max(0, Math.min(h, y));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(255,245,210,0.7)";
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Glowing scrolling circuit-trace overlay for the "algorithms" planet. */
function buildCircuitTexture(colorHex) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const color = new THREE.Color(colorHex);

  ctx.lineWidth = 1.1;
  ctx.strokeStyle = rgba(color, 0.75);
  const lines = 34;
  for (let i = 0; i < lines; i++) {
    let x = Math.random() * w;
    let y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 6 + Math.floor(Math.random() * 10);
    for (let s = 0; s < segs; s++) {
      if (Math.random() > 0.5) x += (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 30);
      else y += (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 30);
      x = (x + w) % w;
      y = Math.max(0, Math.min(h, y));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = rgba(color, 0.85);
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildGalaxyTexture(hue) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.14);
  core.addColorStop(0, `hsla(${hue},80%,88%,1)`);
  core.addColorStop(1, `hsla(${hue},80%,70%,0)`);
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = "lighter";
  const arms = 2;
  for (let a = 0; a < arms; a++) {
    const armOffset = (a / arms) * Math.PI * 2;
    for (let i = 0; i < 700; i++) {
      const t = i / 700;
      const angle = t * Math.PI * 6 + armOffset;
      const r = t * size * 0.48;
      const x = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 8;
      const y = cy + Math.sin(angle) * r * 0.5 + (Math.random() - 0.5) * 8;
      const alpha = (1 - t) * 0.5 * Math.random();
      ctx.fillStyle = `hsla(${hue + Math.random() * 24},70%,80%,${alpha})`;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }
  ctx.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildNebulaTexture(hue) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) {
    const x = size / 2 + (Math.random() - 0.5) * size * 0.7;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.7;
    const r = size * (0.12 + Math.random() * 0.22);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `hsla(${hue + Math.random() * 30},70%,65%,0.22)`);
    grad.addColorStop(1, `hsla(${hue},70%,50%,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Turbulent, self-lit star surface (used for the "suns" only). */
function buildSunTexture(hue) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = `hsl(${hue},95%,55%)`;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 8 + Math.random() * 34;
    const hot = Math.random() > 0.5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, hot ? `hsla(${hue + 20},100%,90%,0.8)` : `hsla(${hue - 10},90%,35%,0.7)`);
    grad.addColorStop(1, `hsla(${hue},90%,55%,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,180,90,0.9)");
  grad.addColorStop(1, "rgba(255,180,90,0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Simple ring-shaped sprite used as the hover "target lock" indicator. */
function buildSelectionRingTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.stroke();

  // small corner ticks, like a targeting reticle
  const tick = size * 0.08;
  [0, 90, 180, 270].forEach((deg) => {
    const rad = (deg * Math.PI) / 180;
    const rInner = size * 0.46;
    const x1 = cx + Math.cos(rad) * rInner;
    const y1 = cy + Math.sin(rad) * rInner;
    const x2 = cx + Math.cos(rad) * (rInner + tick);
    const y2 = cy + Math.sin(rad) * (rInner + tick);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  return new THREE.CanvasTexture(canvas);
}

/* 7. STARFIELD — 5000 stars, split into groups that twinkle out of phase */
function createStarfield() {
  const palette = [0xffffff, 0x9db4ff, 0xfff2b0];
  const perGroup = Math.ceil(STAR_COUNT / STAR_GROUPS);

  for (let g = 0; g < STAR_GROUPS; g++) {
    const positions = new Float32Array(perGroup * 3);
    const colors = new Float32Array(perGroup * 3);

    for (let i = 0; i < perGroup; i++) {
      const radius = 500 + Math.random() * 1100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.9 + Math.random() * 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    state.scene.add(points);

    state.starGroups.push({
      points,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.7,
    });
  }
}

function updateStarfield(elapsed) {
  state.starGroups.forEach((group) => {
    group.points.material.opacity = 0.45 + 0.45 * Math.sin(elapsed * group.speed + group.phase);
  });
}

/* 8. DEEP SKY — distant spiral galaxies + soft nebula clouds (parallax depth) */
function createDeepSky() {
  const galaxyHues = [200, 280, 20];
  galaxyHues.forEach((hue) => {
    const material = new THREE.SpriteMaterial({
      map: buildGalaxyTexture(hue),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.36,
    });
    const sprite = new THREE.Sprite(material);
    placeDeepSkyObject(sprite, 950, 520);
    const scale = 110 + Math.random() * 110;
    sprite.scale.set(scale, scale, 1);
    state.scene.add(sprite);
    state.deepSky.push({ sprite, spin: 0.015 + Math.random() * 0.035 });
  });

  const nebulaHues = [330, 190, 260, 30];
  nebulaHues.forEach((hue) => {
    const material = new THREE.SpriteMaterial({
      map: buildNebulaTexture(hue),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.2,
    });
    const sprite = new THREE.Sprite(material);
    placeDeepSkyObject(sprite, 700, 420);
    const scale = 130 + Math.random() * 130;
    sprite.scale.set(scale, scale, 1);
    state.scene.add(sprite);
    state.deepSky.push({ sprite, spin: 0.004 + Math.random() * 0.01 });
  });
}

function placeDeepSkyObject(sprite, minDist, spread) {
  const dist = minDist + Math.random() * spread;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  sprite.position.set(
    dist * Math.sin(phi) * Math.cos(theta),
    dist * Math.cos(phi) * 0.4,
    dist * Math.sin(phi) * Math.sin(theta)
  );
}

function updateDeepSky(delta) {
  state.deepSky.forEach((entry) => {
    entry.sprite.material.rotation += entry.spin * delta;
  });
}

/* 9. SUNS — self-lit stars that also light the whole scene */
function createSuns() {
  SUNS.forEach((cfg) => {
    const texture = buildSunTexture(cfg.hue);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.size, 48, 48),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    mesh.position.copy(cfg.position);
    state.scene.add(mesh);

    const glowColor = new THREE.Color().setHSL(cfg.hue / 360, 0.9, 0.6);
    const corona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: buildGlowTexture(),
        color: glowColor,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    corona.scale.set(cfg.size * 4.2, cfg.size * 4.2, 1);
    corona.position.copy(cfg.position);
    state.scene.add(corona);

    const light = new THREE.PointLight(glowColor, 1.6, 620, 2);
    light.position.copy(cfg.position);
    state.scene.add(light);

    state.suns.push({ mesh, corona, spinSpeed: 0.02 + Math.random() * 0.02 });
  });

  // Distant, near-parallel light standing in for "the sun is very far away",
  // so every planet gets a clean lit/unlit terminator regardless of orbit
  // distance from any single point light.
  const sunlight = new THREE.DirectionalLight(0xfff1d8, 1.5);
  sunlight.position.copy(SUNS[0].position);
  state.scene.add(sunlight);
}

function updateSuns(delta) {
  state.suns.forEach((s) => {
    s.mesh.material.map.offset.x += delta * s.spinSpeed;
    s.mesh.rotation.y += delta * 0.04;
  });
}

function randomOnUnitSphere() {
  const v = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(2),
    THREE.MathUtils.randFloatSpread(2),
    THREE.MathUtils.randFloatSpread(2)
  );
  return v.lengthSq() < 0.0001 ? new THREE.Vector3(1, 0, 0) : v.normalize();
}

/* 10. CENTRAL BLACK HOLE — huge matte horizon + spinning disk + photon ring */
function createBlackHole() {
  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(BLACK_HOLE_CORE_RADIUS, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0 })
  );
  group.add(core);

  const photonRing = new THREE.Mesh(
    new THREE.TorusGeometry(BLACK_HOLE_CORE_RADIUS + 0.6, 0.16, 20, 160),
    new THREE.MeshBasicMaterial({ color: 0xfff3d6 })
  );
  photonRing.rotation.x = Math.PI / 2;
  group.add(photonRing);

  const diskTexture = buildAccretionDiskTexture();

  const disk = new THREE.Mesh(
    new THREE.RingGeometry(BLACK_HOLE_DISK_INNER, BLACK_HOLE_DISK_OUTER, 160, 16),
    new THREE.MeshBasicMaterial({
      map: diskTexture,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  disk.rotation.x = Math.PI / 2.4;
  group.add(disk);

  const innerDisk = new THREE.Mesh(disk.geometry, disk.material.clone());
  innerDisk.scale.setScalar(0.55);
  innerDisk.rotation.x = disk.rotation.x;
  innerDisk.material.opacity = 0.9;
  group.add(innerDisk);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: buildGlowTexture(),
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(50, 50, 1);
  group.add(glow);

  group.add(new THREE.PointLight(0xff8a3d, 1.6, 130, 2));

  state.scene.add(group);
  state.blackHole = group;
  state.accretionDisk = disk;
  state.accretionDiskInner = innerDisk;
}

function buildAccretionDiskTexture() {
  const w = 512;
  const h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0.0, "rgba(139,92,246,0)");
  grad.addColorStop(0.18, "rgba(139,92,246,0.9)");
  grad.addColorStop(0.5, "rgba(255,138,61,1)");
  grad.addColorStop(0.78, "rgba(255,220,120,0.95)");
  grad.addColorStop(1.0, "rgba(255,220,120,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 160; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const streakW = 4 + Math.random() * 32;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
    ctx.fillRect(x, y, streakW, 1 + Math.random() * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateBlackHole(delta) {
  if (state.accretionDisk) {
    state.accretionDisk.rotation.z += delta * 1.2;
    state.accretionDisk.material.map.offset.x += delta * 0.22;
  }
  if (state.accretionDiskInner) state.accretionDiskInner.rotation.z -= delta * 1.8;
  if (state.blackHole) state.blackHole.rotation.y += delta * 0.04;
}

function createAccretionFlow() {
  const positions = new Float32Array(ACCRETION_FLOW_COUNT * 3);
  const data = [];

  for (let i = 0; i < ACCRETION_FLOW_COUNT; i++) {
    const radius = BLACK_HOLE_DISK_INNER + Math.random() * (BLACK_HOLE_DISK_OUTER - BLACK_HOLE_DISK_INNER + 4);
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 1.6;
    data.push({ radius, angle, height, speed: 0.4 + Math.random() * 0.8 });
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffcf9e,
    size: 0.35,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  state.scene.add(points);
  state.accretionFlow = { points, data };
}

function updateAccretionFlow(delta) {
  const { points, data } = state.accretionFlow;
  const posAttr = points.geometry.getAttribute("position");
  const span = BLACK_HOLE_DISK_OUTER - BLACK_HOLE_DISK_INNER;

  data.forEach((p, i) => {
    p.angle += p.speed * delta * (18 / p.radius);
    p.radius -= delta * (1.2 + (BLACK_HOLE_DISK_OUTER + 4 - p.radius) * 0.05);

    if (p.radius < BLACK_HOLE_CORE_RADIUS + 0.6) {
      p.radius = BLACK_HOLE_DISK_OUTER + Math.random() * 8;
      p.angle = Math.random() * Math.PI * 2;
      p.height = (Math.random() - 0.5) * 1.6;
    }

    const flatten = p.radius / (span + BLACK_HOLE_DISK_INNER);
    posAttr.setXYZ(i, Math.cos(p.angle) * p.radius, p.height * flatten, Math.sin(p.angle) * p.radius);
  });

  posAttr.needsUpdate = true;
}

/** A literal asteroid/debris belt orbiting the black hole, just beyond the
 *  accretion disk — instanced for a single draw call across hundreds of
 *  irregular rocks. */
function createDebrisBelt() {
  const rockGeometry = new THREE.IcosahedronGeometry(1, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.95 });
  const belt = new THREE.InstancedMesh(rockGeometry, rockMaterial, DEBRIS_BELT_COUNT);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < DEBRIS_BELT_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = BLACK_HOLE_DEBRIS_INNER + Math.random() * (BLACK_HOLE_DEBRIS_OUTER - BLACK_HOLE_DEBRIS_INNER);
    const height = (Math.random() - 0.5) * 3;
    const scale = 0.4 + Math.random() * 1.6;
    dummy.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    belt.setMatrixAt(i, dummy.matrix);
  }

  belt.rotation.x = Math.PI / 2.4;
  state.scene.add(belt);
  state.debrisBelt = belt;
}

function updateDebrisBelt(delta) {
  if (state.debrisBelt) state.debrisBelt.rotation.z += delta * 0.03;
}

/* 11. COMETS — fast diagonal streaks, pulled off-course near the black hole */
function createComets() {
  for (let i = 0; i < COMET_COUNT; i++) {
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xdff6ff })
    );

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(COMET_TRAIL_LENGTH * 3), 3)
    );
    trailGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(COMET_TRAIL_LENGTH * 3), 3)
    );

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const trail = new THREE.Points(trailGeometry, trailMaterial);

    const group = new THREE.Group();
    group.add(head, trail);
    state.scene.add(group);

    const comet = { group, history: [], velocity: new THREE.Vector3() };
    resetComet(comet);
    state.comets.push(comet);
  }
}

function resetComet(comet) {
  const start = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(260),
    THREE.MathUtils.randFloatSpread(120) + 50,
    -320 - Math.random() * 160
  );
  const direction = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(1) + 0.4,
    -0.25 - Math.random() * 0.3,
    1
  ).normalize();

  comet.group.position.copy(start);
  comet.velocity.copy(direction).multiplyScalar(75 + Math.random() * 60);
  comet.history = new Array(COMET_TRAIL_LENGTH).fill(0).map(() => start.clone());
}

function updateComets(delta) {
  state.comets.forEach((comet) => {
    const distToCenter = comet.group.position.length();
    if (distToCenter < BLACK_HOLE_GRAVITY_RADIUS) {
      const pull = comet.group.position
        .clone()
        .normalize()
        .multiplyScalar((-BLACK_HOLE_GRAVITY_STRENGTH / Math.max(distToCenter * distToCenter, 150)) * delta);
      comet.velocity.add(pull);
    }
    if (distToCenter < BLACK_HOLE_ABSORB_RADIUS) {
      resetComet(comet);
      return;
    }

    comet.group.position.addScaledVector(comet.velocity, delta);

    comet.history.pop();
    comet.history.unshift(comet.group.position.clone());

    const trail = comet.group.children[1];
    const posAttr = trail.geometry.getAttribute("position");
    const colAttr = trail.geometry.getAttribute("color");

    for (let i = 0; i < COMET_TRAIL_LENGTH; i++) {
      const p = comet.history[i];
      posAttr.setXYZ(
        i,
        p.x - comet.group.position.x,
        p.y - comet.group.position.y,
        p.z - comet.group.position.z
      );
      const fade = 1 - i / COMET_TRAIL_LENGTH;
      colAttr.setXYZ(i, 0.75 * fade, 0.88 * fade, 1 * fade);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    if (comet.group.position.length() > 620) resetComet(comet);
  });
}

/* 12. SHOOTING STARS */
function createShootingStars() {
  for (let i = 0; i < SHOOTING_STAR_COUNT; i++) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });

    const line = new THREE.Line(geometry, material);
    state.scene.add(line);

    state.shootingStars.push({
      line,
      active: false,
      life: 0,
      duration: 0,
      start: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    });
  }
  state.nextShootingStarAt = 1.5 + Math.random() * 2.5;
}

function triggerShootingStar() {
  const idle = state.shootingStars.find((s) => !s.active);
  if (!idle) return;

  const start = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(340),
    120 + Math.random() * 160,
    THREE.MathUtils.randFloatSpread(340)
  );
  const direction = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(1),
    -1,
    THREE.MathUtils.randFloatSpread(1)
  ).normalize();

  idle.start.copy(start);
  idle.velocity.copy(direction).multiplyScalar(300 + Math.random() * 200);
  idle.life = 0;
  idle.duration = 0.45 + Math.random() * 0.35;
  idle.active = true;
}

function updateShootingStars(delta) {
  state.nextShootingStarAt -= delta;
  if (state.nextShootingStarAt <= 0) {
    triggerShootingStar();
    state.nextShootingStarAt = 1.2 + Math.random() * 3;
  }

  state.shootingStars.forEach((s) => {
    if (!s.active) return;
    s.life += delta;
    const t = s.life / s.duration;

    if (t >= 1) {
      s.active = false;
      s.line.material.opacity = 0;
      return;
    }

    const head = s.start.clone().addScaledVector(s.velocity, s.life);
    const tail = s.start.clone().addScaledVector(s.velocity, Math.max(s.life - 0.15, 0));

    const posAttr = s.line.geometry.getAttribute("position");
    posAttr.setXYZ(0, head.x, head.y, head.z);
    posAttr.setXYZ(1, tail.x, tail.y, tail.z);
    posAttr.needsUpdate = true;

    s.line.material.opacity = Math.sin(t * Math.PI);
  });
}

/* 13. PLANETS — 4 huge interactive project planets with unique surface FX */
const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  uniform vec3 glowColor;
  uniform float glowIntensity;
  void main() {
    float rim = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    gl_FragColor = vec4(glowColor, 1.0) * clamp(rim, 0.0, 1.0) * glowIntensity;
  }
`;

function buildAtmosphere(data) {
  const material = new THREE.ShaderMaterial({
    vertexShader: ATMOSPHERE_VERTEX_SHADER,
    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
    uniforms: {
      glowColor: { value: new THREE.Color(data.color) },
      glowIntensity: { value: 0.5 },
    },
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(data.size * 1.18, 48, 48), material);
}

function createLavaEruptions(group, data) {
  const count = 50;
  const positions = new Float32Array(count * 3).fill(-9999);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffb347,
    size: 0.5,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  group.add(points);

  const particles = new Array(count).fill(0).map(() => ({
    active: false,
    life: 0,
    duration: 0,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
  }));

  group.userData.eruption = { points, particles, timer: Math.random() * 0.4 };
}

function updateLavaEruptions(group, data, delta) {
  const erupt = group.userData.eruption;
  if (!erupt) return;

  erupt.timer -= delta;
  if (erupt.timer <= 0) {
    const idle = erupt.particles.find((p) => !p.active);
    if (idle) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const base = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ).multiplyScalar(data.size);
      idle.pos.copy(base);
      idle.vel.copy(base).normalize().multiplyScalar(3 + Math.random() * 4);
      idle.active = true;
      idle.life = 0;
      idle.duration = 0.8 + Math.random() * 0.6;
    }
    erupt.timer = 0.05 + Math.random() * 0.12;
  }

  const posAttr = erupt.points.geometry.getAttribute("position");
  erupt.particles.forEach((p, i) => {
    if (p.active) {
      p.life += delta;
      const t = p.life / p.duration;
      if (t >= 1) {
        p.active = false;
        posAttr.setXYZ(i, 0, -9999, 0);
        return;
      }
      p.vel.y -= delta * 3.2;
      p.pos.addScaledVector(p.vel, delta);
      posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
    } else {
      posAttr.setXYZ(i, 0, -9999, 0);
    }
  });
  posAttr.needsUpdate = true;
}

function createOceanBubbles(group, data) {
  const count = 90;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xbfe8ff,
    size: 0.3,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  group.add(points);

  const bubbles = new Array(count).fill(0).map(() => ({
    theta: Math.random() * Math.PI * 2,
    phi: Math.acos(THREE.MathUtils.randFloatSpread(2)),
    height: Math.random() * data.size * 0.6,
    speed: 0.4 + Math.random() * 0.6,
  }));

  group.userData.bubbles = { points, bubbles };
}

function updateOceanBubbles(group, data, delta) {
  const b = group.userData.bubbles;
  if (!b) return;

  const posAttr = b.points.geometry.getAttribute("position");
  b.bubbles.forEach((bub, i) => {
    bub.height += bub.speed * delta;
    if (bub.height > data.size * 1.3) {
      bub.height = 0;
      bub.theta = Math.random() * Math.PI * 2;
      bub.phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    }
    const r = data.size + bub.height;
    posAttr.setXYZ(
      i,
      r * Math.sin(bub.phi) * Math.cos(bub.theta),
      r * Math.cos(bub.phi),
      r * Math.sin(bub.phi) * Math.sin(bub.theta)
    );
  });
  posAttr.needsUpdate = true;
}

/* 12b. ELECTRIC STORM FX — for the TEMPEST planet: a roiling cloud belt,
 *  a pool of jagged lightning bolts that jump between the clouds and the
 *  surrounding asteroid belt, and a shatter system that breaks a struck
 *  asteroid into scattering debris and quietly respawns it later. */
function buildCloudPuffTexture(hue) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `hsla(${hue},95%,90%,0.9)`);
  grad.addColorStop(0.5, `hsla(${hue},90%,72%,0.35)`);
  grad.addColorStop(1, `hsla(${hue},90%,60%,0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createElectricStorm(group, data) {
  const hue = 50; // electric yellow

  // Thick roiling cloud belt around the planet — this is what the bolts and
  // asteroids sit inside, so the strikes read as "inside the weather".
  const cloudPositions = new Float32Array(STORM_CLOUD_COUNT * 3);
  const cloudRecords = [];
  for (let i = 0; i < STORM_CLOUD_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = data.size * (1.3 + Math.random() * 1.0);
    const height = (Math.random() - 0.5) * data.size * 0.8;
    cloudRecords.push({ angle, radius, height, speed: 0.04 + Math.random() * 0.16 });
    cloudPositions[i * 3] = Math.cos(angle) * radius;
    cloudPositions[i * 3 + 1] = height;
    cloudPositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const cloudGeometry = new THREE.BufferGeometry();
  cloudGeometry.setAttribute("position", new THREE.BufferAttribute(cloudPositions, 3));
  const clouds = new THREE.Points(
    cloudGeometry,
    new THREE.PointsMaterial({
      map: buildCloudPuffTexture(hue),
      size: data.size * 0.5,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  group.add(clouds);

  // Pool of reusable jagged lightning Lines — idle until triggered, then a
  // short, bright, decaying strike.
  const bolts = [];
  for (let i = 0; i < STORM_BOLT_COUNT; i++) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
    geometry.setDrawRange(0, 0);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0xfff6c2,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(line);
    bolts.push({ line, active: false, life: 0, duration: 0 });
  }

  // Pool of shatter-debris particles, shared across every strike that hits
  // an asteroid — reused rather than spawned/destroyed for perf.
  const fragPositions = new Float32Array(STORM_FRAGMENT_COUNT * 3).fill(-9999);
  const fragGeometry = new THREE.BufferGeometry();
  fragGeometry.setAttribute("position", new THREE.BufferAttribute(fragPositions, 3));
  const fragments = new THREE.Points(
    fragGeometry,
    new THREE.PointsMaterial({
      color: 0xfff2a0,
      size: 0.55,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(fragments);
  const fragParticles = new Array(STORM_FRAGMENT_COUNT).fill(0).map(() => ({
    active: false,
    life: 0,
    duration: 0,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
  }));

  const flash = new THREE.PointLight(0xfff2a0, 0, data.size * 12, 2);
  group.add(flash);

  group.userData.electricStorm = {
    clouds,
    cloudRecords,
    bolts,
    fragments,
    fragParticles,
    flash,
    nextStrikeAt: 0.2 + Math.random() * 0.4,
  };
}

function triggerLightningStrike(group, data) {
  const storm = group.userData.electricStorm;
  const idle = storm.bolts.find((b) => !b.active);
  if (!idle) return;

  const records = group.userData.asteroidRecords;
  let targetGroup = null;
  let hitRecord = null;
  let hitLocal = null;

  if (records && Math.random() < 0.5) {
    const live = records.filter((r) => r.active);
    if (live.length) {
      hitRecord = live[Math.floor(Math.random() * live.length)];
      hitLocal = new THREE.Vector3(
        Math.cos(hitRecord.angle) * hitRecord.radius,
        hitRecord.height,
        Math.sin(hitRecord.angle) * hitRecord.radius
      );
      targetGroup = hitLocal.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2.3);
    }
  }
  if (!targetGroup) {
    targetGroup = randomOnUnitSphere().multiplyScalar(data.size * (1.3 + Math.random() * 0.9));
  }

  const origin = randomOnUnitSphere().multiplyScalar(data.size * (2.1 + Math.random() * 0.7));

  const segments = 6;
  const posAttr = idle.line.geometry.getAttribute("position");
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = origin.clone().lerp(targetGroup, t);
    if (i > 0 && i < segments) {
      const jitter = data.size * 0.2;
      p.x += (Math.random() - 0.5) * jitter;
      p.y += (Math.random() - 0.5) * jitter;
      p.z += (Math.random() - 0.5) * jitter;
    }
    posAttr.setXYZ(i, p.x, p.y, p.z);
  }
  idle.line.geometry.setDrawRange(0, segments + 1);
  posAttr.needsUpdate = true;

  idle.active = true;
  idle.life = 0;
  idle.duration = 0.07 + Math.random() * 0.1;

  storm.flash.position.copy(targetGroup);
  storm.flash.intensity = 3 + Math.random() * 2.5;

  if (hitRecord) shatterAsteroid(group, hitRecord, hitLocal, targetGroup);
}

function shatterAsteroid(group, record, localPos, groupPos) {
  record.active = false;
  record.respawnTimer = 2.5 + Math.random() * 3.5;

  const asteroids = group.userData.asteroids;
  const dummy = new THREE.Object3D();
  dummy.position.copy(localPos);
  dummy.scale.setScalar(0.0001);
  dummy.updateMatrix();
  asteroids.setMatrixAt(record.index, dummy.matrix);
  asteroids.instanceMatrix.needsUpdate = true;

  spawnFragmentBurst(group, groupPos, record.scale);
}

function spawnFragmentBurst(group, origin, scale) {
  const storm = group.userData.electricStorm;
  let toSpawn = 14 + Math.floor(Math.random() * 12); // "thousands of pieces" read via a dense, reused pool
  for (const p of storm.fragParticles) {
    if (toSpawn <= 0) break;
    if (p.active) continue;
    p.active = true;
    p.life = 0;
    p.duration = 0.5 + Math.random() * 0.6;
    p.pos.copy(origin);
    p.vel.copy(randomOnUnitSphere()).multiplyScalar((6 + Math.random() * 11) * (0.5 + scale * 0.5));
    toSpawn--;
  }
}

function updateFragmentBursts(storm, delta) {
  const posAttr = storm.fragments.geometry.getAttribute("position");
  storm.fragParticles.forEach((p, i) => {
    if (p.active) {
      p.life += delta;
      const t = p.life / p.duration;
      if (t >= 1) {
        p.active = false;
        posAttr.setXYZ(i, 0, -9999, 0);
        return;
      }
      p.vel.multiplyScalar(0.94);
      p.pos.addScaledVector(p.vel, delta);
      posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
    } else {
      posAttr.setXYZ(i, 0, -9999, 0);
    }
  });
  posAttr.needsUpdate = true;
}

function updateElectricStorm(group, data, delta, elapsed) {
  const storm = group.userData.electricStorm;

  const cloudPos = storm.clouds.geometry.getAttribute("position");
  storm.cloudRecords.forEach((c, i) => {
    c.angle += c.speed * delta;
    cloudPos.setXYZ(i, Math.cos(c.angle) * c.radius, c.height, Math.sin(c.angle) * c.radius);
  });
  cloudPos.needsUpdate = true;
  storm.clouds.material.opacity = 0.46 + Math.sin(elapsed * 1.3) * 0.08;

  // Frequent bursts of several strikes close together, then a brief calm —
  // reads as a real storm rather than a metronome.
  storm.nextStrikeAt -= delta;
  if (storm.nextStrikeAt <= 0) {
    triggerLightningStrike(group, data);
    storm.nextStrikeAt = Math.random() < 0.7 ? 0.02 + Math.random() * 0.1 : 0.25 + Math.random() * 0.5;
  }
  storm.flash.intensity = Math.max(0, storm.flash.intensity - delta * 10);

  storm.bolts.forEach((bolt) => {
    if (!bolt.active) return;
    bolt.life += delta;
    const t = bolt.life / bolt.duration;
    if (t >= 1) {
      bolt.active = false;
      bolt.line.material.opacity = 0;
      return;
    }
    bolt.line.material.opacity = (1 - t) * (0.75 + Math.random() * 0.25);
  });

  updateFragmentBursts(storm, delta);

  const records = group.userData.asteroidRecords;
  if (records) {
    const asteroids = group.userData.asteroids;
    const dummy = new THREE.Object3D();
    let changed = false;
    records.forEach((r) => {
      if (r.active) return;
      r.respawnTimer -= delta;
      if (r.respawnTimer <= 0) {
        r.active = true;
        r.angle = Math.random() * Math.PI * 2;
        dummy.position.set(Math.cos(r.angle) * r.radius, r.height, Math.sin(r.angle) * r.radius);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.setScalar(r.scale);
        dummy.updateMatrix();
        asteroids.setMatrixAt(r.index, dummy.matrix);
        changed = true;
      }
    });
    if (changed) asteroids.instanceMatrix.needsUpdate = true;
  }
}

function createPlanets() {
  PLANETS.forEach((data) => {
    const group = new THREE.Group();

    const surfaceTexture = buildPlanetTexture(data);
    const bumpTexture = buildBumpTexture(data);

    let roughness = 0.68;
    let metalness = 0.1;
    if (data.ocean) {
      roughness = 0.25;
      metalness = 0.3;
    } else if (data.lava) {
      roughness = 0.85;
      metalness = 0.05;
    } else if (data.bands) {
      roughness = 0.55;
      metalness = 0.05;
    }

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(data.size, 72, 72),
      new THREE.MeshStandardMaterial({
        map: surfaceTexture,
        bumpMap: bumpTexture,
        bumpScale: 0.12,
        emissive: data.emissive,
        emissiveIntensity: 0.4,
        roughness,
        metalness,
      })
    );
    mesh.userData.hovered = false;
    group.add(mesh);

    const atmosphere = buildAtmosphere(data);
    group.add(atmosphere);
    group.userData.atmosphere = atmosphere;

    // Hover "target lock" indicator — invisible until hovered.
    const selectionRing = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: buildSelectionRingTexture(),
        color: 0xbdfff0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    selectionRing.scale.set(data.size * 3.2, data.size * 3.2, 1);
    group.add(selectionRing);
    group.userData.selectionRing = selectionRing;

    if (data.circuit) {
      const circuitMesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.size * 1.012, 72, 72),
        new THREE.MeshBasicMaterial({
          map: buildCircuitTexture(data.color),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.85,
        })
      );
      group.add(circuitMesh);
      group.userData.circuitOverlay = circuitMesh;
    }

    if (data.lava) {
      const lavaMesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.size * 1.015, 72, 72),
        new THREE.MeshBasicMaterial({
          map: buildLavaVeinTexture(),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.85,
        })
      );
      group.add(lavaMesh);
      group.userData.lavaOverlay = lavaMesh;
      createLavaEruptions(group, data);
    }

    if (data.ocean) {
      createOceanBubbles(group, data);
    }

    if (data.hasRing) {
      const ringInner = data.size * 1.5;
      const ringOuter = data.size * 2.9;
      const ringGeometry = new THREE.RingGeometry(ringInner, ringOuter, 160, 24);
      remapRingUVs(ringGeometry, ringInner, ringOuter);

      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          map: buildRingTexture(data.ringColor),
          side: THREE.DoubleSide,
          transparent: true,
        })
      );
      ring.rotation.x = Math.PI / 2.3;
      group.add(ring);

      if (data.hasAsteroids) {
        const rockColor = data.hasElectricStorm ? 0x9a8f6e : 0x9fffe6;
        const rockGeometry = new THREE.IcosahedronGeometry(0.22, 0);
        const rockMaterial = new THREE.MeshStandardMaterial({ color: rockColor, roughness: 0.9 });
        const count = data.id === "algorithms" ? 220 : data.hasElectricStorm ? 170 : 110;
        const asteroids = new THREE.InstancedMesh(rockGeometry, rockMaterial, count);
        const dummy = new THREE.Object3D();
        // Only the storm planet needs per-instance bookkeeping (so lightning
        // can target a specific rock and later respawn it elsewhere).
        const records = data.hasElectricStorm ? [] : null;
        const bandHeight = data.hasElectricStorm ? data.size * 0.8 : 0.5;

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
          const r = ringInner + Math.random() * (ringOuter - ringInner);
          const scale = 0.5 + Math.random() * 1.3;
          const height = (Math.random() - 0.5) * bandHeight;
          dummy.position.set(Math.cos(angle) * r, height, Math.sin(angle) * r);
          dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          asteroids.setMatrixAt(i, dummy.matrix);
          if (records) {
            records.push({ index: i, angle, radius: r, height, scale, active: true, respawnTimer: 0 });
          }
        }
        asteroids.rotation.x = Math.PI / 2.3;
        group.add(asteroids);
        group.userData.asteroids = asteroids;
        if (records) group.userData.asteroidRecords = records;
      }
    }

    if (data.hasMoon) {
      const moonTexture = buildMoonTexture();
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(data.size * 0.28, 32, 32),
        new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.9 })
      );
      moon.position.set(data.size * 2.6, 0, 0);
      group.add(moon);
      group.userData.moon = moon;
    }

    if (data.hasStorm) {
      const storm = new THREE.Mesh(
        new THREE.SphereGeometry(data.size * 1.06, 48, 48),
        new THREE.MeshBasicMaterial({
          color: 0xff8855,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
        })
      );
      group.add(storm);
      group.userData.storm = storm;
    }

    if (data.hasLightning) {
      const flicker = new THREE.PointLight(data.color, 0.5, 14, 2);
      group.add(flicker);
      group.userData.lightning = flicker;
    }

    if (data.hasElectricStorm) {
      createElectricStorm(group, data);
    }

    group.userData.data = data;
    group.userData.angle = Math.random() * Math.PI * 2;
    group.rotation.x = data.tilt;

    state.scene.add(group);
    state.planetMeshes.push({ group, mesh, data });
  });
}

function updatePlanets(delta, elapsed) {
  state.planetMeshes.forEach(({ group, mesh, data }) => {
    group.userData.angle += data.speed * delta;
    const a = group.userData.angle;
    group.position.set(Math.cos(a) * data.orbitA, 0, Math.sin(a) * data.orbitB);

    mesh.rotation.y += delta * 0.2;

    if (group.userData.moon) {
      const m = group.userData.moon;
      m.position.set(
        Math.cos(elapsed * 1.1) * data.size * 2.6,
        Math.sin(elapsed * 0.7) * data.size * 0.4,
        Math.sin(elapsed * 1.1) * data.size * 2.6
      );
      m.rotation.y += delta * 0.5;
    }

    if (group.userData.storm) {
      group.userData.storm.rotation.y += delta * 0.6;
      const flash = Math.random() < 0.012 ? 0.5 : 0; // rare bright lightning flash
      group.userData.storm.material.opacity = 0.16 + Math.sin(elapsed * 2) * 0.05 + flash;
    }

    if (group.userData.asteroids) {
      group.userData.asteroids.rotation.z += delta * 0.1;
    }

    if (group.userData.lightning) {
      group.userData.lightning.intensity = 0.25 + Math.random() * 0.55;
    }

    if (group.userData.circuitOverlay) {
      group.userData.circuitOverlay.material.map.offset.x += delta * 0.05;
      group.userData.circuitOverlay.rotation.y += delta * 0.02;
    }

    if (group.userData.lavaOverlay) {
      group.userData.lavaOverlay.material.map.offset.x += delta * 0.03;
      group.userData.lavaOverlay.material.opacity = 0.7 + 0.25 * Math.sin(elapsed * 1.4);
      updateLavaEruptions(group, data, delta);
    }

    if (group.userData.bubbles) {
      updateOceanBubbles(group, data, delta);
    }

    if (group.userData.electricStorm) {
      updateElectricStorm(group, data, delta, elapsed);
    }

    // Hover feedback: scale up + brighter emissive/atmosphere + the
    // targeting-reticle sprite fades in — impossible to miss.
    const hovered = mesh.userData.hovered;
    const targetScale = hovered ? 1.22 : 1;
    mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
    mesh.material.emissiveIntensity = hovered ? 1.4 : 0.4;

    if (group.userData.atmosphere) {
      group.userData.atmosphere.material.uniforms.glowIntensity.value = hovered ? 1.3 : 0.5;
    }
    if (group.userData.selectionRing) {
      const ring = group.userData.selectionRing;
      const targetOpacity = hovered ? 0.9 : 0;
      ring.material.opacity += (targetOpacity - ring.material.opacity) * 0.2;
      const pulse = data.size * (3.2 + Math.sin(elapsed * 4) * 0.15);
      ring.scale.set(pulse, pulse, 1);
    }
  });
}

/* 14. RAYCASTING — hover glow + click-to-focus */
function updatePointerFromEvent(event) {
  const rect = dom.container.getBoundingClientRect();
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerMove(event) {
  updatePointerFromEvent(event);
  state.raycaster.setFromCamera(state.pointer, state.camera);

  const meshes = state.planetMeshes.map((p) => p.mesh);
  const hits = state.raycaster.intersectObjects(meshes, false);

  state.planetMeshes.forEach((p) => (p.mesh.userData.hovered = false));

  if (hits.length > 0) {
    hits[0].object.userData.hovered = true;
    dom.container.style.cursor = "pointer";
  } else {
    dom.container.style.cursor = "grab";
  }
}

function onCanvasClick(event) {
  if (event.target !== state.renderer.domElement) return;

  updatePointerFromEvent(event);
  state.raycaster.setFromCamera(state.pointer, state.camera);

  const meshes = state.planetMeshes.map((p) => p.mesh);
  const hits = state.raycaster.intersectObjects(meshes, false);

  if (hits.length > 0) {
    const picked = state.planetMeshes.find((p) => p.mesh === hits[0].object);
    focusPlanet(picked);
  }
}

/* 15. CAMERA FOCUS TRANSITIONS */
function focusPlanet(planet) {
  state.focused = planet;

  const worldPos = new THREE.Vector3();
  planet.group.getWorldPosition(worldPos);

  const offset = new THREE.Vector3(planet.data.size * 3.4, planet.data.size * 1.7, planet.data.size * 3.4);
  state.camTargetPos.copy(worldPos).add(offset);
  state.lookAtTarget.copy(worldPos);
  state.isCameraTransitioning = true;

  showPanel(planet.data);
}

function resetCameraToOverview() {
  state.focused = null;
  state.camTargetPos.copy(state.camDefaultPos);
  state.lookAtTarget.copy(state.lookAtDefault);
  state.isCameraTransitioning = true;
  hidePanel();
}

/* 16. FLOATING PROJECT PANEL ("spaceship console") */
function showPanel(data) {
  const githubButton = data.upcoming
    ? ""
    : `
      <a class="pip-btn primary" href="${data.github}" target="_blank" rel="noreferrer"> View on GitHub
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.604-3.369-1.342-3.369-1.342-.455-1.157-1.11-1.465-1.11-1.465-.908-.621.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.529 2.341 1.087 2.91.831.091-.646.35-1.087.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.56 9.56 0 0 1 2.504.337c1.909-1.294 2.748-1.025 2.748-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.338 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .269.18.58.688.482A10.001 10.001 0 0 0 22 12C22 6.477 17.523 2 12 2z"/>
        </svg>
      </a>`;

  const tags = data.upcoming ? ["Upcoming Project"] : data.tags;

  dom.panel.innerHTML = `
    <button class="pip-close" data-action="close" aria-label="Close panel">✕</button>
    <div class="pip-kicker">${data.kicker}</div>
    <h3 class="pip-title">${data.name}</h3>
    <p class="pip-desc">${data.description}</p>
    <div class="pip-tags">
      ${tags.map((t) => `<span class="pip-tag">${t}</span>`).join("")}
    </div>
    <div class="pip-actions">
      ${githubButton}
      <button class="pip-btn ghost" type="button" data-action="close">Close &amp; return to orbit</button>
      <button class="pip-btn ghost" type="button" data-action="exit">Back to Traditional Portfolio</button>
    </div>
  `;
  dom.panel.classList.remove("hidden");
  requestAnimationFrame(() => dom.panel.classList.add("visible"));
}

function hidePanel() {
  dom.panel.classList.remove("visible");
  window.setTimeout(() => dom.panel.classList.add("hidden"), 320);
}

function onPanelClick(event) {
  const action = event.target?.dataset?.action;
  if (action === "close") resetCameraToOverview();
  if (action === "exit") exitUniverse();
}

/* 17. RESIZE */
function onResize() {
  if (!state.renderer) return;
  const { clientWidth, clientHeight } = dom.container;
  state.camera.aspect = clientWidth / clientHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(clientWidth, clientHeight);
  state.composer.setSize(clientWidth, clientHeight);
}

/* 18. MAIN RENDER LOOP */
function animate() {
  state.animationId = requestAnimationFrame(animate);

  const delta = Math.min(state.clock.getDelta(), 0.1);
  const elapsed = state.clock.elapsedTime;

  updateStarfield(elapsed);
  updateDeepSky(delta);
  updateSuns(delta);
  updateBlackHole(delta);
  updateAccretionFlow(delta);
  updateDebrisBelt(delta);
  updateComets(delta);
  updateShootingStars(delta);
  updatePlanets(delta, elapsed);

  if (state.isCameraTransitioning) {
    state.controls.enabled = false;
    state.camera.position.lerp(state.camTargetPos, 0.045);
    state.controls.target.lerp(state.lookAtTarget, 0.045);

    if (state.camera.position.distanceTo(state.camTargetPos) < 0.05) {
      state.isCameraTransitioning = false;
      state.controls.enabled = true;
    }
  }

  state.controls.update();
  state.composer.render();
}