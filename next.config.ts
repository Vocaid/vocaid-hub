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
    // Only rewrite to Fastify backend when BACKEND_URL is set
    // EXCLUDE /api/auth/* — NextAuth must handle those within Next.js
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return { fallback: [] };
    return {
      beforeFiles: [
        // Fastify backend handles all API routes EXCEPT auth
        { source: '/api/auth/:path*', destination: '/api/auth/:path*' }, // keep in Next.js
      ],
      fallback: [
        { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
        { source: '/.well-known/:path*', destination: `${backendUrl}/.well-known/:path*` },
      ],
    };
  },
};

export default nextConfig;
