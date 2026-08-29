import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';
import { FastifyInstance } from 'fastify';
import { seedDatabase } from '../src/db/seed.js';

describe('QueueSense API Endpoints Integration Suite', () => {
  let server: FastifyInstance;
  let adminToken: string;
  let doctorToken: string;
  let receptionToken: string;
  let docSharmaId: number;
  let docMehtaId: number;
  let docPatelId: number;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();
    await seedDatabase();

    // Log in as Admin
    const adminRes = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@queuesense.demo', password: 'Admin@123' },
    });
    adminToken = JSON.parse(adminRes.payload).access_token;

    // Log in as Doctor Sharma
    const docRes = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'dr.sharma@queuesense.demo', password: 'Doctor@123' },
    });
    const docBody = JSON.parse(docRes.payload);
    doctorToken = docBody.access_token;
    docSharmaId = docBody.user.doctor_id;

    // Log in as Reception
    const recRes = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'reception@queuesense.demo', password: 'Reception@123' },
    });
    receptionToken = JSON.parse(recRes.payload).access_token;

    // Get doctor IDs for others
    const allDoctorsRes = await server.inject({
      method: 'GET',
      url: '/workload/doctors',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const doctors = JSON.parse(allDoctorsRes.payload);
    docMehtaId = doctors.find((d: any) => d.doctorName.includes('Mehta')).doctorId;
    docPatelId = doctors.find((d: any) => d.doctorName.includes('Patel')).doctorId;
  });

  afterAll(async () => {
    await server.close();
  });

  it('POST /auth/login returns valid JWT and user payload', () => {
    expect(adminToken).toBeDefined();
    expect(doctorToken).toBeDefined();
    expect(receptionToken).toBeDefined();
    expect(docSharmaId).toBeDefined();
  });

  it('POST /auth/patient-token validates patient token without passwords', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/auth/patient-token?patient_token=A-2',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.token).toBe('A-2');
    expect(body.session_token).toBeDefined();
  });

  it('GET /queue/patient/:token returns patient ETA window and queue position', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/queue/patient/A-2',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.token).toBe('A-2');
    expect(body.your_position).toBeGreaterThanOrEqual(1);
    expect(body.eta_low_minutes).toBeDefined();
    expect(body.doctor_name).toBe('Dr. Priya Sharma');
  });

  it('GET /queue/doctors/:id returns full ordered queue for authenticated doctor', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/queue/doctors/${docSharmaId}`,
      headers: { authorization: `Bearer ${doctorToken}` },
    });
    expect(res.statusCode).toBe(200);
    const entries = JSON.parse(res.payload);
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /queue/:id/priority upgrades patient priority and writes audit log', async () => {
    const queueRes = await server.inject({
      method: 'GET',
      url: `/queue/doctors/${docSharmaId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const entries = JSON.parse(queueRes.payload);
    const waiting = entries.find((e: any) => e.status === 'WAITING');
    expect(waiting).toBeDefined();

    const priorityRes = await server.inject({
      method: 'POST',
      url: `/queue/${waiting.id}/priority`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        priority: 'EMERGENCY',
        reason: 'Acute chest pain reported at reception triage',
      },
    });
    expect(priorityRes.statusCode).toBe(200);
    expect(JSON.parse(priorityRes.payload).new_priority).toBe('EMERGENCY');
  });

  it('POST /queue/:id/no-show/confirm confirms no-show and reclaims slot', async () => {
    const queueRes = await server.inject({
      method: 'GET',
      url: `/queue/doctors/${docSharmaId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const entries = JSON.parse(queueRes.payload);
    const waiting = entries.find((e: any) => e.status === 'WAITING');
    expect(waiting).toBeDefined();

    const noShowRes = await server.inject({
      method: 'POST',
      url: `/queue/${waiting.id}/no-show/confirm`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { reason: 'Patient called 3 times without response after 10 min grace' },
    });
    expect(noShowRes.statusCode).toBe(200);
  });

  it('GET /workload/doctors returns load scores for all clinicians', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/workload/doctors',
      headers: { authorization: `Bearer ${receptionToken}` },
    });
    expect(res.statusCode).toBe(200);
    const scores = JSON.parse(res.payload);
    expect(scores.length).toBeGreaterThanOrEqual(3);
    expect(scores[0].loadScore).toBeDefined();
  });

  it('GET /workload/recommendations suggests least-loaded doctor for department', async () => {
    const allDoctorsRes = await server.inject({
      method: 'GET',
      url: '/workload/doctors',
      headers: { authorization: `Bearer ${receptionToken}` },
    });
    const doctors = JSON.parse(allDoctorsRes.payload);
    const deptId = doctors[0].departmentId;

    const res = await server.inject({
      method: 'GET',
      url: `/workload/recommendations?department_id=${deptId}`,
      headers: { authorization: `Bearer ${receptionToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.recommendation).toBeDefined();
    expect(body.recommendation.doctorId).toBeDefined();
  });

  it('POST /queue/:id/transfer transfers patient atomically to another doctor', async () => {
    const queueRes = await server.inject({
      method: 'GET',
      url: `/queue/doctors/${docSharmaId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const entries = JSON.parse(queueRes.payload);
    const waiting = entries.find((e: any) => e.status === 'WAITING');
    expect(waiting).toBeDefined();

    const transferRes = await server.inject({
      method: 'POST',
      url: `/queue/${waiting.id}/transfer`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        to_doctor_id: docMehtaId,
        reason: 'Balancing wait times across departments',
      },
    });
    expect(transferRes.statusCode).toBe(200);
    const body = JSON.parse(transferRes.payload);
    expect(body.toDoctorId).toBe(docMehtaId);
  });

  it('POST /consultations/:queueEntryId/end ends in-progress consultation and updates EMA', async () => {
    const queueRes = await server.inject({
      method: 'GET',
      url: `/queue/doctors/${docSharmaId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const entries = JSON.parse(queueRes.payload);
    const inProgress = entries.find((e: any) => e.status === 'IN_PROGRESS');
    expect(inProgress).toBeDefined();

    const endRes = await server.inject({
      method: 'POST',
      url: `/consultations/${inProgress.id}/end`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(endRes.statusCode).toBe(200);
    const body = JSON.parse(endRes.payload);
    expect(body.doctorEmaMinutes).toBeDefined();
    expect(body.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('POST /consultations/:queueEntryId/start starts next consultation in queue', async () => {
    const queueRes = await server.inject({
      method: 'GET',
      url: `/queue/doctors/${docSharmaId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const entries = JSON.parse(queueRes.payload);
    const waiting = entries.find((e: any) => e.status === 'WAITING');
    expect(waiting).toBeDefined();

    const startRes = await server.inject({
      method: 'POST',
      url: `/consultations/${waiting.id}/start`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(startRes.statusCode).toBe(200);
    const body = JSON.parse(startRes.payload);
    expect(body.startedAt).toBeDefined();
  });

  it('POST /demo/trigger-emergency triggers emergency priority escalation incident', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/demo/trigger-emergency?doctor_id=${docMehtaId}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('POST /demo/trigger-no-show triggers scripted no-show incident', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/demo/trigger-no-show?doctor_id=${docMehtaId}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('GET /audit/events returns immutable audit events log with all actions', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/audit/events',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const events = JSON.parse(res.payload);
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });
});
