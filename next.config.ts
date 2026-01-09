import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack config for dev and build
  turbopack: {
    resolveAlias: {
      canvas: "./empty-module.js",
    },
  },
  // Webpack config as fallback
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
