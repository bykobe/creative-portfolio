'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface PixelBlobTransitionProps {
  onComplete?: () => void;
  delay?: number; // Delay in seconds before transition starts
  duration?: number; // Transition duration in seconds
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  maxRadius: number;
}

export default function PixelBlobTransition({
  onComplete,
  delay = 0.8,
  duration = 2.2,
}: PixelBlobTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef({ value: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Pixelation grid resolution (lower number = larger chunky pixels, matching your reference)
    const pixelSize = 16;
    const cols = Math.ceil(width / pixelSize);
    const rows = Math.ceil(height / pixelSize);

    // Define initial floating blob seeds matching the layout style
    const blobs: Blob[] = [
      { x: width * 0.15, y: height * 0.15, vx: 0.4, vy: 0.3, baseRadius: 40, maxRadius: Math.max(width, height) * 0.9 },
      { x: width * 0.8, y: height * 0.2, vx: -0.3, vy: 0.5, baseRadius: 70, maxRadius: Math.max(width, height) * 0.95 },
      { x: width * 0.2, y: height * 0.5, vx: 0.5, vy: -0.2, baseRadius: 60, maxRadius: Math.max(width, height) * 0.9 },
      { x: width * 0.65, y: height * 0.6, vx: -0.4, vy: -0.4, baseRadius: 90, maxRadius: Math.max(width, height) * 1.1 },
      { x: width * 0.3, y: height * 0.85, vx: 0.3, vy: -0.3, baseRadius: 50, maxRadius: Math.max(width, height) * 0.85 },
      { x: width * 0.75, y: height * 0.85, vx: -0.2, vy: -0.5, baseRadius: 55, maxRadius: Math.max(width, height) * 0.9 },
    ];

    // GSAP Timeline for smooth power1.inOut progression
    const tl = gsap.timeline({
      delay: delay,
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });

    tl.to(progressRef.current, {
      value: 1,
      duration: duration,
      ease: 'power1.inOut', // Smooth acceleration and deceleration
    });

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, width, height);

      const p = progressRef.current.value;

      // Global threshold that decreases/expands as progress goes from 0 to 1
      // Controls metaball merging and eventual full coverage
      const baseThreshold = 14000;
      const currentThreshold = baseThreshold * (1 - p) + 200 * p;

      // Update ambient floating positions slightly before takeover
      blobs.forEach((blob, i) => {
        if (p < 0.5) {
          blob.x += Math.sin(time + i) * blob.vx;
          blob.y += Math.cos(time * 0.8 + i) * blob.vy;
        }
      });

      // Loop through the chunky pixel grid
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = c * pixelSize + pixelSize / 2;
          const py = r * pixelSize + pixelSize / 2;

          let sum = 0;
          blobs.forEach((blob) => {
            const dx = px - blob.x;
            const dy = py - blob.y;
            const distSq = dx * dx + dy * dy;

            // Expand effective radius based on transition progress `p` (power1.inOut interpolated)
            const currentRadius = blob.baseRadius + (blob.maxRadius - blob.baseRadius) * p;

            if (distSq > 1) {
              sum += (currentRadius * currentRadius * 1000) / distSq;
            } else {
              sum += 999999;
            }
          });

          // If metaball field strength passes threshold, draw the pixel block
          if (sum > currentThreshold || p > 0.92) {
            ctx.fillStyle = '#0000FF'; // Signature vivid portfolio blue
            ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize + 0.5, pixelSize + 0.5);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      tl.kill();
    };
  }, [delay, duration, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
