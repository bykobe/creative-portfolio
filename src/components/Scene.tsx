"use client";

import styles from "./components.module.css";
import * as THREE from 'three';
import { useEffect, useRef } from "react";
import { GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";

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

    // Fixed waypoints, relative to the model's vertical center
    const FRONT_RADIUS = 3;      // distance from the model for the "front center" waypoint
    const FRONT_LIFT = 0.7;      // height above model center at front center
    const SCREEN_LIFT = 1.5;     // height above model center at the screen glass
    const SCREEN_DISTANCE = 1;   // distance from the model at the screen glass
    const ARC_LIFT = 1.2;        // extra height on the orbit arc when sweeping round from behind

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

    // Builds the scroll path from the camera's *current* position:
    // [current position] -> [mid-air orbit arc] -> [front center] -> [screen glass]
    const buildCameraCurve = () => {
      const start = camera.position.clone();
      const front = new THREE.Vector3(0, targetYCenter + FRONT_LIFT, FRONT_RADIUS);
      const screen = new THREE.Vector3(0, targetYCenter + SCREEN_LIFT, SCREEN_DISTANCE);

      // Where the camera sits around the model's vertical axis:
      // 0 = straight in front (+Z), ±PI = directly behind.
      const startAngle = Math.atan2(start.x, start.z);
      const startRadius = Math.hypot(start.x, start.z);

      // Mid-air orbit point: half-way round the short way, at a radius between the start
      // and the front waypoint. A camera parked behind the model sweeps round its side
      // instead of cutting straight through it, and rises a little on the way.
      const arcAngle = startAngle * 0.5;
      const arcRadius = THREE.MathUtils.lerp(startRadius, FRONT_RADIUS, 0.5);
      const arcHeight =
        THREE.MathUtils.lerp(start.y, front.y, 0.5) +
        ARC_LIFT * (Math.abs(startAngle) / Math.PI);
      const arc = new THREE.Vector3(
        Math.sin(arcAngle) * arcRadius,
        arcHeight,
        Math.cos(arcAngle) * arcRadius
      );

      // 'centripetal' avoids loops and overshoot when the waypoints are unevenly spaced
      return new THREE.CatmullRomCurve3([start, arc, front, screen], false, 'centripetal');
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

      const box = new THREE.Box3().setFromObject(animatedModel);
      const minY = box.min.y;
      animatedModel.position.y = -minY;
      scene.add(animatedModel);

      const center = new THREE.Vector3();
      box.getCenter(center);
      targetYCenter = center.y;
      controls.target.set(0, targetYCenter, 0);
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
          cameraCurve = buildCameraCurve();
        }

        if (cameraCurve) {
          const t = pathProgress();

          // Position along the smooth path for the current scroll value. Scrolling back
          // up just walks t back down the same curve, so the move reverses exactly.
          camera.position.lerp(cameraCurve.getPoint(t), 0.08);

          // The look target eases from where the user left it to the model center,
          // and back again on the way home.
          modelCenter.set(0, targetYCenter, 0);
          targetLookAt
            .copy(pathStartTarget)
            .lerp(modelCenter, THREE.MathUtils.smoothstep(t, 0, 0.15));
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
