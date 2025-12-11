import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty Turbopack config to acknowledge Next.js 16+ Turbopack defaults
  // PDF.js handling works without special config in Turbopack
  turbopack: {},
  // Keep webpack config for fallback compatibility if needed
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker and canvas issues
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }

    // Ignore PDF.js worker files to prevent build issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      canvas: false,
    };

    return config;
  },
};

export default nextConfig;
