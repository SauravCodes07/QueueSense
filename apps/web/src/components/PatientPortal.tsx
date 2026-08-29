import React, { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  PlusCircle,
  AlertCircle,
  Info,
  Activity,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiQueue, apiData } from '../services/api';
import { PatientWaitTime, Department, Doctor, PriorityLevel } from '../types';
import { Hero3DCanvas } from './Hero3DCanvas';

interface PatientPortalProps {
  lastEventTime?: number;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ lastEventTime }) => {
  const { patientToken, setPatientToken } = useAuth();
  const { addNotification } = useNotifications();

  const [inputToken, setInputToken] = useState(patientToken || 'A-1');
  const [waitData, setWaitData] = useState<PatientWaitTime | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Join Queue Modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [contact, setContact] = useState('');
  const [selectedDept, setSelectedDept] = useState<number>(1);
  const [selectedDoc, setSelectedDoc] = useState<number>(1);
  const [priority, setPriority] = useState<PriorityLevel>('ROUTINE');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWaitTime = async (tokenToFetch: string) => {
    if (!tokenToFetch.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiQueue.getPatientWaitTime(tokenToFetch.trim());
      setWaitData(data);
    } catch (err: any) {
      setError(err.message || 'Unable to find active queue entry for this token');
      setWaitData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientToken) {
      setInputToken(patientToken);
      fetchWaitTime(patientToken);
    }
  }, [patientToken]);

  // Refresh in-place when live SSE event fires without tearing down DOM
  useEffect(() => {
    if (patientToken) {
      fetchWaitTime(patientToken);
    }
  }, [lastEventTime]);

  useEffect(() => {
    apiData.getDepartments().then(setDepartments).catch(() => {});
    apiData.getDoctors().then((docs) => {
      setDoctors(docs);
      if (docs.length > 0) setSelectedDoc(docs[0].id);
    }).catch(() => {});
  }, []);

  // Keyboard Escape listener for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsJoinModalOpen(false);
    };
    if (isJoinModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isJoinModalOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;
    setPatientToken(inputToken.trim().toUpperCase());
    fetchWaitTime(inputToken.trim().toUpperCase());
  };

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;
    setIsSubmitting(true);
    try {
      const newPatient = await apiQueue.registerPatient(patientName.trim(), contact.trim() || undefined);
      const joinRes = await apiQueue.joinQueue(selectedDoc, newPatient.token, priority);

      setPatientToken(newPatient.token);
      setInputToken(newPatient.token);
      setIsJoinModalOpen(false);
      setPatientName('');
      setContact('');

      addNotification(
        'Queue Joined Successfully',
        `Your token is ${newPatient.token}. Estimated wait: ${joinRes.eta_low_minutes || 10}–${joinRes.eta_high_minutes || 20} min.`,
        'success'
      );

      fetchWaitTime(newPatient.token);
    } catch (err: any) {
      addNotification('Registration Failed', err.message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((d) => d.department_id === selectedDept);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner with 3D Canvas Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white shadow-xl border border-teal-500/20">
        <div className="absolute inset-0 opacity-40">
          <Hero3DCanvas />
        </div>

        <div className="relative z-10 p-5 sm:p-8 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30 mb-3 sm:mb-4 backdrop-blur-sm">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>A Queue That Tells The Truth, Live</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight text-white mb-2">
            Dynamic Outpatient Wait Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mb-5 sm:mb-6 leading-relaxed">
            Calculated in real-time from your doctor's current consultation velocity. No fixed schedules, no false precision.
          </p>

          {/* Quick Token Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                placeholder="Enter Token (e.g. A-1, B-2)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm backdrop-blur-sm font-mono uppercase min-h-[44px]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 min-h-[44px]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Track Token</span>}
            </button>

            <button
              type="button"
              onClick={() => setIsJoinModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-sm transition-all border border-white/20 backdrop-blur-sm active:scale-95 flex items-center justify-center space-x-2 min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4 text-teal-300" />
              <span>Get Token</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Live Queue Status Display */}
      {error ? (
        <div className="glass-panel p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h3 className="font-semibold text-rose-800 dark:text-rose-300 text-base">Token Not in Active Queue</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">{error}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['A-1', 'A-2', 'A-3', 'B-1'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setInputToken(t);
                  setPatientToken(t);
                  fetchWaitTime(t);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 min-h-[36px]"
              >
                Try {t}
              </button>
            ))}
          </div>
        </div>
      ) : waitData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Main Wait-Time Card */}
          <div className="md:col-span-2 glass-panel p-5 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            {/* Status Pulse Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5 sm:mb-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Your Token</span>
                <div className="flex items-baseline space-x-2.5 sm:space-x-3 mt-0.5">
                  <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {waitData.token}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      waitData.status === 'IN_PROGRESS'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 status-glow-emerald'
                        : 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                    }`}
                  >
                    ● {waitData.status === 'IN_PROGRESS' ? 'Now In Consultation' : 'Waiting in Queue'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Now Serving</span>
                <div className="text-xl sm:text-2xl font-display font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono tabular-nums">
                  {waitData.now_serving || '—'}
                </div>
              </div>
            </div>

            {/* Estimated Wait Range & Clock Turn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 sm:mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 dark:border-emerald-500/30">
                <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>Estimated Wait Range</span>
                </div>
                <div className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">
                  {waitData.status === 'IN_PROGRESS' ? (
                    'Being seen now'
                  ) : waitData.eta_low_minutes !== null ? (
                    `${waitData.eta_low_minutes}–${waitData.eta_high_minutes} min`
                  ) : (
                    'Calculating...'
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Calculated from live doctor consultation speed
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 via-slate-500/5 to-transparent border border-teal-500/20 dark:border-teal-500/30">
                <div className="flex items-center space-x-2 text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider mb-1">
                  <Activity className="w-4 h-4 flex-shrink-0" />
                  <span>Expected Turn</span>
                </div>
                <div className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                  {waitData.status === 'IN_PROGRESS' ? 'Active Now' : waitData.eta_clock || '—'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Estimated clock completion time
                </p>
              </div>
            </div>

            {/* Queue Metrics Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center sm:text-left">
              <div>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Position</span>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  #{waitData.your_position || 1}
                </p>
              </div>

              <div>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Ahead</span>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {waitData.people_ahead}
                </p>
              </div>

              <div>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Doctor</span>
                <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 capitalize truncate">
                  {waitData.doctor_status?.toLowerCase().replace('_', ' ') || 'Available'}
                </p>
              </div>
            </div>

            {/* Explainability Note — Why ETA changed */}
            {waitData.reason && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Queue update explanation: </span>
                  <span>
                    {waitData.reason.includes('emergency')
                      ? 'An emergency patient received priority evaluation. Remaining queue recalculated automatically.'
                      : waitData.reason.includes('no_show')
                      ? 'A waiting patient was marked no-show. Your wait time has decreased.'
                      : waitData.reason.includes('consultation_started')
                      ? 'Doctor started seeing the current patient. Remaining consultation time updated.'
                      : waitData.reason.includes('consultation_ended') || waitData.reason.includes('consultation_completed')
                      ? 'Previous consultation finished. Doctor speed updated with latest timing.'
                      : 'Real-time velocity adjustment applied.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Side Progress & Helpful Tips */}
          <div className="space-y-4">
            {/* Timeline Progress Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Visit Timeline</span>
              </h4>

              <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950 -ml-5 z-10 flex-shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Registered & Token Issued</span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span
                    className={`w-3 h-3 rounded-full -ml-5 z-10 flex-shrink-0 ${
                      waitData.status === 'IN_PROGRESS'
                        ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950'
                        : 'bg-teal-400 ring-4 ring-teal-100 dark:ring-teal-950 animate-pulse'
                    }`}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {waitData.people_ahead === 0 ? 'Next Up for Consultation' : `${waitData.people_ahead} patients ahead`}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span
                    className={`w-3 h-3 rounded-full -ml-5 z-10 flex-shrink-0 ${
                      waitData.status === 'IN_PROGRESS'
                        ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950 animate-pulse'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <span className="text-slate-500 dark:text-slate-400">Doctor Consultation</span>
                </div>
              </div>
            </div>

            {/* Healthcare Trust & Safety Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Privacy & Safety</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                QueueSense strictly minimises patient data. No medical history, symptoms, or diagnoses are stored or shared.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Join Queue Modal with max-h-[90vh] and scrollable container */}
      {isJoinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsJoinModalOpen(false)}
        >
          <div
            className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span>Get Queue Token (Walk-In)</span>
              </h3>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinQueue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedDept(id);
                    const matching = doctors.filter((d) => d.department_id === id);
                    if (matching.length > 0) setSelectedDoc(matching[0].id);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer min-h-[44px]"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Doctor
                </label>
                <select
                  value={selectedDoc}
                  onChange={(e) => setSelectedDoc(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer min-h-[44px]"
                >
                  {filteredDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.availability_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority Tier
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer min-h-[44px]"
                >
                  <option value="ROUTINE">Routine (Standard FIFO)</option>
                  <option value="URGENT">Urgent (Priority Evaluation)</option>
                  <option value="EMERGENCY">Emergency (Immediate)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Registering...' : 'Confirm & Join Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
