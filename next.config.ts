import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Updated image settings (domains deprecated → use remotePatterns)
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },

  // ✅ Webpack configuration for absolute imports and optimizations
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": "./src",
      components: "./src/components",
      pages: "./src/pages",
      styles: "./src/styles",
      utils: "./src/utils",
      hooks: "./src/hooks",
      lib: "./src/lib",
    };

    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
    };

    return config;
  },

  // ✅ Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // ✅ React & server behavior
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // ✅ Page extensions
  pageExtensions: ["tsx", "ts", "jsx", "js"],

  // ✅ Rewrites placeholder
  async rewrites() {
    return [];
  },

  // ✅ (Removed invalid `experimental.turbo`)
  experimental: {
    // You can still use other supported flags here like:
    // serverActions: true,
    // optimizePackageImports: ["react-icons"]
  },

  // ✅ Development-only rewrites (cleanly handled)
  ...(process.env.NODE_ENV === "development" && {
    async rewrites() {
      return [];
    },
  }),
};

export default nextConfig;
