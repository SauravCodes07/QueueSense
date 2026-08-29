import React, { useState } from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  RefreshCw,
  Sparkles,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useQueue, DoctorMeta, AppPatient } from '../context/QueueContext';

interface ReceptionLiveBoardProps {
  lastEventTime?: number;
}

export const ReceptionLiveBoard: React.FC<ReceptionLiveBoardProps> = () => {
  const { addNotification } = useNotifications();
  const { doctors, patients, callPatient, markNoShow } = useQueue();

  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [transferSourcePatient, setTransferSourcePatient] = useState<AppPatient | null>(null);
  const [targetDoctorId, setTargetDoctorId] = useState<number | null>(null);
  const [transferReason, setTransferReason] = useState('');

  const departmentsList = [
    'All',
    'General Medicine',
    'Cardiology',
    'Pediatrics',
    'Orthopedics',
    'Dermatology',
  ];

  const filteredDoctors = doctors.filter((d) => selectedDept === 'All' || d.department === selectedDept);

  const handleOpenTransfer = (patient: AppPatient) => {
    setTransferSourcePatient(patient);
    const otherDocs = doctors.filter((d) => d.department === patient.department && d.id !== patient.doctorId);
    if (otherDocs.length > 0) setTargetDoctorId(otherDocs[0].id);
    setTransferReason(`Workload rebalancing from ${patient.doctorName}`);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourcePatient || !targetDoctorId) return;

    const targetDoc = doctors.find((d) => d.id === targetDoctorId);
    if (!targetDoc) return;

    addNotification(
      'Patient Transferred',
      `Patient ${transferSourcePatient.token} moved to ${targetDoc.name}'s queue.`,
      'success'
    );
    setTransferSourcePatient(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ── Top Controls: Department Filter & Header ─────────────────── */}
      <div className="clinical-card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <LayoutDashboard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Cross-Doctor Live Operations Board</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time outpatient density, live clinician queues, and staff-authorized transfers
          </p>
        </div>

        {/* Department Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
          {departmentsList.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedDept === dept
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {dept === 'All' ? 'All Clinics' : dept}
            </button>
          ))}
        </div>
      </div>

      {/* ── Doctor Queue Columns Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doc) => {
          const docWaiting = patients.filter((p) => p.doctorId === doc.id && p.status === 'WAITING');
          const docInProgress = patients.find((p) => p.doctorId === doc.id && p.status === 'IN_PROGRESS');

          return (
            <div
              key={doc.id}
              className="clinical-card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col justify-between shadow-subtle hover:border-teal-500/40 transition-all"
            >
              {/* Card Header */}
              <div>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                      {doc.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {doc.department} • {doc.room}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {docWaiting.length} In Line
                  </span>
                </div>

                {/* Active in room */}
                <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                      {docInProgress ? `In Room: ${docInProgress.token} (${docInProgress.name})` : 'Room Available'}
                    </span>
                  </div>
                  {docInProgress && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      Live
                    </span>
                  )}
                </div>

                {/* Waiting Patients List */}
                <div className="p-3 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto space-y-1">
                  {docWaiting.length > 0 ? (
                    docWaiting.map((p) => (
                      <div key={p.id} className="pt-2 pb-1 flex items-center justify-between text-xs group">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                              {p.token}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                p.priority === 'EMERGENCY'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : p.priority === 'URGENT'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {p.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                            {p.name}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            #{p.position} • Est. Wait: {p.etaMinutes} min
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            onClick={() => callPatient(p.id)}
                            className="px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 text-[10px] font-semibold transition-colors"
                          >
                            Call
                          </button>
                          <button
                            onClick={() => handleOpenTransfer(p)}
                            className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Transfer Patient"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => markNoShow(p.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[10px]"
                            title="Mark No-Show"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No patients waiting in queue.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Patient Transfer Modal ────────────────────────────────────── */}
      {transferSourcePatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setTransferSourcePatient(null)}
        >
          <div
            className="clinical-card w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-teal-600" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Transfer Patient
                </h3>
              </div>
              <button
                onClick={() => setTransferSourcePatient(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">
                  {transferSourcePatient.token} — {transferSourcePatient.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  Current: {transferSourcePatient.doctorName} ({transferSourcePatient.department})
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reassign to Specialist:
                </label>
                <select
                  value={targetDoctorId || ''}
                  onChange={(e) => setTargetDoctorId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  {doctors
                    .filter((d) => d.id !== transferSourcePatient.doctorId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.department} • {d.room})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Transfer Justification:
                </label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTransferSourcePatient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-sm"
                >
                  Authorize Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
