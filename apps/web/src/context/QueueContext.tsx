import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QueueStatus, PriorityLevel } from '../types';

export interface AppPatient {
  id: number;
  token: string;
  name: string;
  phone: string;
  department: string;
  departmentId: number;
  doctorId: number;
  doctorName: string;
  doctorRoom: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW';
  position: number;
  checkInTime: string;
  createdAt: number;
  etaMinutes: number;
  expectedTime: string;
}

export interface DoctorMeta {
  id: number;
  name: string;
  department: string;
  departmentId: number;
  room: string;
  targetPace: number;
  availability: 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';
}

export interface DepartmentMatrixItem {
  id: string;
  name: string;
  rooms: string;
  activeDoctors: number;
  totalDoctors: number;
  patientsInQueue: number;
  avgWaitMinutes: number;
  efficiencyPercent: number;
  status: 'normal' | 'delay' | 'bottleneck';
  statusLabel: string;
}

interface QueueContextType {
  patients: AppPatient[];
  doctors: DoctorMeta[];
  registerPatient: (data: {
    name: string;
    phone?: string;
    department: string;
    doctorId: number;
    priority?: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  }) => Promise<AppPatient>;
  callPatient: (patientId: number) => void;
  completeAndCallNext: (doctorId: number) => void;
  markNoShow: (patientId: number) => void;
  setDoctorAvailability: (doctorId: number, status: DoctorMeta['availability']) => void;
  getDoctorQueue: (doctorId: number) => { inProgress: AppPatient | null; waiting: AppPatient[] };
  getPatientByToken: (token: string) => AppPatient | null;
  getDepartmentMatrix: () => DepartmentMatrixItem[];
  getOverviewMetrics: () => {
    totalVolume: number;
    activeCount: number;
    servedCount: number;
    activeDoctorsCount: number;
    totalDoctorsCount: number;
    avgWaitMinutes: number;
    efficiencyPercent: number;
    emergencyCasesCount: number;
    slotsReclaimedCount: number;
  };
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctors, setDoctors] = useState<DoctorMeta[]>([
    { id: 1, name: 'Dr. Priya Sharma', department: 'General Medicine', departmentId: 1, room: 'Room 101', targetPace: 12, availability: 'BUSY' },
    { id: 2, name: 'Dr. Raj Mehta', department: 'Cardiology', departmentId: 2, room: 'Room 301', targetPace: 15, availability: 'BUSY' },
    { id: 3, name: 'Dr. Anita Patel', department: 'Pediatrics', departmentId: 3, room: 'Room 201', targetPace: 10, availability: 'AVAILABLE' },
    { id: 4, name: 'Dr. Vikram Seth', department: 'Orthopedics', departmentId: 4, room: 'Room 401', targetPace: 14, availability: 'AVAILABLE' },
    { id: 5, name: 'Dr. Tanya Kapoor', department: 'Dermatology', departmentId: 5, room: 'Room 501', targetPace: 10, availability: 'AVAILABLE' },
  ]);

  const [patients, setPatients] = useState<AppPatient[]>([
    {
      id: 1,
      token: 'GM-101',
      name: 'Pooja Iyer',
      phone: '+91 98201 12345',
      department: 'General Medicine',
      departmentId: 1,
      doctorId: 1,
      doctorName: 'Dr. Priya Sharma',
      doctorRoom: 'Room 101',
      priority: 'ROUTINE',
      status: 'IN_PROGRESS',
      position: 0,
      checkInTime: '09:15 AM',
      createdAt: Date.now() - 3600000,
      etaMinutes: 0,
      expectedTime: '09:15 AM',
    },
    {
      id: 2,
      token: 'GM-102',
      name: 'Ramesh Kulkarni',
      phone: '+91 98202 23456',
      department: 'General Medicine',
      departmentId: 1,
      doctorId: 1,
      doctorName: 'Dr. Priya Sharma',
      doctorRoom: 'Room 101',
      priority: 'ROUTINE',
      status: 'WAITING',
      position: 1,
      checkInTime: '09:30 AM',
      createdAt: Date.now() - 2700000,
      etaMinutes: 12,
      expectedTime: '10:00 AM',
    },
    {
      id: 3,
      token: 'GM-103',
      name: 'Sunita Rao',
      phone: '+91 98203 34567',
      department: 'General Medicine',
      departmentId: 1,
      doctorId: 1,
      doctorName: 'Dr. Priya Sharma',
      doctorRoom: 'Room 101',
      priority: 'URGENT',
      status: 'WAITING',
      position: 2,
      checkInTime: '09:45 AM',
      createdAt: Date.now() - 1800000,
      etaMinutes: 24,
      expectedTime: '10:15 AM',
    },
    {
      id: 4,
      token: 'GM-104',
      name: 'Sneha Patil',
      phone: '+91 98204 45678',
      department: 'General Medicine',
      departmentId: 1,
      doctorId: 1,
      doctorName: 'Dr. Priya Sharma',
      doctorRoom: 'Room 101',
      priority: 'ROUTINE',
      status: 'WAITING',
      position: 3,
      checkInTime: '09:54 AM',
      createdAt: Date.now() - 900000,
      etaMinutes: 36,
      expectedTime: '10:52 AM',
    },
    {
      id: 5,
      token: 'CD-301',
      name: 'Rohan Gupta',
      phone: '+91 98205 56789',
      department: 'Cardiology',
      departmentId: 2,
      doctorId: 2,
      doctorName: 'Dr. Raj Mehta',
      doctorRoom: 'Room 301',
      priority: 'EMERGENCY',
      status: 'IN_PROGRESS',
      position: 0,
      checkInTime: '09:20 AM',
      createdAt: Date.now() - 3000000,
      etaMinutes: 0,
      expectedTime: '09:20 AM',
    },
    {
      id: 6,
      token: 'CD-302',
      name: 'Alok Nath',
      phone: '+91 98206 67890',
      department: 'Cardiology',
      departmentId: 2,
      doctorId: 2,
      doctorName: 'Dr. Raj Mehta',
      doctorRoom: 'Room 301',
      priority: 'ROUTINE',
      status: 'WAITING',
      position: 1,
      checkInTime: '09:40 AM',
      createdAt: Date.now() - 1200000,
      etaMinutes: 15,
      expectedTime: '10:20 AM',
    },
    {
      id: 7,
      token: 'PD-201',
      name: 'Aarav Verma',
      phone: '+91 98207 78901',
      department: 'Pediatrics',
      departmentId: 3,
      doctorId: 3,
      doctorName: 'Dr. Anita Patel',
      doctorRoom: 'Room 201',
      priority: 'ROUTINE',
      status: 'WAITING',
      position: 1,
      checkInTime: '10:00 AM',
      createdAt: Date.now() - 600000,
      etaMinutes: 10,
      expectedTime: '10:30 AM',
    },
    {
      id: 8,
      token: 'OR-401',
      name: 'Meera Deshmukh',
      phone: '+91 98208 89012',
      department: 'Orthopedics',
      departmentId: 4,
      doctorId: 4,
      doctorName: 'Dr. Vikram Seth',
      doctorRoom: 'Room 401',
      priority: 'ROUTINE',
      status: 'WAITING',
      position: 1,
      checkInTime: '10:10 AM',
      createdAt: Date.now() - 300000,
      etaMinutes: 14,
      expectedTime: '10:45 AM',
    },
    {
      id: 9,
      token: 'DM-501',
      name: 'Kavita Nair',
      phone: '+91 98209 90123',
      department: 'Dermatology',
      departmentId: 5,
      doctorId: 5,
      doctorName: 'Dr. Tanya Kapoor',
      doctorRoom: 'Room 501',
      priority: 'ROUTINE',
      status: 'WAITING',
      position: 1,
      checkInTime: '10:15 AM',
      createdAt: Date.now() - 100000,
      etaMinutes: 10,
      expectedTime: '10:40 AM',
    },
  ]);

  // Helper to re-calculate queue ordering and ETAs for all doctors
  const recalculateAllQueues = (currentPatients: AppPatient[], currentDoctors: DoctorMeta[]): AppPatient[] => {
    const priorityWeight = { EMERGENCY: 1, URGENT: 2, ROUTINE: 3 };

    return currentPatients.map((patient) => {
      if (patient.status !== 'WAITING') {
        return {
          ...patient,
          position: patient.status === 'IN_PROGRESS' ? 0 : -1,
          etaMinutes: 0,
        };
      }

      // Find all waiting patients for this same doctor
      const sameDoctorWaiting = currentPatients
        .filter((p) => p.doctorId === patient.doctorId && p.status === 'WAITING')
        .sort((a, b) => {
          // 1. Acuity priority
          const pDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
          if (pDiff !== 0) return pDiff;
          // 2. Earliest checkIn/created
          return a.createdAt - b.createdAt;
        });

      const idx = sameDoctorWaiting.findIndex((p) => p.id === patient.id);
      const position = idx + 1;
      const doc = currentDoctors.find((d) => d.id === patient.doctorId);
      const pace = doc ? doc.targetPace : 12;
      const etaMinutes = position * pace;

      return {
        ...patient,
        position,
        etaMinutes,
      };
    });
  };

  // Register patient
  const registerPatient = async (data: {
    name: string;
    phone?: string;
    department: string;
    doctorId: number;
    priority?: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  }): Promise<AppPatient> => {
    const doc = doctors.find((d) => d.id === data.doctorId) || doctors[0];
    const prefix =
      doc.department === 'General Medicine' ? 'GM' :
      doc.department === 'Cardiology' ? 'CD' :
      doc.department === 'Pediatrics' ? 'PD' :
      doc.department === 'Orthopedics' ? 'OR' : 'DM';

    const num = Math.floor(100 + Math.random() * 900);
    const token = `${prefix}-${num}`;
    const priority = data.priority || 'ROUTINE';

    let backendId = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/v1/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          contact: data.phone,
          doctor_id: doc.id,
          priority,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.id) backendId = json.id;
      }
    } catch {
      // Offline fallback
    }

    const newPatient: AppPatient = {
      id: backendId,
      token,
      name: data.name,
      phone: data.phone || '+91 98000 00000',
      department: doc.department,
      departmentId: doc.departmentId,
      doctorId: doc.id,
      doctorName: doc.name,
      doctorRoom: doc.room,
      priority,
      status: 'WAITING',
      position: 1,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      etaMinutes: 12,
      expectedTime: new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setPatients((prev) => recalculateAllQueues([...prev, newPatient], doctors));
    return newPatient;
  };

  // CALL button: move patient into consultation for their assigned doctor
  const callPatient = (patientId: number) => {
    setPatients((prev) => {
      const target = prev.find((p) => p.id === patientId);
      if (!target) return prev;

      try {
        fetch(`${API_BASE}/api/v1/consultations/${patientId}/start`, { method: 'POST' }).catch(() => {});
      } catch {}

      // Any currently in-progress patient for this same doctor is marked completed
      const updated = prev.map((p) => {
        if (p.doctorId === target.doctorId && p.status === 'IN_PROGRESS') {
          return { ...p, status: 'COMPLETED' as const, position: -1, etaMinutes: 0 };
        }
        if (p.id === patientId) {
          return { ...p, status: 'IN_PROGRESS' as const, position: 0, etaMinutes: 0 };
        }
        return p;
      });

      return recalculateAllQueues(updated, doctors);
    });
  };

  // COMPLETE & CALL NEXT button
  const completeAndCallNext = (doctorId: number) => {
    setPatients((prev) => {
      const priorityWeight = { EMERGENCY: 1, URGENT: 2, ROUTINE: 3 };

      // Find doctor's waiting queue ordered deterministically
      const waitingList = prev
        .filter((p) => p.doctorId === doctorId && p.status === 'WAITING')
        .sort((a, b) => {
          const pDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
          if (pDiff !== 0) return pDiff;
          return a.createdAt - b.createdAt;
        });

      const nextPatient = waitingList.length > 0 ? waitingList[0] : null;

      const updated = prev.map((p) => {
        if (p.doctorId === doctorId && p.status === 'IN_PROGRESS') {
          return { ...p, status: 'COMPLETED' as const, position: -1, etaMinutes: 0 };
        }
        if (nextPatient && p.id === nextPatient.id) {
          return { ...p, status: 'IN_PROGRESS' as const, position: 0, etaMinutes: 0 };
        }
        return p;
      });

      return recalculateAllQueues(updated, doctors);
    });
  };

  // NO-SHOW button
  const markNoShow = (patientId: number) => {
    setPatients((prev) => {
      try {
        fetch(`${API_BASE}/api/v1/queue/${patientId}/no-show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Patient absent' }),
        }).catch(() => {});
      } catch {}

      const updated = prev.map((p) => {
        if (p.id === patientId) {
          return { ...p, status: 'NO_SHOW' as const, position: -1, etaMinutes: 0 };
        }
        return p;
      });

      return recalculateAllQueues(updated, doctors);
    });
  };

  // Update doctor availability
  const setDoctorAvailability = (doctorId: number, status: DoctorMeta['availability']) => {
    setDoctors((prev) => prev.map((d) => (d.id === doctorId ? { ...d, availability: status } : d)));
  };

  // Get specific doctor's queue (ONLY for that doctor!)
  const getDoctorQueue = useCallback(
    (doctorId: number) => {
      const priorityWeight = { EMERGENCY: 1, URGENT: 2, ROUTINE: 3 };

      const inProgress = patients.find((p) => p.doctorId === doctorId && p.status === 'IN_PROGRESS') || null;
      const waiting = patients
        .filter((p) => p.doctorId === doctorId && p.status === 'WAITING')
        .sort((a, b) => {
          const pDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
          if (pDiff !== 0) return pDiff;
          return a.createdAt - b.createdAt;
        });

      return { inProgress, waiting };
    },
    [patients]
  );

  // Get patient by token
  const getPatientByToken = useCallback(
    (token: string) => {
      return patients.find((p) => p.token.toLowerCase() === token.toLowerCase()) || null;
    },
    [patients]
  );

  // Department Performance Matrix for Admin Overview
  const getDepartmentMatrix = useCallback((): DepartmentMatrixItem[] => {
    const depts = [
      { id: 'gm', name: 'General Medicine', rooms: 'Room 101, Room 102' },
      { id: 'pd', name: 'Pediatrics', rooms: 'Room 201' },
      { id: 'cd', name: 'Cardiology', rooms: 'Room 301' },
      { id: 'or', name: 'Orthopedics', rooms: 'Room 401' },
      { id: 'dm', name: 'Dermatology', rooms: 'Room 501' },
    ];

    return depts.map((d) => {
      const deptDocs = doctors.filter((doc) => doc.department === d.name);
      const activeDocs = deptDocs.filter((doc) => doc.availability === 'AVAILABLE' || doc.availability === 'BUSY');
      const deptPatients = patients.filter((p) => p.department === d.name && p.status === 'WAITING');
      const avgWait =
        deptPatients.length > 0
          ? Math.round(deptPatients.reduce((acc, p) => acc + p.etaMinutes, 0) / deptPatients.length)
          : 12;

      let status: 'normal' | 'delay' | 'bottleneck' = 'normal';
      let statusLabel = 'Normal Flow';
      let efficiencyPercent = 88;

      if (avgWait > 35) {
        status = 'bottleneck';
        statusLabel = 'Bottleneck';
        efficiencyPercent = 65;
      } else if (avgWait > 25) {
        status = 'delay';
        statusLabel = 'Schedule Delay';
        efficiencyPercent = 75;
      }

      return {
        id: d.id,
        name: d.name,
        rooms: d.rooms,
        activeDoctors: Math.max(1, activeDocs.length),
        totalDoctors: Math.max(1, deptDocs.length),
        patientsInQueue: deptPatients.length,
        avgWaitMinutes: avgWait,
        efficiencyPercent,
        status,
        statusLabel,
      };
    });
  }, [doctors, patients]);

  // Executive Overview Metrics
  const getOverviewMetrics = useCallback(() => {
    const waitingPatients = patients.filter((p) => p.status === 'WAITING');
    const servedPatients = patients.filter((p) => p.status === 'COMPLETED');
    const inProgressPatients = patients.filter((p) => p.status === 'IN_PROGRESS');
    const emergencyPatients = patients.filter((p) => p.priority === 'EMERGENCY' && p.status !== 'COMPLETED');
    const noShowPatients = patients.filter((p) => p.status === 'NO_SHOW');

    const totalActive = waitingPatients.length + inProgressPatients.length;
    const avgWait =
      waitingPatients.length > 0
        ? Math.round(waitingPatients.reduce((acc, p) => acc + p.etaMinutes, 0) / waitingPatients.length)
        : 24;

    const activeDocs = doctors.filter((d) => d.availability === 'AVAILABLE' || d.availability === 'BUSY').length;

    return {
      totalVolume: patients.length + 30,
      activeCount: totalActive,
      servedCount: servedPatients.length + 30,
      activeDoctorsCount: activeDocs,
      totalDoctorsCount: doctors.length,
      avgWaitMinutes: avgWait,
      efficiencyPercent: 86,
      emergencyCasesCount: emergencyPatients.length,
      slotsReclaimedCount: noShowPatients.length + 1,
    };
  }, [patients, doctors]);

  return (
    <QueueContext.Provider
      value={{
        patients,
        doctors,
        registerPatient,
        callPatient,
        completeAndCallNext,
        markNoShow,
        setDoctorAvailability,
        getDoctorQueue,
        getPatientByToken,
        getDepartmentMatrix,
        getOverviewMetrics,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueue must be used within a QueueProvider');
  return context;
};
