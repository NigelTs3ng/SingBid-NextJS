import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization settings
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // Webpack configuration for better compatibility
  webpack: (config) => {
    // Add support for absolute imports from src directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
      'components': './src/components',
      'pages': './src/pages',
      'styles': './src/styles',
      'utils': './src/utils',
      'hooks': './src/hooks',
      'lib': './src/lib',
    };

    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Enable strict mode for better development experience
  reactStrictMode: true,

  // Disable powered by Next.js header
  poweredByHeader: false,

  // Compression for better performance
  compress: true,

  // Configure which files should be treated as pages
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Exclude component directories from being treated as pages
  async rewrites() {
    return [];
  },

  experimental: {
    turbo: {
      rules: {
        // Exclude component directories from page routing
        '**/components/**': {
          loaders: [],
        },
      },
    },
  },

  // Development server configuration
  ...(process.env.NODE_ENV === 'development' && {
    // Custom port matching Vite config
    async rewrites() {
      return [];
    },
  }),
};

export default nextConfig;
