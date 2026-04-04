// NextAuth MUST run inside Next.js (needs cookies, session management)
// This route is excluded from Fastify rewrites in next.config.ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
