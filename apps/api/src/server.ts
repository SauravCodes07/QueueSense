import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { queueRoutes } from './routes/queue.routes.js';
import { consultationRoutes } from './routes/consultations.routes.js';
import { workloadRoutes } from './routes/workload.routes.js';
import { streamRoutes } from './routes/stream.routes.js';
import { auditRoutes } from './routes/audit.routes.js';
import { demoRoutes } from './routes/demo.routes.js';
import { prisma } from './db/client.js';

export function buildServer() {
  const fastify = Fastify({
    logger: config.NODE_ENV === 'development' ? { level: 'info' } : false,
  });

  // CORS configuration supporting dynamic Vercel origin and local dev
  const rawOrigins = config.CORS_ORIGIN || config.CORS_ORIGINS;
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  fastify.register(cors, {
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
  });

  // Rate Limiting
  fastify.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  // Global Error Handler per Section 4.4: { error: { code, message } }
  fastify.setErrorHandler((error: any, _request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    const code = error.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
    const message = statusCode === 500 ? 'An internal error occurred' : error.message || 'Request failed';

    return reply.status(statusCode).send({
      error: { code, message },
    });
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });
  fastify.get('/api/v1/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // API Routes (Registered under /api/v1 and root for seamless compatibility)
  fastify.register(authRoutes);
  fastify.register(queueRoutes);
  fastify.register(consultationRoutes);
  fastify.register(workloadRoutes);
  fastify.register(streamRoutes);
  fastify.register(auditRoutes);
  fastify.register(demoRoutes);

  fastify.register(authRoutes, { prefix: '/api/v1' });
  fastify.register(queueRoutes, { prefix: '/api/v1' });
  fastify.register(consultationRoutes, { prefix: '/api/v1' });
  fastify.register(workloadRoutes, { prefix: '/api/v1' });
  fastify.register(streamRoutes, { prefix: '/api/v1' });
  fastify.register(auditRoutes, { prefix: '/api/v1' });
  fastify.register(demoRoutes, { prefix: '/api/v1' });

  return fastify;
}

async function start() {
  const server = buildServer();
  try {
    await server.listen({ port: config.PORT, host: config.HOST });
    console.log(`🚀 QueueSense Fastify API server running at http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('server')) {
  start();
}
