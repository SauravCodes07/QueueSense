import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { apiData, apiQueue } from '../services/api';
import { Doctor, Department, QueueItem, WorkloadRecommendation } from '../types';

interface DoctorQueueCardData {
  doctor: Doctor;
  queue: QueueItem[];
  loadScore: number;
}

interface ReceptionLiveBoardProps {
  lastEventTime?: number;
}

export const ReceptionLiveBoard: React.FC<ReceptionLiveBoardProps> = ({ lastEventTime }) => {
  const { addNotification } = useNotifications();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [doctorCards, setDoctorCards] = useState<DoctorQueueCardData[]>([]);
  const [loading, setLoading] = useState(false);

  // Transfer Modal state
  const [transferSourceEntry, setTransferSourceEntry] = useState<{ entry: QueueItem; fromDoctor: Doctor } | null>(null);
  const [targetDoctorId, setTargetDoctorId] = useState<number | null>(null);
  const [transferReason, setTransferReason] = useState('');
  const [recommendation, setRecommendation] = useState<WorkloadRecommendation | null>(null);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const fetchBoardData = async () => {
    setLoading(true);
    try {
      const [deptList, docList] = await Promise.all([
        apiData.getDepartments(),
        apiData.getDoctors(selectedDeptId || undefined),
      ]);
      setDepartments(deptList);

      const cards: DoctorQueueCardData[] = await Promise.all(
        docList.map(async (doc) => {
          const [q, work] = await Promise.all([
            apiQueue.getDoctorQueue(doc.id).catch(() => []),
            apiData.getWorkload(doc.id).catch(() => ({ load_score: 0 })),
          ]);
          return {
            doctor: doc,
            queue: q,
            loadScore: work.load_score || 0,
          };
        })
      );

      setDoctorCards(cards);
    } catch (err) {
      console.warn('Error fetching live board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [selectedDeptId]);

  // Live update trigger without DOM remount
  useEffect(() => {
    fetchBoardData();
  }, [lastEventTime]);

  // Modal keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTransferSourceEntry(null);
    };
    if (transferSourceEntry) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transferSourceEntry]);

  const handleOpenTransferModal = async (entry: QueueItem, fromDoctor: Doctor) => {
    setTransferSourceEntry({ entry, fromDoctor });
    setTransferReason(`Workload rebalancing from ${fromDoctor.name}`);

    try {
      const recRes = await apiData.getWorkloadRecommendations(fromDoctor.department_id, fromDoctor.id);
      if (recRes.recommendation) {
        setRecommendation(recRes.recommendation);
        setTargetDoctorId(recRes.recommendation.doctor_id);
      } else {
        const otherDocs = doctorCards.map((c) => c.doctor).filter((d) => d.id !== fromDoctor.id && d.department_id === fromDoctor.department_id);
        if (otherDocs.length > 0) setTargetDoctorId(otherDocs[0].id);
      }
    } catch {
      // fallback
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourceEntry || !targetDoctorId || !transferReason.trim()) return;
    setIsSubmittingTransfer(true);
    try {
      await apiQueue.transferPatient(transferSourceEntry.entry.id, targetDoctorId, transferReason.trim());
      const targetDoc = doctorCards.find((c) => c.doctor.id === targetDoctorId)?.doctor;
      addNotification(
        'Patient Transferred',
        `Patient ${transferSourceEntry.entry.token} successfully moved to ${targetDoc?.name || 'Doctor'}'s queue.`,
        'success'
      );
      setTransferSourceEntry(null);
      fetchBoardData();
    } catch (err: any) {
      addNotification('Transfer Failed', err.message, 'warning');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Controls: Department Filter & Refresh ───────────────── */}
      <div className="clinical-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <LayoutDashboard className="w-5 h-5 text-emerald-600" />
            <span>Cross-Doctor Live Operations Board</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time outpatient density, live load scoring, and staff-authorized workload transfers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setSelectedDeptId(null)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedDeptId === null
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Specialties
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedDeptId === dept.id
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>

          <button
            onClick={fetchBoardData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Live Board"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Doctor Queue Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctorCards.map(({ doctor, queue, loadScore }) => {
          const inProgress = queue.find((q) => q.status === 'IN_PROGRESS');
          const waiting = queue.filter((q) => q.status === 'WAITING');

          return (
            <div
              key={doctor.id}
              className="clinical-card p-6 flex flex-col justify-between"
            >
              <div>
                {/* Doctor Card Header */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white truncate">
                      {doctor.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {departments.find((d) => d.id === doctor.department_id)?.name || 'General Medicine'}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold flex-shrink-0 ${
                      doctor.availability_status === 'AVAILABLE'
                        ? 'badge-live'
                        : doctor.availability_status === 'ON_BREAK'
                        ? 'badge-urgent'
                        : 'badge-emergency'
                    }`}
                  >
                    ● {doctor.availability_status.replace('_', ' ')}
                  </span>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Load Score</span>
                    <p className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5 tabular-nums">
                      {loadScore}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Waiting Count</span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                      {waiting.length} patients
                    </p>
                  </div>
                </div>

                {/* In Consultation Strip */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 mb-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    In Room:
                  </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate">{inProgress ? `${inProgress.token} (${inProgress.patient_name || 'Patient'})` : 'None (Ready)'}</span>
                    {inProgress && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] badge-live flex-shrink-0">
                        In Session
                      </span>
                    )}
                  </div>
                </div>

                {/* Waiting Patients List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Next in Line ({waiting.length})
                  </span>

                  {waiting.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center italic">
                      Queue empty. Ready for intake.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {waiting.map((entry, idx) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs gap-2"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="font-bold text-slate-400 flex-shrink-0">#{idx + 1}</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white flex-shrink-0 tabular-nums">
                              {entry.token}
                            </span>
                            {entry.priority !== 'ROUTINE' && (
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${entry.priority === 'EMERGENCY' ? 'badge-emergency' : 'badge-urgent'}`}>
                                {entry.priority}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                              ~{entry.eta_low_minutes || 10}m
                            </span>
                            <button
                              onClick={() => handleOpenTransferModal(entry, doctor)}
                              className="p-1 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors border border-slate-200 dark:border-slate-600"
                              title="Transfer patient to another clinician"
                              aria-label="Transfer patient"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Velocity EMA: {doctor.ema_duration_seconds ? `${Math.round(doctor.ema_duration_seconds / 60)}m` : '12m'}</span>
                <span>ID: #{doctor.id}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Transfer Patient Modal ────────────────────────────────────── */}
      {transferSourceEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setTransferSourceEntry(null)}
        >
          <div
            className="clinical-card w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <ArrowRightLeft className="w-4 h-4 text-teal-600" />
                <span>Transfer Patient: {transferSourceEntry.entry.token}</span>
              </h3>
              <button
                onClick={() => setTransferSourceEntry(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
              {/* Recommendation Banner */}
              {recommendation && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 text-teal-900 dark:text-teal-200 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span className="truncate">
                      Recommended: <strong>{recommendation.doctor_name}</strong> (Load: {recommendation.load_score})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetDoctorId(recommendation.doctor_id)}
                    className="px-2 py-1 rounded bg-teal-600 text-white font-semibold text-xs flex-shrink-0"
                  >
                    Select
                  </button>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Source Clinician
                </label>
                <input
                  type="text"
                  disabled
                  value={transferSourceEntry.fromDoctor.name}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Clinician (Compatible Specialty) *
                </label>
                <select
                  value={targetDoctorId || ''}
                  onChange={(e) => setTargetDoctorId(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                >
                  {doctorCards
                    .map((c) => c.doctor)
                    .filter((d) => d.id !== transferSourceEntry.fromDoctor.id)
                    .map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({departments.find((d) => d.id === doc.department_id)?.name})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Justification (Audit Trail) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Workload balancing, clinician called to emergency room"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTransferSourceEntry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer || !targetDoctorId}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {isSubmittingTransfer ? 'Transferring...' : 'Authorize Patient Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
