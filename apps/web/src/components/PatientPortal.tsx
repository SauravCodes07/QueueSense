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
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiQueue, apiData } from '../services/api';
import { PatientWaitTime, Department, Doctor, PriorityLevel } from '../types';

interface PatientPortalProps {
  lastEventTime?: number;
  initialToken?: string;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ lastEventTime, initialToken }) => {
  const { patientToken, setPatientToken } = useAuth();
  const { addNotification } = useNotifications();

  const [inputToken, setInputToken] = useState(initialToken || patientToken || 'A-1');
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
      setError(err.message || 'No active outpatient queue entry found for this token.');
      setWaitData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const active = initialToken || patientToken || 'A-1';
    setInputToken(active);
    fetchWaitTime(active);
  }, [patientToken, initialToken]);

  // Live SSE update in-place without DOM remounting
  useEffect(() => {
    if (patientToken) fetchWaitTime(patientToken);
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
    if (isJoinModalOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isJoinModalOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;
    const clean = inputToken.trim().toUpperCase();
    setPatientToken(clean);
    fetchWaitTime(clean);
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
        'Queue Token Issued',
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
      {/* ── Top Token Lookup Bar ──────────────────────────────────────── */}
      <div className="clinical-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value.toUpperCase())}
              placeholder="Track token (e.g. A-1, A-2, A-3)"
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-all shadow-sm flex items-center space-x-1.5 flex-shrink-0"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Track</span>}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsJoinModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Walk-In Registration</span>
        </button>
      </div>

      {/* ── Main Wait Time Status Display ─────────────────────────────── */}
      {error ? (
        <div className="clinical-card p-8 text-center border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-semibold text-rose-900 dark:text-rose-200 text-base">Token Not in Active Queue</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {['A-1', 'A-2', 'A-3', 'B-1'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setInputToken(t);
                  setPatientToken(t);
                  fetchWaitTime(t);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500"
              >
                Track {t}
              </button>
            ))}
          </div>
        </div>
      ) : waitData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Wait Card (2 Cols) */}
          <div className="lg:col-span-2 clinical-card p-6 sm:p-8 space-y-6">
            {/* Header: Token + Status + Now Serving */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-200 dark:border-slate-800 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your Queue Token</span>
                <div className="flex items-baseline space-x-3 mt-1">
                  <h2 className="text-4xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {waitData.token}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      waitData.status === 'IN_PROGRESS' ? 'badge-live' : 'badge-routine'
                    }`}
                  >
                    ● {waitData.status === 'IN_PROGRESS' ? 'In Consultation' : 'Waiting in Queue'}
                  </span>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Currently In Room</span>
                <div className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                  {waitData.now_serving || '—'}
                </div>
              </div>
            </div>

            {/* Prominent ETA Range & Expected Turn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Estimated Wait Range</span>
                </div>
                <div className="text-3xl font-display font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {waitData.status === 'IN_PROGRESS' ? (
                    'Being seen now'
                  ) : waitData.eta_low_minutes !== null ? (
                    `${waitData.eta_low_minutes}–${waitData.eta_high_minutes} min`
                  ) : (
                    'Calculating...'
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Continuously updated from live doctor velocity
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Expected Clock Turn</span>
                </div>
                <div className="text-3xl font-display font-extrabold text-slate-900 dark:text-white tabular-nums font-mono">
                  {waitData.status === 'IN_PROGRESS' ? 'Active Now' : waitData.eta_clock || '—'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Probabilistic clock arrival window
                </p>
              </div>
            </div>

            {/* Queue Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center sm:text-left">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Position</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  #{waitData.your_position || 1}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">People Ahead</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {waitData.people_ahead}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Doctor Status</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 capitalize truncate">
                  {waitData.doctor_status?.toLowerCase().replace('_', ' ') || 'Available'}
                </p>
              </div>
            </div>

            {/* Explainability Banner */}
            {waitData.reason && (
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-3">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Why Your ETA Changed: </span>
                  <span>
                    {waitData.reason.includes('emergency')
                      ? 'An urgent triage patient received priority evaluation. Downstream queue recalculated.'
                      : waitData.reason.includes('no_show')
                      ? 'A waiting patient was marked no-show. Your estimated wait has decreased.'
                      : waitData.reason.includes('consultation_started')
                      ? 'Doctor began consultation with the active patient. Remaining duration updated.'
                      : waitData.reason.includes('consultation_ended') || waitData.reason.includes('consultation_completed')
                      ? 'Previous consultation concluded. Clinician velocity EMA refreshed.'
                      : 'Live consultation velocity adjustment applied.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Side Column: Timeline & Safety (1 Col) */}
          <div className="space-y-6">
            {/* Visit Timeline Card */}
            <div className="clinical-card p-6">
              <h4 className="clinical-section-header flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Visit Timeline</span>
              </h4>

              <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                <div className="flex items-center space-x-2.5 text-xs">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950 -ml-5 z-10 flex-shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Registered & Token Issued</span>
                </div>

                <div className="flex items-center space-x-2.5 text-xs">
                  <span
                    className={`w-3 h-3 rounded-full -ml-5 z-10 flex-shrink-0 ${
                      waitData.status === 'IN_PROGRESS'
                        ? 'bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950'
                        : 'bg-teal-500 ring-4 ring-teal-100 dark:ring-teal-950 animate-pulse'
                    }`}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {waitData.people_ahead === 0 ? 'Next Up for Consultation' : `${waitData.people_ahead} patients ahead`}
                  </span>
                </div>

                <div className="flex items-center space-x-2.5 text-xs">
                  <span
                    className={`w-3 h-3 rounded-full -ml-5 z-10 flex-shrink-0 ${
                      waitData.status === 'IN_PROGRESS'
                        ? 'bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950 animate-pulse'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <span className="text-slate-500 dark:text-slate-400">Doctor Consultation</span>
                </div>
              </div>
            </div>

            {/* Privacy & Trust Assurance */}
            <div className="clinical-card p-6 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Patient Privacy Assurance</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                QueueSense strictly tracks operational timestamps. No symptoms, medical history, or diagnoses are stored or transmitted.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Walk-In Queue Token Modal ─────────────────────────────────── */}
      {isJoinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsJoinModalOpen(false)}
        >
          <div
            className="clinical-card w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Get Queue Token (Walk-In)</span>
              </h3>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinQueue} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Doctor
                </label>
                <select
                  value={selectedDoc}
                  onChange={(e) => setSelectedDoc(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {filteredDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.availability_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority Tier
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
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
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
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
