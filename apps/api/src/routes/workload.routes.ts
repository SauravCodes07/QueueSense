import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAllDoctorWorkloads, getIntakeRecommendation } from '../modules/workload/workload.service.js';

export async function workloadRoutes(fastify: FastifyInstance) {
  // GET /workload/doctors — Load scores for all doctors
  fastify.get(
    '/workload/doctors',
    async (request: FastifyRequest<{ Querystring: { department_id?: string } }>, reply: FastifyReply) => {
      const departmentId = request.query.department_id ? parseInt(request.query.department_id, 10) : undefined;
      const scores = await getAllDoctorWorkloads(departmentId);
      return reply.send(scores);
    }
  );

  // Helper for recommendation
  const getRecommendationHandler = async (
    request: FastifyRequest<{ Querystring: { department_id: string; exclude_doctor_id?: string } }>,
    reply: FastifyReply
  ) => {
    const departmentId = parseInt(request.query.department_id, 10);
    if (isNaN(departmentId)) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'department_id is required' } });
    }

    const excludeDoctorId = request.query.exclude_doctor_id ? parseInt(request.query.exclude_doctor_id, 10) : undefined;
    const rec = await getIntakeRecommendation(departmentId, excludeDoctorId);
    return reply.send({ recommendation: rec });
  };

  // GET /workload/recommendations & GET /doctors/workload-recommendations
  fastify.get('/workload/recommendations', getRecommendationHandler);
  fastify.get('/doctors/workload-recommendations', getRecommendationHandler);
}
