import React, { useState, useEffect } from 'react';
import {
  Activity,
  Stethoscope,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useQueue } from '../context/QueueContext';
import { useLanguage } from '../context/LanguageContext';

interface DoctorConsoleProps {
  lastEventTime?: number;
}

export const DoctorConsole: React.FC<DoctorConsoleProps> = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const {
    doctors,
    getDoctorQueue,
    callPatient,
    completeAndCallNext,
    markNoShow,
    setDoctorAvailability,
  } = useQueue();
  const { t, translateStatus, translatePriority, translateDepartment } = useLanguage();

  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(user?.doctor_id || 1);
  const activeDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const { inProgress: activePatient, waiting: queue } = getDoctorQueue(selectedDoctorId);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Stopwatch timer for active in-room patient
  useEffect(() => {
    let timer: any;
    if (activePatient) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activePatient?.id]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // CALL BUTTON
  const handleCallPatient = (patientId: number) => {
    const target = queue.find((p) => p.id === patientId);
    if (!target) return;

    callPatient(patientId);
    setElapsedSeconds(0);
    addNotification(
      'Patient Called',
      `Called ${target.token} (${target.name}) to ${activeDoctor.room}`,
      'info'
    );
  };

  // COMPLETE & CALL NEXT BUTTON
  const handleCompleteAndNext = () => {
    if (activePatient) {
      addNotification(
        'Consultation Completed',
        `Completed visit for ${activePatient.token} (${activePatient.name}) in ${formatTimer(elapsedSeconds)}`,
        'success'
      );
    }
    completeAndCallNext(selectedDoctorId);
    setElapsedSeconds(0);
  };

  // NO-SHOW BUTTON
  const handleNoShow = (patientId: number) => {
    const target = queue.find((p) => p.id === patientId);
    if (!target) return;

    markNoShow(patientId);
    addNotification(
      'Patient Marked No-Show',
      `${target.token} (${target.name}) marked as absent. Queue advanced.`,
      'alert'
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ── Doctor Header Card & Doctor Switcher ──────────────────────── */}
      <div className="clinical-card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-lg shadow-sm">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              {/* Doctor Selector */}
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(parseInt(e.target.value, 10))}
                className="font-display font-bold text-base bg-transparent text-slate-900 dark:text-white border-b border-teal-500/50 pb-0.5 focus:outline-none cursor-pointer"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                    {d.name} ({translateDepartment(d.department)})
                  </option>
                ))}
              </select>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {activeDoctor.room}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {translateDepartment(activeDoctor.department)} • {t('doctor.target_pace')}: {activeDoctor.targetPace} {t('common.min')}/{t('common.patient')}
            </p>
          </div>
        </div>

        {/* Duty Status Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">{t('doctor.duty_status')}</span>
            <select
              value={activeDoctor.availability}
              onChange={(e) => setDoctorAvailability(selectedDoctorId, e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="AVAILABLE">● {t('status.available')}</option>
              <option value="BUSY">● {t('status.busy')}</option>
              <option value="ON_BREAK">● {t('status.on_break')}</option>
              <option value="OFFLINE">● {t('status.offline')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Active Consultation Room Stopwatch ─────────────────── */}
        <div className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('doctor.in_room')}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                activePatient
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
              }`}
            >
              {activePatient ? t('doctor.live_session') : t('doctor.room_empty')}
            </span>
          </div>

          {activePatient ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                    {activePatient.token}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activePatient.priority === 'EMERGENCY'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200'
                        : activePatient.priority === 'URGENT'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {translatePriority(activePatient.priority)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {activePatient.name}
                </h3>
              </div>

              {/* Stopwatch Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white text-center space-y-1">
                <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider block">
                  {t('doctor.session_elapsed')}
                </span>
                <div className="text-4xl font-mono font-bold text-white tracking-widest">
                  {formatTimer(elapsedSeconds)}
                </div>
                <div className="pt-2">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        elapsedSeconds > activeDoctor.targetPace * 60 ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, (elapsedSeconds / (activeDoctor.targetPace * 60)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{t('doctor.target_pace')}: {activeDoctor.targetPace}:00 {t('common.min')}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleCompleteAndNext}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('doctor.complete_next_btn')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {t('doctor.no_active')}
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {t('doctor.no_active_sub')}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Assigned Waiting Queue Table ──────────────────────── */}
        <div className="lg:col-span-2 clinical-card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                {t('doctor.upcoming_queue')} {activeDoctor.name}
              </h3>
              <p className="text-xs text-slate-400">
                {t('doctor.ordered_by')}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              {queue.length} {t('doctor.waiting_count')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">{t('doctor.pos_col')}</th>
                  <th className="py-3 px-4">{t('doctor.token_col')}</th>
                  <th className="py-3 px-4">{t('doctor.name_col')}</th>
                  <th className="py-3 px-4">{t('doctor.priority_col')}</th>
                  <th className="py-3 px-4">{t('doctor.wait_col')}</th>
                  <th className="py-3 px-4 text-right">{t('doctor.actions_col')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {queue.length > 0 ? (
                  queue.map((p) => (
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
                          {translatePriority(p.priority)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">{p.etaMinutes} {t('common.min')}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleCallPatient(p.id)}
                          className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
                        >
                          {t('doctor.call_btn')}
                        </button>
                        <button
                          onClick={() => handleNoShow(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-[11px] font-semibold transition-colors"
                        >
                          {t('doctor.noshow_btn')}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {t('doctor.no_waiting')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
