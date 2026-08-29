import React, { useState } from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  X,
  PhoneCall,
  UserX,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useQueue, DoctorMeta, AppPatient } from '../context/QueueContext';
import { useLanguage } from '../context/LanguageContext';

interface ReceptionLiveBoardProps {
  lastEventTime?: number;
}

export const ReceptionLiveBoard: React.FC<ReceptionLiveBoardProps> = () => {
  const { addNotification } = useNotifications();
  const { doctors, patients, callPatient, markNoShow } = useQueue();
  const { t, translateDepartment, translatePriority } = useLanguage();

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
            <span>{t('live.title')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('live.subtitle')}
          </p>
        </div>

        {/* Department Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
          {departmentsList.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                selectedDept === dept
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {dept === 'All' ? t('common.all_clinics') : translateDepartment(dept)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Multi-Doctor Live Board Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDoctors.map((doc) => {
          const docPatients = patients.filter((p) => p.doctorId === doc.id && p.status === 'WAITING');
          const docActive = patients.find((p) => p.doctorId === doc.id && p.status === 'IN_PROGRESS');

          return (
            <div
              key={doc.id}
              className="clinical-card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between overflow-hidden shadow-subtle"
            >
              {/* Doctor Header Banner */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                      {doc.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {doc.room}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {translateDepartment(doc.department)} • Pace: {doc.targetPace} {t('common.min')}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  {docPatients.length} {t('live.in_line')}
                </span>
              </div>

              {/* Currently Serving Patient in Room */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  ● {t('doctor.in_room')}
                </span>
                {docActive ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {docActive.token}
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{docActive.name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                      In Consultation
                    </span>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">{t('doctor.room_empty')}</p>
                )}
              </div>

              {/* Waiting Queue List for this Doctor */}
              <div className="p-4 flex-1 space-y-2 max-h-72 overflow-y-auto">
                {docPatients.length > 0 ? (
                  docPatients.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between text-xs hover:border-teal-500/40 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {p.token}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                p.priority === 'EMERGENCY'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : p.priority === 'URGENT'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {translatePriority(p.priority)}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                          {p.etaMinutes} {t('common.min')}
                        </span>
                        <button
                          onClick={() => handleOpenTransfer(p)}
                          title="Transfer to another doctor"
                          className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:text-teal-600 text-slate-500 transition-colors"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            callPatient(p.id);
                            addNotification('Patient Called', `Called ${p.token} to ${doc.room}`, 'info');
                          }}
                          className="px-2 py-0.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-semibold"
                        >
                          {t('doctor.call_btn')}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">
                    {t('doctor.no_waiting')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Transfer Patient Modal ────────────────────────────────────── */}
      {transferSourcePatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
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
                  {t('live.transfer_patient')}
                </h3>
              </div>
              <button onClick={() => setTransferSourcePatient(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">
                  {transferSourcePatient.token} • {transferSourcePatient.name}
                </p>
                <p className="text-slate-500 mt-0.5">
                  Currently assigned to: <b>{transferSourcePatient.doctorName}</b> ({translateDepartment(transferSourcePatient.department)})
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('live.reassign_specialist')}
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
                        {d.name} ({translateDepartment(d.department)} • {d.room})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('live.transfer_reason')}
                </label>
                <textarea
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTransferSourcePatient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-sm"
                >
                  {t('live.authorize_transfer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
