import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireStaff } from '../middleware/rbac.js';
import { getAllDoctorWorkloads, getIntakeRecommendation } from '../modules/workload/workload.service.js';

export async function workloadRoutes(fastify: FastifyInstance) {
  // GET /workload/doctors — Load scores for all doctors
  fastify.get(
    '/workload/doctors',
    { preHandler: [requireStaff()] },
    async (request: FastifyRequest<{ Querystring: { department_id?: string } }>, reply: FastifyReply) => {
      const departmentId = request.query.department_id ? parseInt(request.query.department_id, 10) : undefined;
      const scores = await getAllDoctorWorkloads(departmentId);
      return reply.send(scores);
    }
  );

  // GET /workload/recommendations — Least-loaded compatible clinician suggestion
  fastify.get(
    '/workload/recommendations',
    { preHandler: [requireStaff()] },
    async (request: FastifyRequest<{ Querystring: { department_id: string; exclude_doctor_id?: string } }>, reply: FastifyReply) => {
      const departmentId = parseInt(request.query.department_id, 10);
      if (isNaN(departmentId)) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'department_id is required' } });
      }

      const excludeDoctorId = request.query.exclude_doctor_id ? parseInt(request.query.exclude_doctor_id, 10) : undefined;
      const rec = await getIntakeRecommendation(departmentId, excludeDoctorId);
      return reply.send(rec);
    }
  );
}
