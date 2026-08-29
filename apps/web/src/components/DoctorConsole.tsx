import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Square,
  UserX,
  AlertTriangle,
  ArrowRight,
  Clock,
  User,
  Stethoscope,
  Building,
  CheckCircle2,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

interface QueuePatient {
  id: number;
  token: string;
  name: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  position: number;
  etaMinutes: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
}

interface DoctorConsoleProps {
  lastEventTime?: number;
}

export const DoctorConsole: React.FC<DoctorConsoleProps> = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [availability, setAvailability] = useState<'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE'>('AVAILABLE');
  const [activePatient, setActivePatient] = useState<QueuePatient | null>({
    id: 1,
    token: 'GM-101',
    name: 'Pooja Iyer',
    priority: 'ROUTINE',
    position: 0,
    etaMinutes: 0,
    status: 'IN_PROGRESS',
  });

  const [queue, setQueue] = useState<QueuePatient[]>([
    { id: 2, token: 'GM-102', name: 'Ramesh Kulkarni', priority: 'ROUTINE', position: 1, etaMinutes: 12, status: 'WAITING' },
    { id: 3, token: 'GM-103', name: 'Sunita Rao', priority: 'URGENT', position: 2, etaMinutes: 24, status: 'WAITING' },
    { id: 4, token: 'GM-104', name: 'Sneha Patil', priority: 'ROUTINE', position: 3, etaMinutes: 36, status: 'WAITING' },
    { id: 5, token: 'GM-105', name: 'Vikram Joshi', priority: 'ROUTINE', position: 4, etaMinutes: 48, status: 'WAITING' },
  ]);

  const [isConsulting, setIsConsulting] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(385); // 6 min 25s

  useEffect(() => {
    let timer: any;
    if (isConsulting && activePatient) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isConsulting, activePatient]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartConsultation = () => {
    setIsConsulting(true);
    setElapsedSeconds(0);
    setAvailability('BUSY');
    addNotification('Consultation Started', `Now seeing ${activePatient?.token} (${activePatient?.name})`, 'info');
  };

  const handleCompleteConsultation = () => {
    if (!activePatient) return;
    addNotification('Consultation Completed', `Finished consultation for ${activePatient.token} in ${formatTimer(elapsedSeconds)}`, 'success');

    if (queue.length > 0) {
      const next = queue[0];
      const remaining = queue.slice(1).map((p, idx) => ({ ...p, position: idx + 1, etaMinutes: Math.max(0, p.etaMinutes - 12) }));
      setActivePatient({ ...next, status: 'IN_PROGRESS', position: 0 });
      setQueue(remaining);
      setElapsedSeconds(0);
      setIsConsulting(true);
      setAvailability('BUSY');
    } else {
      setActivePatient(null);
      setIsConsulting(false);
      setAvailability('AVAILABLE');
    }
  };

  const handleMarkNoShow = (patientId: number) => {
    const p = queue.find((item) => item.id === patientId);
    if (!p) return;
    setQueue((prev) => prev.filter((item) => item.id !== patientId).map((item, idx) => ({ ...item, position: idx + 1, etaMinutes: Math.max(0, item.etaMinutes - 12) })));
    addNotification('Patient No-Show', `Marked ${p.token} (${p.name}) as absent. Queue advanced.`, 'alert');
  };

  const handleCallNext = (patientId: number) => {
    const target = queue.find((p) => p.id === patientId);
    if (!target) return;
    addNotification('Calling Patient', `Calling ${target.token} (${target.name}) to Room 101`, 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ── Doctor Header Card ────────────────────────────────────────── */}
      <div className="clinical-card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-lg shadow-sm">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                {user?.name || 'Dr. Anjali Sharma'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Room 101
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              General Medicine • Senior Consultant Physician • Target Pace: 12 min/patient
            </p>
          </div>
        </div>

        {/* Doctor Availability Pill */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Duty Status:</span>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="AVAILABLE">● Available</option>
            <option value="BUSY">● With Patient (Busy)</option>
            <option value="ON_BREAK">● On Break</option>
            <option value="OFFLINE">● Offline</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Active Consultation Room Stopwatch (Left 1 Col) ─────────── */}
        <div className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              IN CONSULTATION ROOM
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Live Session
            </span>
          </div>

          {activePatient ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                    {activePatient.token}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {activePatient.priority}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {activePatient.name}
                </h3>
              </div>

              {/* Stopwatch Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white text-center space-y-1">
                <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider block">
                  SESSION ELAPSED TIME
                </span>
                <div className="text-4xl font-mono font-bold text-white tracking-widest">
                  {formatTimer(elapsedSeconds)}
                </div>
                <div className="pt-2">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        elapsedSeconds > 720 ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, (elapsedSeconds / 720) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Target Pace: 12:00 min</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleCompleteConsultation}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete & Call Next Patient</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Queue is Clear
              </p>
              <p className="text-xs text-slate-400">
                No active patient in room. Click call next when ready.
              </p>
            </div>
          )}
        </div>

        {/* ── Waiting Queue Table (Right 2 Cols) ───────────────────────── */}
        <div className="lg:col-span-2 clinical-card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Upcoming Waiting Queue
              </h3>
              <p className="text-xs text-slate-400">
                Ordered deterministically by Acuity Priority & Arrival Time
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              {queue.length} Waiting
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">POS</th>
                  <th className="py-3 px-4">TOKEN</th>
                  <th className="py-3 px-4">PATIENT NAME</th>
                  <th className="py-3 px-4">PRIORITY</th>
                  <th className="py-3 px-4">EST. WAIT</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {queue.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-400">#{p.position}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{p.token}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.priority === 'EMERGENCY'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200'
                            : p.priority === 'URGENT'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {p.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{p.etaMinutes} min</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleCallNext(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 text-[11px] font-semibold transition-colors"
                      >
                        Call
                      </button>
                      <button
                        onClick={() => handleMarkNoShow(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-[11px] font-semibold transition-colors"
                      >
                        No-Show
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
