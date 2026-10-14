"use client";

import styles from "./components.module.css";
import * as THREE from 'three';
import { useEffect, useRef } from "react";
import { DRACOLoader, GLTFLoader, KTX2Loader, OrbitControls } from "three/examples/jsm/Addons.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { landingGate } from "@/providers/landing-gate";
import { preloader } from "./hooks/preloaderStore";
import { createReadyTracker } from "./utils/sceneReady";

// ==========================================
// SETTINGS
// ==========================================

// The model is Draco-compressed, so GLTFLoader needs a Draco decoder. This one is served by
// Google. To self-host instead, copy node_modules/three/examples/jsm/libs/draco/gltf into
// /public/draco/ and use "/draco/".
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

// Compressed textures (KTX2 / Basis) need a transcoder, from the same three release as your
// install. To self-host, copy node_modules/three/examples/jsm/libs/basis into /public/basis/ and
// use "/basis/". (Meshopt-compressed geometry needs nothing: its decoder is bundled.)
const BASIS_TRANSCODER_PATH = `https://cdn.jsdelivr.net/npm/three@0.${THREE.REVISION}.0/examples/jsm/libs/basis/`;

// The monitor's glass, by the name of its material in the model (the laptop and phone screens
// use other names). With DEBUG_PICK_MESH on, click any screen and the console prints the names
// under the cursor. null = guess from SCREEN_NAME_HINT.
const SCREEN_MESH_NAME: string | null = "Screen Final";

// Used when SCREEN_MESH_NAME is null or matches nothing
const SCREEN_NAME_HINT = /screen|display|glass|monitor|crt/i;

// Click the model to log which mesh and material are under the cursor. Turn off when done.
const DEBUG_PICK_MESH = true;

// If the camera ends up behind the screen, or the image is mirrored, the glass's faces point
// inward: set this to true.
const SCREEN_FLIP_NORMAL = false;

// Screenshot of your hero section, shown on the monitor. Capture it with scripts/capture-hero.mjs
// and put it in /public/images/. null = keep the model's own screen picture.
const SCREEN_IMAGE_URL: string | null = "/images/monitor-hero.png";

// How much of the viewport's tighter dimension the glass fills when scrolled all the way in.
// 1 = edge to edge, which makes the hand-off to the real page seamless; lower leaves a margin.
const SCREEN_FILL = 1;

// The "front center" waypoint sits this many times further from the glass than the final
// position. It is on the glass's own axis, so the last stretch is a straight dolly-in.
const FRONT_DISTANCE_FACTOR = 4;

// Extra height on the orbit arc when the camera has to sweep round from behind the model
const ARC_LIFT = 1.2;

// Hand-off to the real page: the transition (HeroTransition) starts when the glass covers this
// fraction of the viewport (1 = edge to edge, 0.97 = nearly full). The camera carries on to the
// very end of its path underneath it.
const TRANSITION_COVERAGE = 0.97;

// How long the landing page must sit at its very top before pulling up brings the 3D scene back
// (so a flick that merely reaches the top doesn't bounce you back in), and where on the scroll
// path the camera starts from again when it does.
const REENTER_DWELL_MS = 350;
const LEAVE_PROGRESS = 0.85;

// After the hand-off, wheel events keep arriving for a moment (trackpad momentum, a fast spin).
// They are swallowed until the wheel has been quiet this long, so the landing page doesn't open
// already scrolled. The same goes for the first moments after the scene takes over again.
const WHEEL_QUIET_MS = 120;

// ==========================================
// SCROLL PATH & SCREEN FRAMING (pure helpers)
// ==========================================
// BEGIN-HELPERS

interface ScreenFrame {
  center: THREE.Vector3; // middle of the glass, on its front surface
  normal: THREE.Vector3; // unit vector pointing out of the glass, towards the viewer
  right: THREE.Vector3;  // unit vector along the glass's width (horizontal)
  up: THREE.Vector3;     // unit vector along the glass's height
  width: number;
  height: number;
  source: string;
  mesh?: THREE.Mesh; // the glass mesh itself; absent when the fallback guess was used
}

// Measures a flat-ish glass mesh in world space: which way it faces, its own width/height axes
// (so a yawed or tilted screen is framed head-on, not just looked at along Z), its size, and
// the centre of its front surface.
function measureGlass(mesh: THREE.Mesh, flip: boolean) {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const index = geometry.index;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) {
    points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
  }

  // Area-weighted normal from the triangle winding, in world space
  const normal = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const count = index ? index.count : position.count;
  for (let i = 0; i + 2 < count; i += 3) {
    const a = points[index ? index.getX(i) : i];
    const b = points[index ? index.getX(i + 1) : i + 1];
    const c = points[index ? index.getX(i + 2) : i + 2];
    normal.add(ab.subVectors(b, a).cross(ac.subVectors(c, a)));
  }
  if (mesh.matrixWorld.determinant() < 0) normal.negate(); // a mirrored mesh reverses its winding
  if (flip) normal.negate();
  if (normal.lengthSq() < 1e-12) normal.set(0, 0, 1);
  normal.normalize();

  // Width axis: horizontal and across the glass. Height axis: the other way across it.
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0); // glass facing straight up or down
  right.normalize();
  const up = new THREE.Vector3().crossVectors(normal, right).normalize();

  let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity;
  let minN = Infinity, maxN = -Infinity;
  for (const p of points) {
    const r = p.dot(right), u = p.dot(up), n = p.dot(normal);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minN = Math.min(minN, n); maxN = Math.max(maxN, n);
  }

  const center = new THREE.Vector3()
    .addScaledVector(right, (minR + maxR) / 2)
    .addScaledVector(up, (minU + maxU) / 2)
    .addScaledVector(normal, maxN);

  return { center, normal, right, up, width: maxR - minR, height: maxU - minU, thickness: maxN - minN };
}

// Finds the screen glass in the loaded model. Call after the model has been placed in the scene.
function findScreenFrame(
  root: THREE.Object3D,
  modelBox: THREE.Box3,
  meshName: string | null = SCREEN_MESH_NAME,
  flip: boolean = SCREEN_FLIP_NORMAL
): ScreenFrame {
  root.updateMatrixWorld(true);

  const meshes: { mesh: THREE.Mesh; names: string[]; label: string }[] = [];
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const names = [mesh.name, ...materials.map((m) => m.name)].filter(Boolean);
    meshes.push({ mesh, names, label: names.join(" / ") });
  });

  // An exact name wins; otherwise guess from the name hint
  const wanted = meshName;
  let matches = wanted ? meshes.filter((m) => m.names.includes(wanted)) : [];
  const exact = matches.length > 0;
  if (wanted && !exact) {
    console.warn(`[Scene] SCREEN_MESH_NAME "${wanted}" matches no mesh or material name.`);
  }
  if (!exact) matches = meshes.filter((m) => SCREEN_NAME_HINT.test(m.label));

  const candidates = matches
    .map(({ mesh, label }) => ({ mesh, label, ...measureGlass(mesh, flip) }))
    .filter((c) => c.width > 0 && c.height > 0);

  if (candidates.length > 0) {
    // One exact name = one kind of surface, so take the biggest. Guessing from a hint: take the
    // flattest, since the glass is a thin pane and a bezel or tube is not.
    const best = candidates.reduce((a, b) =>
      exact
        ? (b.width * b.height > a.width * a.height ? b : a)
        : (b.thickness / Math.max(b.width, b.height) < a.thickness / Math.max(a.width, a.height) ? b : a)
    );
    return {
      center: best.center,
      normal: best.normal,
      right: best.right,
      up: best.up,
      width: best.width,
      height: best.height,
      source: `mesh "${best.label}"`,
      mesh: best.mesh,
    };
  }

  // Fallback: a rough guess at the front of the model, facing +Z
  console.warn(
    "[Scene] No screen mesh found, using a rough guess. Click a screen (DEBUG_PICK_MESH) to read " +
    "its name and set SCREEN_MESH_NAME. Meshes:",
    meshes.map((m) => m.label)
  );
  const size = modelBox.getSize(new THREE.Vector3());
  const width = size.x * 0.4;
  return {
    center: new THREE.Vector3(
      (modelBox.min.x + modelBox.max.x) / 2,
      modelBox.min.y + size.y * 0.69,
      modelBox.max.z
    ),
    normal: new THREE.Vector3(0, 0, 1),
    right: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    width,
    height: width / 1.6,
    source: "fallback guess",
  };
}

// How far in front of the glass the camera must sit, looking straight at it, so the whole
// glass fits the viewport (SCREEN_FILL of whichever dimension is the tighter one).
function fitDistance(frame: ScreenFrame, view: { fov: number; aspect: number }) {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(view.fov / 2));
  const byHeight = frame.height / 2 / tanHalf;
  const byWidth = frame.width / 2 / (tanHalf * view.aspect);
  return Math.max(byHeight, byWidth) / SCREEN_FILL;
}

// How much of the viewport the glass covers from where the camera is now, measured along the
// glass's own axis: 1 = it just fills the tighter dimension edge to edge, 0.5 = half of that.
function glassCoverage(frame: ScreenFrame, camera: THREE.PerspectiveCamera) {
  const p = camera.position, c = frame.center, n = frame.normal;
  const distance = (p.x - c.x) * n.x + (p.y - c.y) * n.y + (p.z - c.z) * n.z;
  if (distance <= 0) return 0;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const needed = Math.max(frame.height / 2 / tanHalf, frame.width / 2 / (tanHalf * camera.aspect));
  return needed / distance;
}

// Camera path: [start] -> [mid-air orbit arc] -> [front center] -> [screen glass].
// Front center and the final position are on the glass's own normal, so the camera arrives
// square to the glass however it is turned or tilted.
function buildScrollCurve(
  start: THREE.Vector3,
  frame: ScreenFrame,
  view: { fov: number; aspect: number },
  pivot: THREE.Vector3 = new THREE.Vector3()
) {
  const distance = fitDistance(frame, view);
  const begin = start.clone();
  const front = frame.center.clone().addScaledVector(frame.normal, distance * FRONT_DISTANCE_FACTOR);
  const screen = frame.center.clone().addScaledVector(frame.normal, distance - 0.1);

  // Where each point sits around the vertical axis through the pivot (0 = +Z)
  const angleOf = (p: THREE.Vector3) => Math.atan2(p.x - pivot.x, p.z - pivot.z);
  const radiusOf = (p: THREE.Vector3) => Math.hypot(p.x - pivot.x, p.z - pivot.z);
  const startAngle = angleOf(begin);
  // the short way round from the start to the front waypoint, wrapped to (-PI, PI]
  const sweep = Math.atan2(Math.sin(angleOf(front) - startAngle), Math.cos(angleOf(front) - startAngle));

  // Mid-air orbit point: half-way round the short way, at a radius between the start and the
  // front waypoint. A camera parked behind the model sweeps round its side instead of cutting
  // straight through it, and rises a little on the way.
  const arcAngle = startAngle + sweep / 2;
  const arcRadius = THREE.MathUtils.lerp(radiusOf(begin), radiusOf(front), 0.5);
  const arcHeight =
    THREE.MathUtils.lerp(begin.y, front.y, 0.5) + ARC_LIFT * (Math.abs(sweep) / Math.PI);
  const arc = new THREE.Vector3(
    pivot.x + Math.sin(arcAngle) * arcRadius,
    arcHeight,
    pivot.z + Math.cos(arcAngle) * arcRadius
  );

  // 'centripetal' avoids loops and overshoot when the waypoints are unevenly spaced
  return new THREE.CatmullRomCurve3([begin, arc, front, screen], false, "centripetal");
}

// Where the camera looks at path progress t (0..1): from wherever the user left the target,
// to the model's center early on, then onto the middle of the glass for the final approach.
// At t = 1 the camera is on the glass's normal looking at its center, i.e. head-on.
function lookAtForProgress(
  t: number,
  startTarget: THREE.Vector3,
  modelCenter: THREE.Vector3,
  screenCenter: THREE.Vector3,
  out: THREE.Vector3
) {
  return out
    .copy(startTarget)
    .lerp(modelCenter, THREE.MathUtils.smoothstep(t, 0, 0.15))
    .lerp(screenCenter, THREE.MathUtils.smoothstep(t, 0.55, 1));
}

// Crops the image to the glass's aspect ratio, like CSS object-fit: cover. A wider image loses
// its sides equally; a taller one keeps its top (the hero of a landing page) and loses the bottom.
// For no cropping at all, capture the screenshot at the glass's aspect ratio (logged on load).
function coverFit(texture: THREE.Texture, targetAspect: number) {
  const image = texture.image as { width: number; height: number };
  const imageAspect = image.width / image.height;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  if (imageAspect > targetAspect) {
    texture.repeat.x = targetAspect / imageAspect;
    texture.offset.x = (1 - texture.repeat.x) / 2;
  } else {
    texture.repeat.y = imageAspect / targetAspect;
    // which end of v is the top of the image depends on flipY
    texture.offset.y = texture.flipY ? 1 - texture.repeat.y : 0;
  }
}

// Puts the image on the screen's own material, so it keeps the glass's shape and depth. The
// screen glows (it is emissive), so the image drives the emissive colour and the base colour
// goes black: the room's lights then neither wash out nor dim the picture.
function applyScreenImage(mesh: THREE.Mesh, texture: THREE.Texture, frame: ScreenFrame) {
  texture.flipY = false; // glTF UVs start at the top-left, unlike TextureLoader's default
  texture.colorSpace = THREE.SRGBColorSpace;
  coverFit(texture, frame.width / frame.height);

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    const standard = material as THREE.MeshStandardMaterial;
    standard.map = texture;
    standard.emissiveMap = texture;
    standard.emissive.set(0xffffff);
    standard.emissiveIntensity = 1;
    standard.color.set(0x000000);
    standard.needsUpdate = true;
  }
}
// END-HELPERS

export default function Scene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xEDE7D9);

    // ==========================================
    // 1. FLOOR & ROOM WALLS SETUP
    // ==========================================
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    const roomMaterial = new THREE.MeshStandardMaterial({ color: 0xc9c9c9, side: THREE.DoubleSide });

    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floor = new THREE.Mesh(floorGeo, roomMaterial);
    floor.rotation.x = -Math.PI * 0.5;
    floor.position.y = 0;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    const wallGeo = new THREE.PlaneGeometry(100, 50);

    const backWall = new THREE.Mesh(wallGeo, roomMaterial);
    backWall.position.set(0, 25, -50);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    const frontWall = new THREE.Mesh(wallGeo, roomMaterial);
    frontWall.position.set(0, 25, 50);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    roomGroup.add(frontWall);

    const leftWall = new THREE.Mesh(wallGeo, roomMaterial);
    leftWall.position.set(-50, 25, 0);
    leftWall.rotation.y = Math.PI * 0.5;
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, roomMaterial);
    rightWall.position.set(50, 25, 0);
    rightWall.rotation.y = -Math.PI * 0.5;
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // ==========================================
    // 2. CAMERA & CONTROLS SETUP
    // ==========================================
    const camera = new THREE.PerspectiveCamera(15, sizes.width / sizes.height, 0.1, 200);
    camera.position.set(4, 5, 12);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ==========================================
    // PRELOADER REPORTING
    // ==========================================
    // Tells the preloader how far along the scene is. The model's download is most of it; the rest
    // is "model parsed and placed" and "monitor image applied". Once both of those are done the
    // tracker compiles every shader and waits for a few smooth frames before the cover may open.
    const loadState = { download: 0, placed: false, screenImage: !SCREEN_IMAGE_URL };
    const readyTracker = createReadyTracker(renderer, scene, camera);
    const reportLoad = () => {
      if (disposed) return; // the effect was torn down (React dev double-mount)
      preloader.setAssets(
        loadState.download * 90 + (loadState.placed ? 5 : 0) + (loadState.screenImage ? 5 : 0)
      );
      if (loadState.placed && loadState.screenImage) readyTracker.start();
    };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1;
    controls.maxDistance = 60;
    controls.target.set(0, 1.5, 0);
    controls.enableZoom = false;

    // ==========================================
    // 3. LIGHTING
    // ==========================================
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 12, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      refreshCameraPath(); // the fit distance depends on the aspect ratio
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // 4. SCROLL & CURVE PATH ENGINE
    // ==========================================
    let scrollProgress = 0; // 0 to 1
    let targetYCenter = 1.5;
    let isUserInteracting = false;
    let cameraCurve: THREE.CatmullRomCurve3 | null = null;

    // At or below this scroll value the camera is in free-orbit (OrbitControls on).
    // The scroll path starts exactly where this zone ends.
    const FREE_ORBIT_ZONE = 0.02;

    // Where the camera and its look target were when scrolling left the free-orbit zone.
    // Kept so that scrolling back can land on exactly the same view.
    const pathStartPosition = new THREE.Vector3();
    const pathStartTarget = new THREE.Vector3();

    // The screen glass, measured from the loaded model (see findScreenFrame). Until the model
    // arrives this is a stand-in so the path can still be built.
    let screenFrame: ScreenFrame = {
      center: new THREE.Vector3(0, targetYCenter, 0),
      normal: new THREE.Vector3(0, 0, 1),
      right: new THREE.Vector3(1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      width: 1.5,
      height: 1,
      source: "placeholder",
    };

    controls.addEventListener('start', () => { isUserInteracting = true; });
    controls.addEventListener('end', () => { isUserInteracting = false; });

    // ---- Hand-off to the real page ----------------------------------------------------------
    // The landing page is display: none (see LandingGate) for as long as the scene shows, so the
    // document has no height and there is nothing to scroll underneath the canvas. When the glass
    // covers TRANSITION_COVERAGE of the viewport, the transition starts (landingGate.begin). Once
    // it has fully covered the screen it calls landingGate.commit(): the canvas stops and the page
    // appears. Pulling up from the top of the page runs the same thing in reverse.
    let pageActive = false;
    let renderPaused = false;
    let atTopSince = 0; // when the page last came to rest at scrollY 0 (0 = it is not at the top)

    // The page just gained or lost its height: let anything that measures it (Lenis,
    // ScrollTrigger) re-measure. Nothing here touches the smooth-scroll library itself.
    const resetPageScroll = () => { if (window.scrollY !== 0) window.scrollTo(0, 0); };
    const remeasurePage = () => requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));

    let lastWheelAt = 0;     // time of the previous wheel event
    let swallowing = false;  // ignoring a wheel gesture that began while the scene was showing

    // Called by the gate while the transition fully covers the screen
    const enterPage = () => {
      const wrapper = containerRef.current;
      if (!wrapper) return;
      pageActive = true;
      renderPaused = true;
      wrapper.style.visibility = "hidden";
      wrapper.style.pointerEvents = "none";
      canvas.style.pointerEvents = "none"; // the stylesheet sets pointer-events: auto on the canvas itself
      resetPageScroll();
      swallowing = true; // the gesture that got us here may still be going: it must not scroll the page
      atTopSince = performance.now() - REENTER_DWELL_MS; // scrolling straight back up is allowed
      remeasurePage();
    };

    const leavePage = () => {
      const wrapper = containerRef.current;
      if (!wrapper) return;
      pageActive = false;
      renderPaused = false;
      wrapper.style.visibility = "";
      wrapper.style.pointerEvents = "";
      canvas.style.pointerEvents = "";
      resetPageScroll();
      remeasurePage();
    };

    const unsubscribeGate = landingGate.on((event) => {
      if (event.type !== "commit") return;
      try {
        if (event.direction === "enter") enterPage();
        else leavePage();
      } catch (error) {
        console.error("[Scene] swapping scene and page failed:", error);
      }
    });

    const handlePageScroll = () => {
      atTopSince = window.scrollY <= 0 ? (atTopSince || performance.now()) : 0;
    };
    window.addEventListener('scroll', handlePageScroll, { passive: true });

    // Only while a transition plays, or just after it (a gesture still in flight), are wheel events
    // stopped before the page's smooth scroll sees them. Everything else is left alone.
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return; // browser zoom gesture

      const now = performance.now();
      const quiet = now - lastWheelAt > WHEEL_QUIET_MS; // this event starts a new gesture
      lastWheelAt = now;

      // A transition is playing: nothing scrolls
      if (landingGate.busy) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }

      if (pageActive) {
        // A gesture that was still running when the page took over belongs to the scene
        if (swallowing) {
          if (!quiet) {
            event.stopImmediatePropagation();
            event.preventDefault();
            return;
          }
          swallowing = false;
        }
        // The real page is showing: it scrolls normally, unless the user pulls up from its top
        const atTop = window.scrollY <= 0 && atTopSince > 0 &&
          now - atTopSince >= REENTER_DWELL_MS;
        if (event.deltaY < 0 && atTop && quiet) {
          event.stopImmediatePropagation();
          event.preventDefault();
          scrollProgress = Math.min(scrollProgress, LEAVE_PROGRESS); // the camera backs away from the glass
          landingGate.begin("leave");
        }
        return; // otherwise not ours: the page (and its smooth scroll) handles it
      }

      // The scene is showing: the landing page is display: none, so the document has no height and
      // there is nothing to scroll. The wheel only drives the camera.
      event.preventDefault();
      const delta = event.deltaY * 0.0008;
      scrollProgress = Math.max(0, Math.min(1, scrollProgress + delta));

      // Leaving the free-orbit zone hands the camera to the scroll path. Handing it
      // back happens in animate(), once the camera has eased all the way home.
      if (scrollProgress > FREE_ORBIT_ZONE) {
        controls.enabled = false;
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    // Scroll value -> curve parameter. It stays at 0 inside the free-orbit zone, so the
    // path begins where the zone ends and scrolling back down lands exactly on the start.
    const pathProgress = () =>
      Math.max(0, (scrollProgress - FREE_ORBIT_ZONE) / (1 - FREE_ORBIT_ZONE));

    // The screenshot on the monitor: applied once both the image has loaded and the glass has
    // been found in the model, whichever happens last.
    let screenTexture: THREE.Texture | null = null;
    let screenImageApplied = false;

    const placeScreenImage = () => {
      if (screenImageApplied || !screenTexture || !screenFrame.mesh) return;
      screenImageApplied = true;
      applyScreenImage(screenFrame.mesh, screenTexture, screenFrame);
    };

    if (SCREEN_IMAGE_URL) {
      new THREE.TextureLoader().load(
        SCREEN_IMAGE_URL,
        (texture) => {
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          screenTexture = texture;
          placeScreenImage();
          loadState.screenImage = true;
          reportLoad();
        },
        undefined,
        (error) => {
          console.error(`[Scene] Could not load ${SCREEN_IMAGE_URL}:`, error);
          loadState.screenImage = true; // don't hold the preloader for a missing picture
          reportLoad();
        }
      );
    }

    // Rebuilds the live path from its saved start. Needed when what the end of the path depends
    // on changes mid-scroll: the viewport aspect (resize) or the measured screen (model load).
    const refreshCameraPath = () => {
      if (cameraCurve) {
        cameraCurve = buildScrollCurve(pathStartPosition, screenFrame, camera);
      }
    };

    // ==========================================
    // 5. MODEL LOADING
    // ==========================================
    let disposed = false;
    let animatedModel: THREE.Group | null = null;
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const modelLoader = new GLTFLoader();
    modelLoader.setDRACOLoader(dracoLoader);
    // Every way a .glb can be compressed has to be registered here, or the load fails outright:
    // Draco (above), Meshopt (gltfpack, gltf-transform optimize) and KTX2 textures.
    const ktx2Loader = new KTX2Loader().setTranscoderPath(BASIS_TRANSCODER_PATH).detectSupport(renderer);
    modelLoader.setKTX2Loader(ktx2Loader);
    modelLoader.setMeshoptDecoder(MeshoptDecoder);
    const model = "/models/computer_set-compressed.glb";

    modelLoader.load(model, (glb) => {
      animatedModel = glb.scene;

      animatedModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Sit the model on the floor...
      const box = new THREE.Box3().setFromObject(animatedModel);
      animatedModel.position.y = -box.min.y;
      scene.add(animatedModel);
      animatedModel.updateMatrixWorld(true);

      // ...then measure it where it now stands. (Measuring before the shift gives a center that
      // is off by the model's original min Y whenever its origin isn't at its base.)
      const placedBox = new THREE.Box3().setFromObject(animatedModel);
      targetYCenter = placedBox.getCenter(new THREE.Vector3()).y;
      controls.target.set(0, targetYCenter, 0);

      screenFrame = findScreenFrame(animatedModel, placedBox);
      const aspect = screenFrame.width / screenFrame.height;
      console.info(
        `[Scene] screen from ${screenFrame.source}: ` +
        `center (${screenFrame.center.toArray().map((v) => v.toFixed(3)).join(", ")}), ` +
        `facing (${screenFrame.normal.toArray().map((v) => v.toFixed(3)).join(", ")}), ` +
        `${screenFrame.width.toFixed(3)} x ${screenFrame.height.toFixed(3)} (aspect ${aspect.toFixed(3)}). ` +
        `Capture the hero with: node scripts/capture-hero.mjs <url> --aspect ${aspect.toFixed(3)}`
      );
      if (SCREEN_IMAGE_URL && !screenFrame.mesh) {
        console.warn("[Scene] Screenshot not applied: the screen mesh wasn't found. Set SCREEN_MESH_NAME.");
      }
      refreshCameraPath();
      placeScreenImage();
      loadState.placed = true;
      reportLoad();
    },
    (event) => {
      // Real bytes. (If the server doesn't send a length, the counter just creeps until the model lands.)
      if (event.lengthComputable && event.total > 0) {
        loadState.download = Math.min(1, event.loaded / event.total);
        reportLoad();
      }
    },
    (error) => {
      if (disposed) return; // the effect was torn down (React dev double-mount): not a real failure
      console.error("An error occurred loading the model:", error);
      landingGate.skip(); // no scene to scroll through: just show the landing page
      preloader.setAssets(100); // nothing left to wait for: let the cover open
      preloader.markSceneReady();
    });

    // Dev tool: click anywhere on the model and the console prints the mesh and material under
    // the cursor. Click a screen to get the name for SCREEN_MESH_NAME.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pressedAt = { x: 0, y: 0 };

    const handlePointerDown = (event: PointerEvent) => {
      pressedAt.x = event.clientX;
      pressedAt.y = event.clientY;
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!DEBUG_PICK_MESH || !animatedModel) return;
      // a drag (orbiting) is not a click
      if (Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > 4) return;

      pointer.set((event.clientX / sizes.width) * 2 - 1, -(event.clientY / sizes.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(animatedModel, true)[0];
      if (!hit) return;

      const mesh = hit.object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      console.info(
        `[Scene] clicked mesh "${mesh.name}", material "${materials.map((m) => m.name).join(", ")}"`
      );
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ==========================================
    // 6. ANIMATION LOOP WITH SPLINE CURVE
    // ==========================================
    let animationFrameId: number;
    const targetLookAt = new THREE.Vector3();
    const modelCenter = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (renderPaused) return; // the canvas is faded out over the real page

      if (!isUserInteracting) {
        // Scrolling has left the free-orbit zone: capture the camera and look target
        // exactly as the user left them, and build the path from there.
        if (!cameraCurve && scrollProgress > FREE_ORBIT_ZONE) {
          pathStartPosition.copy(camera.position);
          pathStartTarget.copy(controls.target);
          cameraCurve = buildScrollCurve(pathStartPosition, screenFrame, camera);
        }

        if (cameraCurve) {
          const t = pathProgress();

          // Position along the smooth path for the current scroll value. Scrolling back
          // up just walks t back down the same curve, so the move reverses exactly.
          camera.position.lerp(cameraCurve.getPoint(t), 0.08);

          // The look target eases from where the user left it to the model center, then onto
          // the middle of the glass, and retraces that on the way home. At the end of the path
          // the camera is on the glass's normal looking at its center: a head-on view.
          modelCenter.set(0, targetYCenter, 0);
          lookAtForProgress(t, pathStartTarget, modelCenter, screenFrame.center, targetLookAt);
          controls.target.lerp(targetLookAt, 0.08);

          // The glass nearly fills the viewport: start the transition. The camera carries on to
          // the very end of the path underneath it; input is locked until it has finished.
          if (
            !pageActive &&
            !landingGate.busy &&
            scrollProgress >= 0.9 &&
            glassCoverage(screenFrame, camera) >= TRANSITION_COVERAGE * SCREEN_FILL
          ) {
            scrollProgress = 1;
            landingGate.begin("enter");
          }

          // Back at the top and fully settled on the original view: land on it exactly,
          // drop the curve and give the camera back to OrbitControls.
          if (
            scrollProgress <= FREE_ORBIT_ZONE &&
            camera.position.distanceTo(pathStartPosition) < 0.002 &&
            controls.target.distanceTo(pathStartTarget) < 0.002
          ) {
            camera.position.copy(pathStartPosition);
            controls.target.copy(pathStartTarget);
            cameraCurve = null;
            controls.enabled = true;
          }
        }
      }

      if (controls.enabled) {
        controls.update();
      } else {
        camera.lookAt(controls.target);
      }

      renderer.render(scene, camera);
      readyTracker.frame();
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel, { capture: true });
      window.removeEventListener('scroll', handlePageScroll);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      disposed = true;
      readyTracker.cancel();
      unsubscribeGate();
      landingGate.reset();
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      dracoLoader.dispose();
      ktx2Loader.dispose();
      screenTexture?.dispose();
      renderer.dispose();
    };

  }, []);

  return (
    <div
      className={styles.webGl_wrapper}
      ref={containerRef}
      style={{
        height: "100vh",
        width: "100vw",
        position: "fixed",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} className={styles.webGl}></canvas>
    </div>
  );
}
