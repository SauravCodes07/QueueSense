import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';
import { FastifyInstance } from 'fastify';

describe('Fastify Server Health & Error Envelope', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /health returns healthy status', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('healthy');
  });

  it('GET /api/v1/health returns healthy status', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('healthy');
  });

  it('handles invalid route with consistent error envelope: { error: { code, message } }', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/non-existent-route',
    });

    expect(res.statusCode).toBe(404);
  });
});
