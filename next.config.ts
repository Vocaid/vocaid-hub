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
    // Only rewrite to Fastify backend in local dev (BACKEND_URL set)
    // On Vercel, there's no Fastify process — skip rewrites
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return { fallback: [] };
    return {
      fallback: [
        { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
        { source: '/.well-known/:path*', destination: `${backendUrl}/.well-known/:path*` },
      ],
    };
  },
};

export default nextConfig;
