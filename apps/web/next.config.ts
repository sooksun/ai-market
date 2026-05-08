import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ai-market/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
