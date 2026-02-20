import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  transpilePackages: ['@monopoly/shared'],
  experimental: {
    optimizePackageImports: ['@monopoly/shared'],
  },
};

// Wrap with Sentry only when DSN is configured
export default process.env.NEXT_PUBLIC_SENTRY_DSN ? withSentryConfig(nextConfig) : nextConfig;
