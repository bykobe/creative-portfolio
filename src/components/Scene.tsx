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
    let dynamicCurve: THREE.CatmullRomCurve3 | null = null;

    controls.addEventListener('start', () => { isUserInteracting = true; });
    controls.addEventListener('end', () => { isUserInteracting = false; });

    const handleWheel = (event: WheelEvent) => {
      const delta = event.deltaY * 0.0008;
      scrollProgress = Math.max(0, Math.min(1, scrollProgress + delta));

      if (scrollProgress > 0.02) {
        controls.enabled = false;
      } else if (!isUserInteracting) {
        controls.enabled = true;
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });

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
    let lastScrollProgress = -1;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isUserInteracting) {
        if (scrollProgress === 0 && controls.enabled) {
          // Reset curve cache when user returns to top
          dynamicCurve = null;
          lastScrollProgress = 0;
          controls.target.set(0, targetYCenter, 0);
        } else {
          // The first time scroll starts, build a custom CatmullRom curve
          // starting dynamically from wherever the user's camera currently is!
          if (!dynamicCurve || Math.abs(scrollProgress - lastScrollProgress) > 0.5 && scrollProgress < 0.05) {
            const currentCamPos = camera.position.clone();
            const frontFacePos = new THREE.Vector3(0, targetYCenter + 0.7 , 6); // Sweeps around to front
            const screenZoomPos = new THREE.Vector3(0, targetYCenter + 1.5, 1); // Snaps into screen glass

            dynamicCurve = new THREE.CatmullRomCurve3([
              currentCamPos,
              frontFacePos,
              screenZoomPos
            ]);
          }

          if (dynamicCurve) {
            // Evaluate the exact 3D position along our smooth curve based on scroll progress
            const targetCamPosition = dynamicCurve.getPoint(scrollProgress);

            // Smoothly lerp camera position and look target
            camera.position.lerp(targetCamPosition, 0.08);

            const targetLookAt = new THREE.Vector3(0, targetYCenter, 0);
            controls.target.lerp(targetLookAt, 0.08);
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
