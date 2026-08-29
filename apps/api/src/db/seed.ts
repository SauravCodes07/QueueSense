import bcrypt from 'bcryptjs';
import { QueueStatus, PriorityTier, UserRole, AvailabilityStatus } from '../types/index.js';
import { prisma } from './client.js';
import { recalculateQueueETAs } from '../modules/queue/queue.service.js';

export async function seedDatabase() {
  console.log('[SEED] Starting clean database seed...');

  // Clean existing data in reverse FK order
  await prisma.consultation.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.auditEvent.deleteMany();

  // 1. Create Departments
  const general = await prisma.department.create({
    data: { name: 'General Medicine', defaultConsultationMinutes: 12.0 },
  });
  const cardio = await prisma.department.create({
    data: { name: 'Cardiology', defaultConsultationMinutes: 15.0 },
  });
  const paeds = await prisma.department.create({
    data: { name: 'Pediatrics', defaultConsultationMinutes: 10.0 },
  });

  // 2. Create Doctors
  const doc1 = await prisma.doctor.create({
    data: {
      name: 'Dr. Priya Sharma',
      departmentId: general.id,
      emaMinutes: 12.5,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
    },
  });

  const doc2 = await prisma.doctor.create({
    data: {
      name: 'Dr. Raj Mehta',
      departmentId: cardio.id,
      emaMinutes: 11.8,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
    },
  });

  const doc3 = await prisma.doctor.create({
    data: {
      name: 'Dr. Anita Patel',
      departmentId: paeds.id,
      emaMinutes: 13.2,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
    },
  });

  // 3. Create Users
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const recHash = await bcrypt.hash('Reception@123', 10);
  const docHash = await bcrypt.hash('Doctor@123', 10);

  await prisma.user.create({
    data: { email: 'admin@queuesense.demo', name: 'Admin Staff', passwordHash: adminHash, role: UserRole.ADMIN },
  });

  await prisma.user.create({
    data: { email: 'reception@queuesense.demo', name: 'Reception Desk', passwordHash: recHash, role: UserRole.RECEPTION },
  });

  await prisma.user.create({
    data: { email: 'dr.sharma@queuesense.demo', name: 'Dr. Priya Sharma', passwordHash: docHash, role: UserRole.DOCTOR, doctorId: doc1.id },
  });

  await prisma.user.create({
    data: { email: 'dr.mehta@queuesense.demo', name: 'Dr. Raj Mehta', passwordHash: docHash, role: UserRole.DOCTOR, doctorId: doc2.id },
  });

  await prisma.user.create({
    data: { email: 'dr.patel@queuesense.demo', name: 'Dr. Anita Patel', passwordHash: docHash, role: UserRole.DOCTOR, doctorId: doc3.id },
  });

  // 4. Seed Patients and Active Queues
  // Dr. Sharma: A-1 (IN_PROGRESS), A-2..A-6 (WAITING)
  for (let i = 1; i <= 6; i++) {
    const token = `A-${i}`;
    const p = await prisma.patient.create({
      data: { name: `Patient ${token}`, token },
    });

    const isFirst = i === 1;
    const entry = await prisma.queueEntry.create({
      data: {
        patientId: p.id,
        doctorId: doc1.id,
        status: isFirst ? QueueStatus.IN_PROGRESS : QueueStatus.WAITING,
        priority: PriorityTier.ROUTINE,
        createdAt: new Date(Date.now() - (30 - i * 5) * 60 * 1000),
      },
    });

    if (isFirst) {
      await prisma.consultation.create({
        data: {
          queueEntryId: entry.id,
          startedAt: new Date(Date.now() - 4 * 60 * 1000),
        },
      });
    }
  }

  // Dr. Mehta: B-1..B-3 (WAITING)
  for (let i = 1; i <= 3; i++) {
    const token = `B-${i}`;
    const p = await prisma.patient.create({
      data: { name: `Patient ${token}`, token },
    });

    await prisma.queueEntry.create({
      data: {
        patientId: p.id,
        doctorId: doc2.id,
        status: QueueStatus.WAITING,
        priority: PriorityTier.ROUTINE,
        createdAt: new Date(Date.now() - (20 - i * 5) * 60 * 1000),
      },
    });
  }

  // Dr. Patel: C-1, C-2 (WAITING)
  for (let i = 1; i <= 2; i++) {
    const token = `C-${i}`;
    const p = await prisma.patient.create({
      data: { name: `Patient ${token}`, token },
    });

    await prisma.queueEntry.create({
      data: {
        patientId: p.id,
        doctorId: doc3.id,
        status: QueueStatus.WAITING,
        priority: PriorityTier.ROUTINE,
        createdAt: new Date(Date.now() - (15 - i * 5) * 60 * 1000),
      },
    });
  }

  // 5. Initial ETA recalculations for all doctors
  await recalculateQueueETAs(doc1.id, 'initial_seed');
  await recalculateQueueETAs(doc2.id, 'initial_seed');
  await recalculateQueueETAs(doc3.id, 'initial_seed');

  console.log('[SEED] Clean database seed completed successfully.');
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED] Failed:', err);
      process.exit(1);
    });
}
