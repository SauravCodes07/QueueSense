import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Clock,
  Activity,
  Layers,
  Brain,
  RefreshCw,
  Flag,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiData, apiQueue, apiConsultations, apiAdmin } from '../services/api';
import { Doctor, QueueItem, WorkloadSummary, AvailabilityStatus, PriorityLevel, MLStatus } from '../types';

interface DoctorDashboardProps {
  lastEventTime?: number;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ lastEventTime }) => {
  const { activeDoctorId, setActiveDoctorId } = useAuth();
  const { addNotification } = useNotifications();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [workload, setWorkload] = useState<WorkloadSummary | null>(null);
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null);

  // Live Timer for IN_PROGRESS patient
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Priority Modal state
  const [priorityModalEntry, setPriorityModalEntry] = useState<QueueItem | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel>('EMERGENCY');
  const [priorityReason, setPriorityReason] = useState('');

  const fetchDoctorData = async () => {
    try {
      const [docRes, queueRes, workRes, mlRes] = await Promise.all([
        apiData.getDoctor(activeDoctorId),
        apiQueue.getDoctorQueue(activeDoctorId),
        apiData.getWorkload(activeDoctorId),
        apiAdmin.getMLStatus(),
      ]);
      setDoctor(docRes);
      setQueue(queueRes);
      setWorkload(workRes);
      setMlStatus(mlRes);
    } catch (err: any) {
      console.warn('Error fetching doctor data:', err);
    }
  };

  useEffect(() => {
    apiData.getDoctors().then(setDoctors).catch(() => {});
  }, []);

  useEffect(() => {
    fetchDoctorData();
  }, [activeDoctorId]);

  // In-place live update without DOM remount
  useEffect(() => {
    fetchDoctorData();
  }, [lastEventTime]);

  const currentPatient = queue.find((q) => q.status === 'IN_PROGRESS');
  const waitingPatients = queue.filter((q) => q.status === 'WAITING');

  // Consultation live timer increment
  useEffect(() => {
    if (!currentPatient) {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentPatient]);

  // Modal keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPriorityModalEntry(null);
    };
    if (priorityModalEntry) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [priorityModalEntry]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartConsultation = async (entry: QueueItem) => {
    setActionLoading(`start-${entry.id}`);
    try {
      await apiConsultations.start(entry.id);
      addNotification(
        'Consultation Started',
        `Started consultation for Patient ${entry.token}. Duration tracking initiated.`,
        'info'
      );
      setElapsedSeconds(0);
      fetchDoctorData();
    } catch (err: any) {
      addNotification('Cannot Start Consultation', err.message, 'warning');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteConsultation = async (entry: QueueItem) => {
    setActionLoading(`complete-${entry.id}`);
    try {
      const res = await apiConsultations.complete(undefined, entry.id);
      addNotification(
        'Consultation Concluded',
        `Duration: ${res.duration_minutes} min. Velocity EMA updated to ${res.doctor_ema_seconds || 600}s.`,
        'success'
      );
      setElapsedSeconds(0);
      fetchDoctorData();
    } catch (err: any) {
      addNotification('Completion Failed', err.message, 'warning');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAvailabilityChange = async (status: AvailabilityStatus) => {
    try {
      await apiData.setAvailability(activeDoctorId, status);
      addNotification('Availability Changed', `Status updated to ${status}.`, 'info');
      fetchDoctorData();
    } catch (err: any) {
      addNotification('Availability Update Failed', err.message, 'warning');
    }
  };

  const handleConfirmNoShow = async (entry: QueueItem) => {
    if (!window.confirm(`Confirm no-show for patient ${entry.token}? This will remove them from the active queue.`)) return;
    try {
      await apiQueue.markNoShow(entry.id, 'Doctor confirmed patient not present');
      addNotification('No-Show Recorded', `Patient ${entry.token} marked as no-show. Downstream ETAs reduced.`, 'info');
      fetchDoctorData();
    } catch (err: any) {
      addNotification('Action Failed', err.message, 'warning');
    }
  };

  const handleSetPrioritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityModalEntry || !priorityReason.trim()) return;
    try {
      await apiQueue.setPriority(priorityModalEntry.id, selectedPriority, priorityReason.trim());
      addNotification(
        'Priority Escalated',
        `Patient ${priorityModalEntry.token} marked as ${selectedPriority}. Queue reordered per policy.`,
        selectedPriority === 'EMERGENCY' ? 'alert' : 'info'
      );
      setPriorityModalEntry(null);
      setPriorityReason('');
      fetchDoctorData();
    } catch (err: any) {
      addNotification('Priority Update Failed', err.message, 'warning');
    }
  };

  const predictedDuration = doctor?.ema_duration_seconds ? Math.round(doctor.ema_duration_seconds) : 720;
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / predictedDuration) * 100));

  return (
    <div className="space-y-6">
      {/* ── Clinician Profile & Availability Bar ─────────────────────── */}
      <div className="clinical-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
            🩺
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Select Active Clinician"
                value={activeDoctorId}
                onChange={(e) => setActiveDoctorId(Number(e.target.value))}
                className="font-display font-bold text-lg text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-700 pb-0.5 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[200px] sm:max-w-none truncate"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900">
                    {d.name}
                  </option>
                ))}
              </select>

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  mlStatus?.is_enabled
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                }`}
              >
                {mlStatus?.is_enabled ? (
                  <>
                    <Brain className="w-3 h-3 mr-1 text-purple-600" />
                    <span>ML Active (MAE {mlStatus.mae_seconds || 18}s)</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3 h-3 mr-1 text-teal-600" />
                    <span>EMA Baseline</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Clinician Pace EMA: {doctor?.ema_duration_seconds ? `${Math.round(doctor.ema_duration_seconds / 60)} min / patient` : '12 min (Default)'}
            </p>
          </div>
        </div>

        {/* Availability Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          {(['AVAILABLE', 'ON_BREAK', 'UNAVAILABLE', 'OFFLINE'] as AvailabilityStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => handleAvailabilityChange(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                doctor?.availability_status === st
                  ? st === 'AVAILABLE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : st === 'ON_BREAK'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Clinical Console & Workload Index Grid ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Consultation Console (2 Cols) */}
        <div className="lg:col-span-2 clinical-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Current Consultation</span>
            </div>

            {currentPatient && (
              <span className="text-xs font-mono text-slate-400">
                Live Duration Tracked
              </span>
            )}
          </div>

          {currentPatient ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Patient In Room</span>
                  <div className="flex items-baseline space-x-3 mt-1 flex-wrap">
                    <h3 className="text-4xl font-display font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {currentPatient.token}
                    </h3>
                    <span className="text-base text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">
                      {currentPatient.patient_name || 'Walk-In Patient'}
                    </span>
                    {currentPatient.priority !== 'ROUTINE' && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${currentPatient.priority === 'EMERGENCY' ? 'badge-emergency' : 'badge-urgent'}`}>
                        {currentPatient.priority}
                      </span>
                    )}
                  </div>
                </div>

                {/* Consultation Stopwatch */}
                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Elapsed Time</span>
                  <div className="text-4xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    {formatTimer(elapsedSeconds)}
                  </div>
                </div>
              </div>

              {/* Progress Against Target Pace */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  <span>Actual: {Math.round(elapsedSeconds / 60)} min</span>
                  <span>Target: {Math.round(predictedDuration / 60)} min</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      progressPercent > 100 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {elapsedSeconds > predictedDuration && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    <span>Consultation exceeding predicted duration. Downstream wait times adjusted automatically.</span>
                  </p>
                )}
              </div>

              {/* Action Button: Complete Consultation */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleCompleteConsultation(currentPatient)}
                  disabled={actionLoading !== null}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {actionLoading === `complete-${currentPatient.id}`
                      ? 'Recording...'
                      : 'Complete Consultation & Next Patient'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <UserCheck className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base">No Active Consultation</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                Ready to call next patient from the active queue.
              </p>

              {waitingPatients.length > 0 && (
                <button
                  onClick={() => handleStartConsultation(waitingPatients[0])}
                  disabled={actionLoading !== null}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm inline-flex items-center space-x-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Consultation: {waitingPatients[0].token}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Doctor Workload Index Card (1 Col) */}
        <div className="clinical-card p-6 flex flex-col justify-between">
          <div>
            <h4 className="clinical-section-header flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Workload Index</span>
            </h4>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Composite Load Score
                </span>
                <div className="text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                  {workload?.load_score || 0}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Weighted: count + queue duration + remaining session + acuity
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Waiting Patients</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                    {workload?.waiting_count || 0}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Priority Cases</span>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {(workload?.emergency_count || 0) + (workload?.urgent_count || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 text-xs text-slate-400">
            Auto-balanced across compatible clinicians via Reception Operations.
          </div>
        </div>
      </div>

      {/* ── Active Waiting Queue Table ───────────────────────────────── */}
      <div className="clinical-card overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Active Waiting Queue ({waitingPatients.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic priority ordering (IN_PROGRESS → EMERGENCY → URGENT → ROUTINE FIFO)
            </p>
          </div>

          <button
            onClick={fetchDoctorData}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile View (<640px) */}
        <div className="block sm:hidden divide-y divide-slate-200 dark:divide-slate-800">
          {waitingPatients.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No waiting patients in queue.
            </div>
          ) : (
            waitingPatients.map((entry, idx) => (
              <div key={entry.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-400 text-xs">#{idx + 1}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {entry.token}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]">
                      {entry.patient_name || 'Walk-In'}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${entry.priority === 'EMERGENCY' ? 'badge-emergency' : entry.priority === 'URGENT' ? 'badge-urgent' : 'badge-routine'}`}>
                    {entry.priority}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    Est: <strong className="text-slate-800 dark:text-slate-200">{entry.eta_low_minutes !== null ? `${entry.eta_low_minutes}–${entry.eta_high_minutes}m` : 'Calc...'}</strong>
                  </span>

                  <div className="flex items-center space-x-2">
                    {!currentPatient && idx === 0 && (
                      <button
                        onClick={() => handleStartConsultation(entry)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                      >
                        Start
                      </button>
                    )}

                    <button
                      onClick={() => setPriorityModalEntry(entry)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
                    >
                      <Flag className="w-3 h-3 inline mr-1" />
                      Priority
                    </button>

                    <button
                      onClick={() => handleConfirmNoShow(entry)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
                    >
                      <UserX className="w-3 h-3 inline mr-1" />
                      No-Show
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (>=640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Token</th>
                <th className="px-5 py-3">Patient Name</th>
                <th className="px-5 py-3">Priority Tier</th>
                <th className="px-5 py-3">Estimated Wait</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {waitingPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500">
                    No waiting patients in queue.
                  </td>
                </tr>
              ) : (
                waitingPatients.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {entry.token}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      {entry.patient_name || 'Walk-In'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${entry.priority === 'EMERGENCY' ? 'badge-emergency' : entry.priority === 'URGENT' ? 'badge-urgent' : 'badge-routine'}`}>
                        {entry.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-200 tabular-nums">
                      {entry.eta_low_minutes !== null ? `${entry.eta_low_minutes}–${entry.eta_high_minutes} min` : 'Calculating...'}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      {!currentPatient && idx === 0 && (
                        <button
                          onClick={() => handleStartConsultation(entry)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm"
                        >
                          Start
                        </button>
                      )}

                      <button
                        onClick={() => setPriorityModalEntry(entry)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Set Priority"
                      >
                        <Flag className="w-3 h-3 inline mr-1" />
                        Priority
                      </button>

                      <button
                        onClick={() => handleConfirmNoShow(entry)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 hover:text-amber-600 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Confirm No-Show"
                      >
                        <UserX className="w-3 h-3 inline mr-1" />
                        No-Show
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Priority Escalation Modal ─────────────────────────────────── */}
      {priorityModalEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPriorityModalEntry(null)}
        >
          <div
            className="clinical-card w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Priority Escalation: {priorityModalEntry.token}</span>
              </h3>
              <button
                onClick={() => setPriorityModalEntry(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSetPrioritySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority Tier *
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                >
                  <option value="EMERGENCY">🚨 EMERGENCY (Immediate priority evaluation)</option>
                  <option value="URGENT">⚠️ URGENT (Evaluation ahead of routine)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Operational Justification (Mandatory for Audit Trail) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="e.g. Acute distress, triage nurse escalation, abnormal vital signs"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPriorityModalEntry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm"
                >
                  Confirm Priority Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
