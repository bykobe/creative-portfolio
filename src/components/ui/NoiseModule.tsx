"use client";

import React, { useEffect, useRef } from "react";
import styles from "./ui.module.css";

export default function NoiseOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    resize();
    window.addEventListener("resize", resize);

    const generateNoise = () => {
      const w = canvas.width;
      const h = canvas.height;

      if (w === 0 || h === 0) return;

      const iData = ctx.createImageData(w, h);
      const buffer32 = new Uint32Array(iData.data.buffer);
      const len = buffer32.length;

      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.5) {
          buffer32[i] = 0xffffffff;
        }
      }

      ctx.putImageData(iData, 0, 0);
    };

    const loop = () => {
      generateNoise();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (

      <canvas ref={canvasRef} className={styles.noise} />

  );
}
