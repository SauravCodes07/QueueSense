import React, { useState } from 'react';
import {
  Stethoscope,
  Building,
  Activity,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  UserCheck,
  Users,
  ChevronRight,
  X,
  AlertTriangle,
  History,
  PhoneCall,
  UserX,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useQueue, DoctorMeta, AppPatient } from '../context/QueueContext';

export const DoctorsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { doctors, patients, setDoctorAvailability, callPatient, markNoShow } = useQueue();

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

  // Get active doctor's patient groups
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
            Specialist Directory & Duty Roster
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clinician room assignments, real-time consultation velocity, and active availability
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="All">All Clinics</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Dermatology">Dermatology</option>
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
                      {d.department}
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
                  <span className="text-[10px] text-slate-400 font-bold block">QUEUE LOAD</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {waitingQueue.length} {waitingQueue.length === 1 ? 'Patient' : 'Patients'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-750">
                  <span className="text-[10px] text-slate-400 font-bold block">TARGET PACE</span>
                  <span className="font-bold text-slate-900 dark:text-white">{d.targetPace} min</span>
                </div>
              </div>

              {/* Current Patient & Status Switch */}
              <div
                className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-slate-400 block">IN ROOM</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400 truncate block">
                    {inRoomPatient ? `${inRoomPatient.token} (${inRoomPatient.name})` : 'Room Empty'}
                  </span>
                </div>

                <select
                  value={d.availability}
                  onChange={(e) => handleToggleStatus(d.id, e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none flex-shrink-0"
                >
                  <option value="AVAILABLE">● Available</option>
                  <option value="BUSY">● With Patient</option>
                  <option value="ON_BREAK">● On Break</option>
                  <option value="OFFLINE">● Offline</option>
                </select>
              </div>

              {/* Click prompt */}
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center justify-end space-x-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View Assigned Patients</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Doctor-Specific Patient Roster Modal ──────────────────────── */}
      {currentSelectedDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedDoctor(null)}
        >
          <div
            className="clinical-card w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-base shadow-sm">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                      {currentSelectedDoc.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {currentSelectedDoc.room}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentSelectedDoc.department} • Pace: {currentSelectedDoc.targetPace} min/patient • Assigned Patient Roster
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header: Tabs & Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setRosterTab('active')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    rosterTab === 'active'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Active Queue ({docWaiting.length + (docInProgress ? 1 : 0)})
                </button>
                <button
                  onClick={() => setRosterTab('completed')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    rosterTab === 'completed'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Completed History ({docCompleted.length})
                </button>
                {docNoShow.length > 0 && (
                  <button
                    onClick={() => setRosterTab('no_show')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      rosterTab === 'no_show'
                        ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    No-Shows ({docNoShow.length})
                  </button>
                )}
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Filter patients by name or token..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Body / Table View */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: ACTIVE PATIENTS */}
              {rosterTab === 'active' && (
                <div className="space-y-4">
                  {/* Currently In Room */}
                  {docInProgress && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                            CURRENTLY IN CONSULTATION ROOM
                          </span>
                          <p className="font-display font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                            <span className="font-mono">{docInProgress.token}</span> — {docInProgress.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Check-in: {docInProgress.checkInTime} • Priority: {docInProgress.priority} • Contact: {docInProgress.phone}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                        In Session
                      </span>
                    </div>
                  )}

                  {/* Waiting Queue Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Upcoming Waiting Queue (Ordered: Emergency → Urgent → Routine)
                    </h4>

                    {filterPatientList(docWaiting).length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              <th className="py-2.5 px-4">POS</th>
                              <th className="py-2.5 px-4">TOKEN</th>
                              <th className="py-2.5 px-4">PATIENT NAME</th>
                              <th className="py-2.5 px-4">CONTACT</th>
                              <th className="py-2.5 px-4">PRIORITY</th>
                              <th className="py-2.5 px-4">CHECK-IN</th>
                              <th className="py-2.5 px-4">EST. WAIT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filterPatientList(docWaiting).map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-400">#{p.position}</td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{p.token}</td>
                                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{p.phone}</td>
                                <td className="py-3 px-4">
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
                                <td className="py-3 px-4 text-slate-500">{p.checkInTime}</td>
                                <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{p.etaMinutes} min</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        No active waiting patients currently assigned to {currentSelectedDoc.name}.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: COMPLETED PATIENTS */}
              {rosterTab === 'completed' && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Consultation History for {currentSelectedDoc.name}
                  </h4>

                  {filterPatientList(docCompleted).length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-2.5 px-4">TOKEN</th>
                            <th className="py-2.5 px-4">PATIENT NAME</th>
                            <th className="py-2.5 px-4">CONTACT</th>
                            <th className="py-2.5 px-4">PRIORITY</th>
                            <th className="py-2.5 px-4">CHECK-IN</th>
                            <th className="py-2.5 px-4">COMPLETED AT</th>
                            <th className="py-2.5 px-4 text-right">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {filterPatientList(docCompleted).map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{p.token}</td>
                              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{p.phone}</td>
                              <td className="py-3 px-4">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {p.priority}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">{p.checkInTime}</td>
                              <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">{p.completedAt || 'Recently'}</td>
                              <td className="py-3 px-4 text-right">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Completed
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      No completed consultations recorded yet for {currentSelectedDoc.name}.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: NO-SHOW PATIENTS */}
              {rosterTab === 'no_show' && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Absent / No-Show Records
                  </h4>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2.5 px-4">TOKEN</th>
                          <th className="py-2.5 px-4">PATIENT NAME</th>
                          <th className="py-2.5 px-4">CONTACT</th>
                          <th className="py-2.5 px-4">CHECK-IN</th>
                          <th className="py-2.5 px-4 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filterPatientList(docNoShow).map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{p.token}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{p.phone}</td>
                            <td className="py-3 px-4 text-slate-500">{p.checkInTime}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                No-Show
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Total Patients Assigned: <b>{docWaiting.length + (docInProgress ? 1 : 0) + docCompleted.length + docNoShow.length}</b>
              </span>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
