import React, { useState } from 'react';
import {
  Stethoscope,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  PhoneCall,
  UserX,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useQueue, DoctorMeta, AppPatient } from '../context/QueueContext';
import { useLanguage } from '../context/LanguageContext';

export const DoctorsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { doctors, patients, setDoctorAvailability, callPatient, markNoShow } = useQueue();
  const { t, translateStatus, translatePriority, translateDepartment } = useLanguage();

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorMeta | null>(null);
  const [rosterTab, setRosterTab] = useState<'active' | 'completed' | 'no_show'>('active');
  const [modalSearch, setModalSearch] = useState('');

  const handleToggleStatus = (doctorId: number, newStatus: DoctorMeta['availability']) => {
    setDoctorAvailability(doctorId, newStatus);
    const doc = doctors.find((d) => d.id === doctorId);
    if (doc) {
      addNotification('Doctor Status Updated', `${doc.name} marked as ${newStatus.replace('_', ' ')}`, 'info');
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase()) ||
      d.room.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || d.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const currentSelectedDoc = selectedDoctor ? doctors.find((d) => d.id === selectedDoctor.id) || selectedDoctor : null;

  const docWaiting = currentSelectedDoc
    ? patients.filter((p) => p.doctorId === currentSelectedDoc.id && p.status === 'WAITING')
    : [];
  const docInProgress = currentSelectedDoc
    ? patients.find((p) => p.doctorId === currentSelectedDoc.id && p.status === 'IN_PROGRESS')
    : null;
  const docCompleted = currentSelectedDoc
    ? patients.filter((p) => p.doctorId === currentSelectedDoc.id && p.status === 'COMPLETED')
    : [];
  const docNoShow = currentSelectedDoc
    ? patients.filter((p) => p.doctorId === currentSelectedDoc.id && p.status === 'NO_SHOW')
    : [];

  const filterPatientList = (list: AppPatient[]) => {
    if (!modalSearch.trim()) return list;
    const q = modalSearch.toLowerCase();
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.token.toLowerCase().includes(q) || p.priority.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="clinical-card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-display font-bold text-slate-900 dark:text-white">
            {t('doctors.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('doctors.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="All">{t('common.all_clinics')}</option>
            <option value="General Medicine">{translateDepartment('General Medicine')}</option>
            <option value="Cardiology">{translateDepartment('Cardiology')}</option>
            <option value="Pediatrics">{translateDepartment('Pediatrics')}</option>
            <option value="Orthopedics">{translateDepartment('Orthopedics')}</option>
            <option value="Dermatology">{translateDepartment('Dermatology')}</option>
          </select>

          <div className="flex items-center space-x-2 relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctor or clinic..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-teal-500 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Doctor Cards Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDoctors.map((d) => {
          const waitingQueue = patients.filter((p) => p.doctorId === d.id && p.status === 'WAITING');
          const inRoomPatient = patients.find((p) => p.doctorId === d.id && p.status === 'IN_PROGRESS');

          return (
            <div
              key={d.id}
              onClick={() => {
                setSelectedDoctor(d);
                setRosterTab('active');
                setModalSearch('');
              }}
              className="clinical-card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4 hover:border-teal-500/50 hover:shadow-md transition-all shadow-subtle cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {d.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {translateDepartment(d.department)}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {d.room}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-750">
                  <span className="text-[10px] text-slate-400 font-bold block">{t('doctors.queue_load')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {waitingQueue.length} {waitingQueue.length === 1 ? t('common.patient') : t('common.patients')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-750">
                  <span className="text-[10px] text-slate-400 font-bold block">{t('doctors.target_pace_label')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{d.targetPace} {t('common.min')}</span>
                </div>
              </div>

              {/* Current Patient & Status Switch */}
              <div
                className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-slate-400 block">{t('doctors.in_room_label')}</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400 truncate block">
                    {inRoomPatient ? `${inRoomPatient.token} (${inRoomPatient.name})` : t('doctor.room_empty')}
                  </span>
                </div>

                <select
                  value={d.availability}
                  onChange={(e) => handleToggleStatus(d.id, e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none flex-shrink-0"
                >
                  <option value="AVAILABLE">● {t('status.available')}</option>
                  <option value="BUSY">● {t('status.busy')}</option>
                  <option value="ON_BREAK">● {t('status.on_break')}</option>
                  <option value="OFFLINE">● {t('status.offline')}</option>
                </select>
              </div>

              {/* Click to view patients banner */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-teal-600 dark:text-teal-400 font-semibold group-hover:underline">
                <span>{t('doctors.view_roster')} ({waitingQueue.length + (inRoomPatient ? 1 : 0)})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal: Doctor Assigned Patients Roster ─────────────────────── */}
      {selectedDoctor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedDoctor(null)}
        >
          <div
            className="clinical-card w-full max-w-2xl max-h-[85vh] flex flex-col p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-sm">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    {selectedDoctor.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {translateDepartment(selectedDoctor.department)} • {selectedDoctor.room} • {t('doctors.target_pace_label')}: {selectedDoctor.targetPace} {t('common.min')}/{t('common.patient')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setRosterTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    rosterTab === 'active'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('doctors.active_tab')} ({docWaiting.length + (docInProgress ? 1 : 0)})
                </button>
                <button
                  onClick={() => setRosterTab('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    rosterTab === 'completed'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('doctors.completed_tab')} ({docCompleted.length})
                </button>
                <button
                  onClick={() => setRosterTab('no_show')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    rosterTab === 'no_show'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('doctors.noshow_tab')} ({docNoShow.length})
                </button>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Filter patient name, token..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Body: Active Tab View */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {rosterTab === 'active' && (
                <div className="space-y-4">
                  {/* Currently in Room */}
                  {docInProgress && (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                          ● {t('doctor.in_room')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          {translatePriority(docInProgress.priority)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                            {docInProgress.token}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {docInProgress.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-mono">{docInProgress.phone}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="text-slate-400">Check-in: {docInProgress.checkInTime}</p>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Session in progress</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Waiting Queue List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {t('doctor.upcoming_queue')} ({docWaiting.length})
                    </h4>
                    {filterPatientList(docWaiting).length > 0 ? (
                      <div className="space-y-2">
                        {filterPatientList(docWaiting).map((p, idx) => (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center space-x-2">
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
                                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{p.phone}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="text-right text-[11px]">
                                <span className="font-semibold text-teal-600 dark:text-teal-400 block">
                                  {p.etaMinutes} {t('common.min')}
                                </span>
                                <span className="text-slate-400 text-[10px]">Arr: {p.checkInTime}</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => {
                                    callPatient(p.id);
                                    addNotification('Patient Called', `Called ${p.token} (${p.name}) to ${selectedDoctor.room}`, 'info');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold transition-colors flex items-center space-x-1"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>{t('doctor.call_btn')}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    markNoShow(p.id);
                                    addNotification('Patient Marked No-Show', `${p.token} marked as absent.`, 'alert');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:text-rose-600 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                                >
                                  <UserX className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        {docInProgress ? 'No other patients currently waiting in queue.' : 'No patients currently queued for this doctor.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Completed Tab View */}
              {rosterTab === 'completed' && (
                <div className="space-y-2">
                  {filterPatientList(docCompleted).length > 0 ? (
                    filterPatientList(docCompleted).map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{p.token}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.phone} • Check-in: {p.checkInTime}</p>
                        </div>
                        <div className="text-right text-[11px]">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                            ● Completed
                          </span>
                          {p.completedAt && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">Finished: {p.completedAt}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No completed consultations recorded for this doctor today.
                    </p>
                  )}
                </div>
              )}

              {/* No-Shows Tab View */}
              {rosterTab === 'no_show' && (
                <div className="space-y-2">
                  {filterPatientList(docNoShow).length > 0 ? (
                    filterPatientList(docNoShow).map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-rose-900 dark:text-rose-200">{p.token}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.phone} • Check-in: {p.checkInTime}</p>
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                          ● No-Show
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No absent/no-show patients recorded for this doctor today.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {t('doctors.total_assigned')} <b>{docWaiting.length + (docInProgress ? 1 : 0) + docCompleted.length + docNoShow.length}</b>
              </span>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
