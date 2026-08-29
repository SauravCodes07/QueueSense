import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client.js';
import { generateToken, generatePatientToken } from '../middleware/rbac.js';
import { UserRole } from '../types/index.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/login — Staff / Doctor login
  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid email or password format' },
      });
    }

    const { email, password } = parseResult.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { doctor: true },
    });

    if (!user) {
      return reply.status(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    if (!user.passwordHash) {
      return reply.status(401).send({
        error: { code: 'OAUTH_USER', message: 'Please sign in with Supabase / Google OAuth' },
      });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return reply.status(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      doctorId: user.doctorId,
    });

    return reply.send({
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        doctor_id: user.doctorId,
      },
    });
  });

  // POST /auth/patient-token — Validate single-purpose patient queue token
  fastify.post('/auth/patient-token', async (request: FastifyRequest<{ Querystring: { patient_token?: string } }>, reply: FastifyReply) => {
    const tokenStr = request.query.patient_token || (request.body as any)?.patient_token;
    if (!tokenStr) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'patient_token query parameter required' },
      });
    }

    const patient = await prisma.patient.findUnique({
      where: { token: tokenStr },
    });

    if (!patient) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Patient token not found' },
      });
    }

    const sessionToken = generatePatientToken(patient.token);

    return reply.send({
      token: patient.token,
      name: patient.name,
      patient_id: patient.id,
      session_token: sessionToken,
    });
  });
}
