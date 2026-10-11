"use client";

import styles from "./components.module.css";
import * as THREE from 'three';
import { useEffect, useRef } from "react";
import { GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";

// ==========================================
// SCROLL PATH & SCREEN FRAMING (pure helpers)
// ==========================================
// BEGIN-HELPERS

// The glass is looked up by name (mesh name or material name). If the console reports that
// the fallback proportions were used, read the mesh names it prints and adjust this.
const SCREEN_NAME_HINT = /screen|display|glass|monitor|crt/i;

// How much of the viewport the glass fills when scrolled all the way in
// (1 = touching the edges, 0.92 = a small margin all round).
const SCREEN_FILL = 0.92;

// The "front center" waypoint sits this many times further from the glass than the final
// position. It is on the glass's own axis, so the last stretch is a straight dolly-in.
const FRONT_DISTANCE_FACTOR = 4;

// Extra height on the orbit arc when the camera has to sweep round from behind the model
const ARC_LIFT = 1.2;

interface ScreenFrame {
  center: THREE.Vector3; // middle of the glass, on its front plane (the model faces +Z)
  width: number;
  height: number;
  source: string;
}

// Finds the screen glass in the loaded model. Call after the model has been placed in the scene.
function findScreenFrame(root: THREE.Object3D, modelBox: THREE.Box3): ScreenFrame {
  root.updateMatrixWorld(true);

  const candidates: { label: string; box: THREE.Box3; flatness: number }[] = [];
  const meshLabels: string[] = [];

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const label = [mesh.name, ...materials.map((m) => m.name)].filter(Boolean).join(" / ");
    meshLabels.push(label);
    if (!SCREEN_NAME_HINT.test(label)) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    if (size.x <= 0 || size.y <= 0) return;

    // Depth relative to face size: the glass is a thin pane, a bezel or tube is not
    candidates.push({ label, box, flatness: size.z / Math.max(size.x, size.y) });
  });

  if (candidates.length > 0) {
    const best = candidates.reduce((a, b) => (b.flatness < a.flatness ? b : a));
    const size = best.box.getSize(new THREE.Vector3());
    const center = best.box.getCenter(new THREE.Vector3());
    center.z = best.box.max.z;
    return { center, width: size.x, height: size.y, source: `mesh "${best.label}"` };
  }

  // Fallback: proportions of a Macintosh Classic's case (the 9" tube is 512 x 342, i.e. 3:2)
  console.warn(
    "[Scene] No mesh matched SCREEN_NAME_HINT, using case proportions for the screen. Meshes:",
    meshLabels
  );
  const size = modelBox.getSize(new THREE.Vector3());
  const width = size.x * 0.72;
  return {
    center: new THREE.Vector3(
      (modelBox.min.x + modelBox.max.x) / 2,
      modelBox.min.y + size.y * 0.69,
      modelBox.max.z - size.z * 0.04
    ),
    width,
    height: width / 1.5,
    source: "fallback proportions",
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

// Camera path: [start] -> [mid-air orbit arc] -> [front center] -> [screen glass].
// Front center and the final position share the glass's x/y, so the camera arrives on
// the glass's normal and the last view is perpendicular to it.
function buildScrollCurve(
  start: THREE.Vector3,
  frame: ScreenFrame,
  view: { fov: number; aspect: number }
) {
  const distance = fitDistance(frame, view);
  const { x, y, z } = frame.center;
  const begin = start.clone();
  const front = new THREE.Vector3(x, y, z + distance * FRONT_DISTANCE_FACTOR);
  const screen = new THREE.Vector3(x, y, z + distance);

  // Where the camera sits around the model's vertical axis:
  // 0 = straight in front (+Z), ±PI = directly behind.
  const startAngle = Math.atan2(begin.x, begin.z);
  const startRadius = Math.hypot(begin.x, begin.z);
  const frontRadius = Math.hypot(front.x, front.z);

  // Mid-air orbit point: half-way round the short way, at a radius between the start
  // and the front waypoint. A camera parked behind the model sweeps round its side
  // instead of cutting straight through it, and rises a little on the way.
  const arcAngle = startAngle * 0.5;
  const arcRadius = THREE.MathUtils.lerp(startRadius, frontRadius, 0.5);
  const arcHeight =
    THREE.MathUtils.lerp(begin.y, front.y, 0.5) +
    ARC_LIFT * (Math.abs(startAngle) / Math.PI);
  const arc = new THREE.Vector3(
    Math.sin(arcAngle) * arcRadius,
    arcHeight,
    Math.cos(arcAngle) * arcRadius
  );

  // 'centripetal' avoids loops and overshoot when the waypoints are unevenly spaced
  return new THREE.CatmullRomCurve3([begin, arc, front, screen], false, "centripetal");
}

// Where the camera looks at path progress t (0..1): from wherever the user left the target,
// to the model's center early on, then onto the middle of the glass for the final approach.
// At t = 1 the camera is on the glass's axis looking at the glass center, i.e. head-on.
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
      width: 1.5,
      height: 1,
      source: "placeholder",
    };

    controls.addEventListener('start', () => { isUserInteracting = true; });
    controls.addEventListener('end', () => { isUserInteracting = false; });

    const handleWheel = (event: WheelEvent) => {
      const delta = event.deltaY * 0.0008;
      scrollProgress = Math.max(0, Math.min(1, scrollProgress + delta));

      // Leaving the free-orbit zone hands the camera to the scroll path. Handing it
      // back happens in animate(), once the camera has eased all the way home.
      if (scrollProgress > FREE_ORBIT_ZONE) {
        controls.enabled = false;
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });

    // Scroll value -> curve parameter. It stays at 0 inside the free-orbit zone, so the
    // path begins where the zone ends and scrolling back down lands exactly on the start.
    const pathProgress = () =>
      Math.max(0, (scrollProgress - FREE_ORBIT_ZONE) / (1 - FREE_ORBIT_ZONE));

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
    let animatedModel: THREE.Group | null = null;
    const modelLoader = new GLTFLoader();
    const model = "/models/macintosh_classic_1991.glb";

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
      console.info(
        `[Scene] screen from ${screenFrame.source}: ` +
        `center (${screenFrame.center.toArray().map((v) => v.toFixed(3)).join(", ")}), ` +
        `${screenFrame.width.toFixed(3)} x ${screenFrame.height.toFixed(3)}`
      );
      refreshCameraPath();
    },
    undefined,
    (error) => {
      console.error("An error occurred loading the model:", error);
    });

    // ==========================================
    // 6. ANIMATION LOOP WITH SPLINE CURVE
    // ==========================================
    let animationFrameId: number;
    const targetLookAt = new THREE.Vector3();
    const modelCenter = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

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
          // the camera is on the glass's axis looking at its center: a head-on view.
          modelCenter.set(0, targetYCenter, 0);
          lookAtForProgress(t, pathStartTarget, modelCenter, screenFrame.center, targetLookAt);
          controls.target.lerp(targetLookAt, 0.08);

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
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
    };

  }, []);

  return (
    <div className={styles.webGl_wrapper} ref={containerRef} style={{ height: "100vh", width: "100vw", position: "fixed", overflow: "hidden" }}>
      <canvas ref={canvasRef} className={styles.webGl}></canvas>
    </div>
  );
}
