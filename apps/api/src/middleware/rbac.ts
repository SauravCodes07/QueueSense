import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const UserRole = {
  ADMIN: 'ADMIN',
  RECEPTION: 'RECEPTION',
  DOCTOR: 'DOCTOR',
  PATIENT: 'PATIENT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface AuthPayload {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  doctorId?: number | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPayload;
    patientToken?: string;
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });
}

export function generatePatientToken(token: string): string {
  return jwt.sign({ token, role: 'PATIENT' }, config.JWT_SECRET, { expiresIn: '24h' });
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authentication token' },
    });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    request.user = decoded;
  } catch {
    return reply.status(401).send({
      error: { code: 'INVALID_TOKEN', message: 'Token is expired or invalid' },
    });
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (!request.user) return;

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        },
      });
    }
  };
}

export function requireDoctorOrStaff() {
  return requireRoles(UserRole.DOCTOR, UserRole.RECEPTION, UserRole.ADMIN);
}

export function requireStaff() {
  return requireRoles(UserRole.RECEPTION, UserRole.ADMIN);
}

export function requireAdmin() {
  return requireRoles(UserRole.ADMIN);
}
