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

  // Live update trigger without tearing down DOM
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
    if (priorityModalEntry) {
      window.addEventListener('keydown', handleKeyDown);
    }
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
        `Started consultation for Patient ${entry.token}. Live duration tracking initiated.`,
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
        'Consultation Completed',
        `Completed in ${res.duration_minutes} min. Doctor EMA speed updated to ${res.doctor_ema_seconds || 600}s.`,
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
      addNotification('Availability Updated', `Status changed to ${status}.`, 'info');
      fetchDoctorData();
    } catch (err: any) {
      addNotification('Availability Update Failed', err.message, 'warning');
    }
  };

  const handleConfirmNoShow = async (entry: QueueItem) => {
    if (!window.confirm(`Confirm no-show for patient ${entry.token}? This will remove them from the active queue.`)) return;
    try {
      await apiQueue.markNoShow(entry.id, 'Doctor confirmed patient not present');
      addNotification('No-Show Confirmed', `Patient ${entry.token} marked as no-show. Downstream ETAs recalculated.`, 'info');
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
        'Priority Updated',
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
      {/* Top Header Card: Doctor Profile & Availability Toggle */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md flex-shrink-0">
            🩺
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Select Active Doctor"
                value={activeDoctorId}
                onChange={(e) => setActiveDoctorId(Number(e.target.value))}
                className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-700 pb-0.5 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[220px] sm:max-w-none truncate"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900">
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Active Prediction Source Badge */}
              <div
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  mlStatus?.is_enabled
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                    : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                }`}
              >
                {mlStatus?.is_enabled ? (
                  <>
                    <Brain className="w-3 h-3 mr-1 text-purple-500 flex-shrink-0" />
                    <span className="truncate">ML GradientBoosting (MAE {mlStatus.mae_seconds || 18}s)</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3 h-3 mr-1 text-teal-500 flex-shrink-0" />
                    <span>EMA Baseline</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active Speed EMA: {doctor?.ema_duration_seconds ? `${Math.round(doctor.ema_duration_seconds / 60)} min / patient` : '12 min (Default)'}
            </p>
          </div>
        </div>

        {/* Availability Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          {(['AVAILABLE', 'ON_BREAK', 'UNAVAILABLE', 'OFFLINE'] as AvailabilityStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => handleAvailabilityChange(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] flex-1 sm:flex-initial text-center ${
                doctor?.availability_status === st
                  ? st === 'AVAILABLE'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : st === 'ON_BREAK'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : st === 'UNAVAILABLE'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-slate-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Current Patient Consultation Console & Workload Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Current Active Consultation Card */}
        <div className="lg:col-span-2 glass-panel p-5 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 relative">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5 sm:mb-6">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4 animate-pulse flex-shrink-0" />
              <span>Current Consultation</span>
            </div>

            {currentPatient && (
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                Server timestamped
              </span>
            )}
          </div>

          {currentPatient ? (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient In Room</span>
                  <div className="flex items-baseline space-x-2.5 sm:space-x-3 mt-1 flex-wrap">
                    <h3 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                      {currentPatient.token}
                    </h3>
                    <span className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px] sm:max-w-none">
                      {currentPatient.patient_name || 'Walk-In Patient'}
                    </span>
                    {currentPatient.priority !== 'ROUTINE' && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        {currentPatient.priority}
                      </span>
                    )}
                  </div>
                </div>

                {/* Consultation Stopwatch */}
                <div className="text-left sm:text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Elapsed Time</span>
                  <div className="text-3xl sm:text-4xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    {formatTimer(elapsedSeconds)}
                  </div>
                </div>
              </div>

              {/* Predicted Duration Comparison Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  <span>Actual: {Math.round(elapsedSeconds / 60)} min</span>
                  <span>Target: {Math.round(predictedDuration / 60)} min</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      progressPercent > 100
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
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

              {/* Complete Consultation Action Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleCompleteConsultation(currentPatient)}
                  disabled={actionLoading !== null}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/25 active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {actionLoading === `complete-${currentPatient.id}`
                      ? 'Recording...'
                      : 'Complete Consultation & Next Patient'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-10">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <UserCheck className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base">No Active Consultation</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Ready to begin next patient consultation from the queue below.
              </p>

              {waitingPatients.length > 0 && (
                <button
                  onClick={() => handleStartConsultation(waitingPatients[0])}
                  disabled={actionLoading !== null}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 inline-flex items-center space-x-2 min-h-[44px]"
                >
                  <Play className="w-4 h-4 fill-current flex-shrink-0" />
                  <span>Start Consultation: {waitingPatients[0].token}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Workload Metric Card */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Doctor Workload Index</span>
            </h4>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Composite Load Score
                </span>
                <div className="text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                  {workload?.load_score || 0}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Weighted: count + wait sum + remaining + priority
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Waiting Patients</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {workload?.waiting_count || 0}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Priority Cases</span>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {(workload?.emergency_count || 0) + (workload?.urgent_count || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 text-xs text-slate-500 dark:text-slate-400">
            Auto-balanced across compatible doctors via Reception Live Board.
          </div>
        </div>
      </div>

      {/* Active Queue: Responsive Desktop Table & Mobile Card View */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Active Waiting Queue ({waitingPatients.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic priority ordering (IN_PROGRESS → EMERGENCY → URGENT → ROUTINE FIFO)
            </p>
          </div>

          <button
            onClick={fetchDoctorData}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Refresh Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile View (<640px): Responsive Cards */}
        <div className="block sm:hidden divide-y divide-slate-200 dark:divide-slate-800">
          {waitingPatients.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No waiting patients in queue.
            </div>
          ) : (
            waitingPatients.map((entry, idx) => (
              <div key={entry.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
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

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      entry.priority === 'EMERGENCY'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 status-glow-rose'
                        : entry.priority === 'URGENT'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
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
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all min-h-[36px]"
                      >
                        Start
                      </button>
                    )}

                    <button
                      onClick={() => setPriorityModalEntry(entry)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 min-h-[36px]"
                    >
                      <Flag className="w-3.5 h-3.5 inline mr-1" />
                      Priority
                    </button>

                    <button
                      onClick={() => handleConfirmNoShow(entry)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 min-h-[36px]"
                    >
                      <UserX className="w-3.5 h-3.5 inline mr-1" />
                      No-Show
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (>=640px): Full Data Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
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
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    No waiting patients in queue.
                  </td>
                </tr>
              ) : (
                waitingPatients.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-400 text-xs">#{idx + 1}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {entry.token}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      {entry.patient_name || 'Walk-In'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          entry.priority === 'EMERGENCY'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 status-glow-rose'
                            : entry.priority === 'URGENT'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
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
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          Start
                        </button>
                      )}

                      <button
                        onClick={() => setPriorityModalEntry(entry)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Set Priority (Urgent/Emergency)"
                      >
                        <Flag className="w-3.5 h-3.5 inline mr-1" />
                        Priority
                      </button>

                      <button
                        onClick={() => handleConfirmNoShow(entry)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 hover:text-amber-600 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Confirm No-Show"
                      >
                        <UserX className="w-3.5 h-3.5 inline mr-1" />
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

      {/* Priority Flag Modal with max-h-[90vh] and scrollable container */}
      {priorityModalEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPriorityModalEntry(null)}
        >
          <div
            className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <span>Set Priority: {priorityModalEntry.token}</span>
              </h3>
              <button
                onClick={() => setPriorityModalEntry(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSetPrioritySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority Tier *
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer min-h-[44px]"
                >
                  <option value="EMERGENCY">🚨 EMERGENCY (Immediate priority evaluation)</option>
                  <option value="URGENT">⚠️ URGENT (Evaluation ahead of routine)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Operational Reason (Required for Audit Log) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="e.g. Acute distress, triage nurse escalation, abnormal vital signs"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPriorityModalEntry(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 active:scale-95 min-h-[44px]"
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
