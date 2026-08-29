import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface AppPatient {
  id: string | number;
  dbId?: string;
  patientId?: string | number;
  appointmentId?: string | number;
  token: string;
  name: string;
  phone: string;
  department: string;
  departmentId?: string | number;
  doctorId: number;
  doctorDbId?: string;
  doctorName: string;
  doctorRoom: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW';
  position: number;
  checkInTime: string;
  createdAt: number;
  etaMinutes: number;
  expectedTime: string;
  completedAt?: string;
  consultationStartedAt?: number;
}

export interface DoctorMeta {
  id: number;
  dbId?: string;
  name: string;
  department: string;
  departmentId?: number;
  departmentDbId?: string;
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
  loading: boolean;
  registerPatient: (data: {
    name: string;
    phone?: string;
    department: string;
    doctorId: number;
    priority?: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  }) => Promise<AppPatient>;
  callPatient: (patientId: string | number, doctorId?: number) => Promise<void>;
  completeAndCallNext: (doctorId: number) => Promise<void>;
  markNoShow: (patientId: string | number) => Promise<void>;
  setDoctorAvailability: (doctorId: number, status: DoctorMeta['availability']) => Promise<void>;
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
  refreshData: () => Promise<void>;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

// Baseline doctors roster metadata
const DEFAULT_DOCTORS: DoctorMeta[] = [
  { id: 1, name: 'Dr. Priya Sharma', department: 'General Medicine', departmentId: 1, room: 'Room 101', targetPace: 12, availability: 'AVAILABLE' },
  { id: 2, name: 'Dr. Raj Mehta', department: 'Cardiology', departmentId: 2, room: 'Room 301', targetPace: 15, availability: 'AVAILABLE' },
  { id: 3, name: 'Dr. Anita Patel', department: 'Pediatrics', departmentId: 3, room: 'Room 201', targetPace: 10, availability: 'AVAILABLE' },
  { id: 4, name: 'Dr. Vikram Seth', department: 'Orthopedics', departmentId: 4, room: 'Room 401', targetPace: 14, availability: 'AVAILABLE' },
  { id: 5, name: 'Dr. Tanya Kapoor', department: 'Dermatology', departmentId: 5, room: 'Room 501', targetPace: 10, availability: 'AVAILABLE' },
];

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctors, setDoctors] = useState<DoctorMeta[]>(DEFAULT_DOCTORS);
  const [patients, setPatients] = useState<AppPatient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isFetchingRef = useRef(false);
  const channelRef = useRef<any>(null);
  const patientsRef = useRef<AppPatient[]>([]);
  patientsRef.current = patients;

  // Helper to re-calculate queue ordering and ETAs deterministically: EMERGENCY -> URGENT -> ROUTINE
  const recalculateAllQueues = useCallback((currentPatients: AppPatient[], currentDoctors: DoctorMeta[]): AppPatient[] => {
    const priorityWeight: Record<string, number> = { EMERGENCY: 1, URGENT: 2, ROUTINE: 3 };

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
          const pDiff = (priorityWeight[a.priority] || 3) - (priorityWeight[b.priority] || 3);
          if (pDiff !== 0) return pDiff;
          return a.createdAt - b.createdAt;
        });

      const idx = sameDoctorWaiting.findIndex((p) => p.id === patient.id || (p.dbId && p.dbId === patient.dbId));
      const position = idx >= 0 ? idx + 1 : 1;
      const doc = currentDoctors.find((d) => d.id === patient.doctorId);
      const pace = doc ? doc.targetPace : 12;
      const etaMinutes = position * pace;

      return {
        ...patient,
        position,
        etaMinutes,
      };
    });
  }, []);

  // Primary Data Fetch: Direct from Supabase PostgreSQL Database
  const fetchAllData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      // 1. Fetch doctors from Supabase
      const { data: doctorsData } = await supabase.from('doctors').select('*');

      let activeDocs = DEFAULT_DOCTORS;
      if (doctorsData && doctorsData.length > 0) {
        activeDocs = doctorsData.map((d: any, idx: number) => {
          const matchedDefault = DEFAULT_DOCTORS.find((def) => def.name.toLowerCase() === (d.name || '').toLowerCase()) || DEFAULT_DOCTORS[idx % DEFAULT_DOCTORS.length];
          const rawStatus = (d.status || d.availability_status || 'available').toUpperCase();
          const availability =
            rawStatus === 'AVAILABLE' || rawStatus === 'BUSY' || rawStatus === 'ON_BREAK' || rawStatus === 'OFFLINE'
              ? rawStatus as DoctorMeta['availability']
              : 'AVAILABLE';

          return {
            id: matchedDefault.id,
            dbId: d.id,
            name: d.name || matchedDefault.name,
            department: d.specialty || d.department || matchedDefault.department,
            departmentId: matchedDefault.departmentId,
            departmentDbId: d.department_id,
            room: d.room_number ? `Room ${d.room_number}` : matchedDefault.room,
            targetPace: d.target_pace || matchedDefault.targetPace,
            availability,
          };
        });
        setDoctors(activeDocs);
      }

      // 2. Fetch appointments and patients from Supabase
      const [appRes, patRes] = await Promise.all([
        supabase.from('appointments').select('*').order('created_at', { ascending: true }),
        supabase.from('patients').select('*').order('created_at', { ascending: true }),
      ]);

      const appointmentsData = appRes.data || [];
      const patientsData = patRes.data || [];

      let mappedPatients: AppPatient[] = [];

      if (appointmentsData.length > 0) {
        const matchedPatientIds = new Set<string>();

        mappedPatients = appointmentsData.map((row: any) => {
          const matchedPatient = patientsData.find((p: any) =>
            (p.id && row.patient_id && String(p.id).toLowerCase() === String(row.patient_id).toLowerCase()) ||
            (p.token && row.token && String(p.token).toLowerCase() === String(row.token).toLowerCase())
          );

          if (matchedPatient?.id) {
            matchedPatientIds.add(String(matchedPatient.id).toLowerCase());
          }

          const doc =
            activeDocs.find((d) => d.dbId && row.doctor_id && String(d.dbId).toLowerCase() === String(row.doctor_id).toLowerCase()) ||
            activeDocs.find((d) => String(d.id) === String(row.doctor_id)) ||
            activeDocs[0];

          const rawStatus = (row.status || 'waiting').toLowerCase();
          const status =
            rawStatus === 'in_consultation' || rawStatus === 'in_progress' ? 'IN_PROGRESS' :
            rawStatus === 'completed' ? 'COMPLETED' :
            rawStatus === 'no_show' ? 'NO_SHOW' : 'WAITING';

          const rawPriority = (row.priority || matchedPatient?.priority || 'routine').toUpperCase();
          const priority = rawPriority === 'EMERGENCY' || rawPriority === 'URGENT' ? rawPriority : 'ROUTINE';

          const patientName = matchedPatient?.name || row.patient_name || row.name || (row.token ? `Patient ${row.token}` : `Patient ${String(row.id).slice(0, 4)}`);
          const patientPhone = matchedPatient?.phone || row.contact || row.phone || '+91 98000 00000';

          // Preserve active consultation start time from existing memory or localStorage
          let consultationStartedAt: number | undefined;
          if (status === 'IN_PROGRESS') {
            const existingPatient = patientsRef.current.find(
              (p) => String(p.id) === String(row.id) || String(p.dbId) === String(row.id) || (p.token && p.token === row.token)
            );
            if (existingPatient?.consultationStartedAt) {
              consultationStartedAt = existingPatient.consultationStartedAt;
            } else if (row.called_at) {
              consultationStartedAt = new Date(row.called_at).getTime();
            } else {
              try {
                const saved = localStorage.getItem(`queuesense_doc_${doc.id}_active_consultation`);
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (parsed && (String(parsed.patientId) === String(row.id) || parsed.token === row.token)) {
                    consultationStartedAt = parsed.startedAt;
                  }
                }
              } catch {}
            }
            if (!consultationStartedAt) consultationStartedAt = Date.now();
          }

          return {
            id: row.id,
            dbId: row.id,
            patientId: row.patient_id || matchedPatient?.id,
            appointmentId: row.id,
            token: row.token || matchedPatient?.token || `P-${String(row.id).slice(0, 4)}`,
            name: patientName,
            phone: patientPhone,
            department: doc.department,
            departmentId: doc.departmentId,
            doctorId: doc.id,
            doctorDbId: doc.dbId,
            doctorName: doc.name,
            doctorRoom: doc.room,
            priority,
            status,
            position: row.queue_position || 1,
            checkInTime: row.arrival_time ? new Date(row.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'),
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            etaMinutes: row.estimated_wait || 12,
            expectedTime: new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            completedAt: row.completed_at ? new Date(row.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            consultationStartedAt,
          };
        });

        // Add any standalone patients not yet linked to appointments
        patientsData.forEach((p: any, idx: number) => {
          if (!matchedPatientIds.has(String(p.id).toLowerCase())) {
            const doc = activeDocs[0];
            const rawPriority = (p.priority || 'routine').toUpperCase();
            mappedPatients.push({
              id: p.id,
              dbId: p.id,
              patientId: p.id,
              appointmentId: p.id,
              token: p.token || `P-${String(p.id).slice(0, 4)}`,
              name: p.name || `Patient ${p.token}`,
              phone: p.phone || '+91 98000 00000',
              department: doc.department,
              departmentId: doc.departmentId,
              doctorId: doc.id,
              doctorDbId: doc.dbId,
              doctorName: doc.name,
              doctorRoom: doc.room,
              priority: rawPriority === 'EMERGENCY' || rawPriority === 'URGENT' ? rawPriority : 'ROUTINE',
              status: 'WAITING',
              position: idx + 1,
              checkInTime: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
              createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
              etaMinutes: (idx + 1) * 12,
              expectedTime: new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
          }
        });
      } else if (patientsData.length > 0) {
        mappedPatients = patientsData.map((p: any, idx: number) => {
          const doc = activeDocs[0];
          const rawPriority = (p.priority || 'routine').toUpperCase();
          return {
            id: p.id,
            dbId: p.id,
            patientId: p.id,
            appointmentId: p.id,
            token: p.token || `P-${String(p.id).slice(0, 4)}`,
            name: p.name || `Patient ${p.token}`,
            phone: p.phone || '+91 98000 00000',
            department: doc.department,
            departmentId: doc.departmentId,
            doctorId: doc.id,
            doctorDbId: doc.dbId,
            doctorName: doc.name,
            doctorRoom: doc.room,
            priority: rawPriority === 'EMERGENCY' || rawPriority === 'URGENT' ? rawPriority : 'ROUTINE',
            status: 'WAITING',
            position: idx + 1,
            checkInTime: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
            createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
            etaMinutes: (idx + 1) * 12,
            expectedTime: new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        });
      }

      setPatients(recalculateAllQueues(mappedPatients, activeDocs));
    } catch (err) {
      console.warn('Supabase data synchronization error:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [recalculateAllQueues]);

  // Realtime Supabase Channel Subscriptions + Heartbeat for multi-device live sync
  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel('queuesense-global-sync', {
        config: { broadcast: { self: true } },
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchAllData();
      })
      .on('broadcast', { event: 'queue_update' }, () => {
        fetchAllData();
      })
      .subscribe();

    channelRef.current = channel;

    const interval = setInterval(() => {
      fetchAllData();
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  // Broadcast event helper to immediately notify all other devices
  const broadcastChange = useCallback((action: string) => {
    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'queue_update',
        payload: { action, timestamp: Date.now() },
      });
    } catch {}
  }, []);

  // Register Walk-In Patient in Supabase PostgreSQL
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
    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let patientDbId: string | null = null;
    let appointmentDbId: string | null = null;

    try {
      const { data: pInsert, error: pError } = await supabase
        .from('patients')
        .insert({
          name: data.name.trim(),
          token,
          phone: data.phone?.trim() || '+91 98000 00000',
          priority: priority.toLowerCase(),
          emergency: priority === 'EMERGENCY',
        })
        .select()
        .single();

      if (!pError && pInsert?.id) {
        patientDbId = pInsert.id;
      }
    } catch (pEx) {
      console.error('Supabase patients insert exception:', pEx);
    }

    try {
      if (patientDbId && doc.dbId) {
        const { data: aInsert, error: aError } = await supabase
          .from('appointments')
          .insert({
            patient_id: patientDbId,
            doctor_id: doc.dbId,
            department_id: doc.departmentDbId || undefined,
            token,
            appointment_date: new Date().toISOString().split('T')[0],
            status: 'waiting',
            priority: priority.toLowerCase(),
          })
          .select()
          .single();

        if (!aError && aInsert?.id) {
          appointmentDbId = aInsert.id;
        }
      }
    } catch (aEx) {
      console.error('Supabase appointments insert exception:', aEx);
    }

    try {
      await supabase.from('notifications').insert({
        title: 'Patient Registered',
        message: `Token ${token} assigned to ${data.name} for ${doc.name} (${doc.department})`,
        type: 'success',
      });
    } catch {}

    fetch(`${API_BASE}/api/v1/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name.trim(),
        contact: data.phone?.trim() || '+91 98000 00000',
        doctor_id: doc.id,
        department_id: doc.departmentId,
        priority,
      }),
    }).catch(() => {});

    broadcastChange('patient_registered');

    const newPatient: AppPatient = {
      id: appointmentDbId || patientDbId || Date.now(),
      dbId: appointmentDbId || undefined,
      patientId: patientDbId || Date.now(),
      appointmentId: appointmentDbId || Date.now(),
      token,
      name: data.name,
      phone: data.phone || '+91 98000 00000',
      department: doc.department,
      departmentId: doc.departmentId,
      doctorId: doc.id,
      doctorDbId: doc.dbId,
      doctorName: doc.name,
      doctorRoom: doc.room,
      priority,
      status: 'WAITING',
      position: 1,
      checkInTime,
      createdAt: Date.now(),
      etaMinutes: 12,
      expectedTime: new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setPatients((prev) => recalculateAllQueues([...prev, newPatient], doctors));
    return newPatient;
  };

  // CALL button: move ANY patient (Routine, Urgent, Emergency) into consultation for a doctor
  const callPatient = async (patientId: string | number, doctorId?: number) => {
    const target = patients.find(
      (p) =>
        String(p.id) === String(patientId) ||
        String(p.appointmentId) === String(patientId) ||
        String(p.dbId) === String(patientId) ||
        String(p.token).toLowerCase() === String(patientId).toLowerCase()
    );
    if (!target) return;

    const targetDoctorId = doctorId || target.doctorId;
    const doc = doctors.find((d) => d.id === targetDoctorId) || doctors[0];
    const nowTimestamp = Date.now();

    // Persist consultation start in localStorage so it stays active across page navigation & refresh
    try {
      localStorage.setItem(
        `queuesense_doc_${targetDoctorId}_active_consultation`,
        JSON.stringify({
          patientId: target.id,
          token: target.token,
          startedAt: nowTimestamp,
        })
      );
    } catch {}

    // Complete previous active in-progress patient for this doctor
    const prevInProgress = patients.find((p) => p.doctorId === targetDoctorId && p.status === 'IN_PROGRESS');
    if (prevInProgress && prevInProgress.dbId) {
      supabase
        .from('appointments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', prevInProgress.dbId)
        .then(() => {});
    }

    if (target.dbId) {
      supabase
        .from('appointments')
        .update({
          status: 'in_consultation',
          called_at: new Date(nowTimestamp).toISOString(),
          doctor_id: doc.dbId || undefined,
        })
        .eq('id', target.dbId)
        .then(() => {});
    }

    broadcastChange('patient_called');

    setPatients((prev) => {
      const updated = prev.map((p) => {
        // 1. Complete previous in-progress patient for this doctor
        if (p.doctorId === targetDoctorId && p.status === 'IN_PROGRESS') {
          return {
            ...p,
            status: 'COMPLETED' as const,
            position: -1,
            etaMinutes: 0,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        }
        // 2. Put target patient into room
        if (
          String(p.id) === String(target.id) ||
          String(p.dbId) === String(target.dbId) ||
          (p.token && p.token === target.token)
        ) {
          return {
            ...p,
            doctorId: targetDoctorId,
            doctorName: doc.name,
            doctorRoom: doc.room,
            department: doc.department,
            status: 'IN_PROGRESS' as const,
            position: 0,
            etaMinutes: 0,
            consultationStartedAt: nowTimestamp,
          };
        }
        return p;
      });
      return recalculateAllQueues(updated, doctors);
    });
  };

  // COMPLETE & CALL NEXT button
  const completeAndCallNext = async (doctorId: number) => {
    const priorityWeight: Record<string, number> = { EMERGENCY: 1, URGENT: 2, ROUTINE: 3 };
    const inProgressPatient = patients.find((p) => p.doctorId === doctorId && p.status === 'IN_PROGRESS');

    if (inProgressPatient && inProgressPatient.dbId) {
      supabase
        .from('appointments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', inProgressPatient.dbId)
        .then(() => {});
    }

    const waitingList = patients
      .filter((p) => p.doctorId === doctorId && p.status === 'WAITING')
      .sort((a, b) => {
        const pDiff = (priorityWeight[a.priority] || 3) - (priorityWeight[b.priority] || 3);
        if (pDiff !== 0) return pDiff;
        return a.createdAt - b.createdAt;
      });

    const nextPatient = waitingList.length > 0 ? waitingList[0] : null;
    const nowTimestamp = Date.now();

    if (nextPatient) {
      try {
        localStorage.setItem(
          `queuesense_doc_${doctorId}_active_consultation`,
          JSON.stringify({
            patientId: nextPatient.id,
            token: nextPatient.token,
            startedAt: nowTimestamp,
          })
        );
      } catch {}

      if (nextPatient.dbId) {
        supabase
          .from('appointments')
          .update({ status: 'in_consultation', called_at: new Date(nowTimestamp).toISOString() })
          .eq('id', nextPatient.dbId)
          .then(() => {});
      }
    } else {
      try {
        localStorage.removeItem(`queuesense_doc_${doctorId}_active_consultation`);
      } catch {}
    }

    broadcastChange('patient_completed_and_next');

    setPatients((prev) => {
      const updated = prev.map((p) => {
        if (p.doctorId === doctorId && p.status === 'IN_PROGRESS') {
          return {
            ...p,
            status: 'COMPLETED' as const,
            position: -1,
            etaMinutes: 0,
            completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        }
        if (nextPatient && (String(p.id) === String(nextPatient.id) || (p.token && p.token === nextPatient.token))) {
          return {
            ...p,
            status: 'IN_PROGRESS' as const,
            position: 0,
            etaMinutes: 0,
            consultationStartedAt: nowTimestamp,
          };
        }
        return p;
      });
      return recalculateAllQueues(updated, doctors);
    });
  };

  // NO-SHOW button in Supabase
  const markNoShow = async (patientId: string | number) => {
    const target = patients.find((p) => String(p.id) === String(patientId) || String(p.appointmentId) === String(patientId) || String(p.dbId) === String(patientId));
    if (target && target.dbId) {
      supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', target.dbId)
        .then(() => {});
    }

    broadcastChange('patient_noshow');

    setPatients((prev) => {
      const updated = prev.map((p) => {
        if (String(p.id) === String(patientId) || String(p.appointmentId) === String(patientId) || String(p.dbId) === String(patientId)) {
          return { ...p, status: 'NO_SHOW' as const, position: -1, etaMinutes: 0 };
        }
        return p;
      });
      return recalculateAllQueues(updated, doctors);
    });
  };

  // Update doctor availability in Supabase
  const setDoctorAvailability = async (doctorId: number, status: DoctorMeta['availability']) => {
    setDoctors((prev) => prev.map((d) => (d.id === doctorId ? { ...d, availability: status } : d)));
    const doc = doctors.find((d) => d.id === doctorId);
    if (doc?.dbId) {
      try {
        await supabase.from('doctors').update({ availability_status: status, status: status.toLowerCase() }).eq('id', doc.dbId);
        broadcastChange('doctor_status_updated');
      } catch (e) {
        console.warn('Supabase doctor availability update error:', e);
      }
    }
  };

  // Get specific doctor's queue (ONLY for that doctor!)
  const getDoctorQueue = useCallback(
    (doctorId: number) => {
      const priorityWeight: Record<string, number> = { EMERGENCY: 1, URGENT: 2, ROUTINE: 3 };

      const inProgress = patients.find((p) => p.doctorId === doctorId && p.status === 'IN_PROGRESS') || null;
      const waiting = patients
        .filter((p) => p.doctorId === doctorId && p.status === 'WAITING')
        .sort((a, b) => {
          const pDiff = (priorityWeight[a.priority] || 3) - (priorityWeight[b.priority] || 3);
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
        loading,
        registerPatient,
        callPatient,
        completeAndCallNext,
        markNoShow,
        setDoctorAvailability,
        getDoctorQueue,
        getPatientByToken,
        getDepartmentMatrix,
        getOverviewMetrics,
        refreshData: fetchAllData,
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
