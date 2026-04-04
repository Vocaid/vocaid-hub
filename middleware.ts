export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    // Run auth middleware on protected routes only
    // Exclude: static assets, API routes (proxied to Fastify)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|api/).*)',
  ],
};
