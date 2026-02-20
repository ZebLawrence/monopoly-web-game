import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@monopoly/shared'],
  experimental: {
    optimizePackageImports: ['@monopoly/shared'],
  },
};

export default nextConfig;
