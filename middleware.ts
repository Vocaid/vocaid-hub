export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    // Run auth middleware on protected routes only
    // Exclude: static assets (API routes are on Fastify :5001, proxied via next.config.ts rewrites)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)',
  ],
};
