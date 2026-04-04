export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    // Run auth middleware only on protected routes and auth API
    // Exclude: static assets, agent A2A/MCP endpoints (public API)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|api/agents/[^/]+/a2a|api/agents/[^/]+/mcp).*)',
  ],
};
