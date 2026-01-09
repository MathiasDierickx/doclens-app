import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Fix for pdfjs-dist trying to load Node.js canvas module
      canvas: { browser: "" },
    },
  },
};

export default nextConfig;
