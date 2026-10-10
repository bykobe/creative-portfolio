"use client";

import styles from "./components.module.css";
import * as THREE from 'three';
import { useEffect, useRef } from "react";
import { GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";
// 💡 Import GSAP and ScrollTrigger
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
    // 2. CAMERA & INITIAL ORBIT CONTROLS
    // ==========================================
    const camera = new THREE.PerspectiveCamera(15, sizes.width / sizes.height, 0.1, 200);

    // 💡 Image 1: Default view setting the camera angled up and off to the right
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

    // Set controls to point at the center of where the model rests
    controls.target.set(0, 1.5, 0);

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
    // 4. MODEL LOADING & GSAP TIMELINE SETUP
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

      // Get exact calculated center height of the screen mesh
      const center = new THREE.Vector3();
      box.getCenter(center);
      const targetY = center.y; // Center point of the machine height

      // Adjust controls target directly to the machine's middle center
      controls.target.set(0, targetY, 0);

      // 💡 Initialize GSAP Scroll Animation
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current, // Use the scroll wrapper element
          start: "top top",
          end: "bottom bottom",
          scrub: 1, // Smooth interpolation linked to scroll position
          onUpdate: (self) => {
            // Disable user input while scrolling actively to prevent physics code fighting
            if (self.progress > 0.01 && self.progress < 0.99) {
              controls.enabled = false;
            } else {
              controls.enabled = true;
            }
          },
          onComplete: () => { controls.enabled = true; },
          onInterrupt: () => { controls.enabled = true; }
        }
      });

      // 💡 GSAP Animation Chain
      tl.to(camera.position, {
        // Image 2 Position: Move dead center front on X-axis, square up Y-axis height
        x: 0,
        y: targetY,
        z: 8, // Bring camera closer square in front
        duration: 2,
        ease: "power2.inOut"
      })
      .to(controls.target, {
        x: 0,
        y: targetY,
        z: -5,
        duration: 2,
        ease: "power2.inOut"
      }, "<") // Start at same time as position movement
      .to(camera.position, {
        // Push deep into the monitor until screen elements fill layout viewport
        z: 2.1, // Adjust this number slightly forward/backward depending on your GLB screen depth scale
        duration: 2,
        ease: "power1.in"
      });

    },
    undefined,
    (error) => {
      console.error("An error occurred loading the model:", error);
    });

    // ==========================================
    // 5. ANIMATION LOOP
    // ==========================================
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (controls.target.y < 0) {
        controls.target.y = 0;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      ScrollTrigger.getAll().forEach(t => t.kill()); // Clean up scroll updates
      controls.dispose();
      renderer.dispose();
    };

  }, []);

  return (
    // 💡 Wrapper container controls page scroll limits height
    <div className={styles.webGl_wrapper} ref={containerRef} style={{ height: "300vh", position: "relative" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}>
        <canvas ref={canvasRef} className={styles.webGl}></canvas>
      </div>
    </div>
  );
}
