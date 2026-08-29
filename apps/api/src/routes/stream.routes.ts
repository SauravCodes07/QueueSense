import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eventBus, QueueUpdatedEvent, PatientETAUpdatedEvent } from '../events/bus.js';
import { getOrderedDoctorQueue } from '../modules/queue/queue.service.js';

export async function streamRoutes(fastify: FastifyInstance) {
  // GET /stream/doctors/:id/queue — SSE stream for doctor's queue updates
  fastify.get('/stream/doctors/:id/queue', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const doctorId = parseInt(request.params.id, 10);
    if (isNaN(doctorId)) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid doctor ID' } });
    }

    reply.hijack();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial snapshot
    try {
      const initialQueue = await getOrderedDoctorQueue(doctorId);
      reply.raw.write(`event: queue_updated\ndata: ${JSON.stringify({ doctorId, reason: 'connected', queue: initialQueue })}\n\n`);
    } catch {
      reply.raw.write(`event: queue_updated\ndata: ${JSON.stringify({ doctorId, reason: 'connected', queue: [] })}\n\n`);
    }

    const onQueueUpdate = async (event: QueueUpdatedEvent) => {
      try {
        const queue = await getOrderedDoctorQueue(doctorId);
        reply.raw.write(`event: queue_updated\ndata: ${JSON.stringify({ ...event, queue })}\n\n`);
      } catch (err) {
        console.error('Error writing SSE queue update:', err);
      }
    };

    // Heartbeat timer every 25s
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    eventBus.on(`doctor:${doctorId}:queue_updated`, onQueueUpdate);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      eventBus.off(`doctor:${doctorId}:queue_updated`, onQueueUpdate);
    });
  });

  // GET /stream/patients/:token — SSE stream for patient ETA updates
  fastify.get('/stream/patients/:token', async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    const { token } = request.params;

    reply.hijack();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ connected: true })}\n\n`);

    const onETAUpdate = (event: PatientETAUpdatedEvent) => {
      try {
        reply.raw.write(`event: eta_updated\ndata: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        console.error('Error writing SSE patient update:', err);
      }
    };

    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    eventBus.on(`patient:${token}:eta_updated`, onETAUpdate);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      eventBus.off(`patient:${token}:eta_updated`, onETAUpdate);
    });
  });
}
