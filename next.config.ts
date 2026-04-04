import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https' as const, hostname: 'static.usernames.app-backend.toolsforhumanity.com' },
    ],
  },
  allowedDevOrigins: ['*'],
  reactStrictMode: false,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5001';
    return {
      fallback: [
        { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
        { source: '/.well-known/:path*', destination: `${backendUrl}/.well-known/:path*` },
      ],
    };
  },
};

export default nextConfig;
