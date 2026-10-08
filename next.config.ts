import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  devIndicators: false,

  images: {
    // AVIF first, WebP fallback. Both are far smaller than the source PNG/JPEG.
    formats: ["image/avif", "image/webp"],
    // The grid tiles never exceed ~half the viewport on desktop.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
