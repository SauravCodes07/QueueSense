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
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useQueue } from '../context/QueueContext';

export const DoctorsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { doctors, patients, setDoctorAvailability } = useQueue();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');

  const handleToggleStatus = (doctorId: number, newStatus: any) => {
    setDoctorAvailability(doctorId, newStatus);
    const doc = doctors.find((d) => d.id === doctorId);
    if (doc) {
      addNotification('Doctor Status Updated', `${doc.name} marked as ${newStatus.replace('_', ' ')}`, 'info');
    }
  };

  const filtered = doctors.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase()) ||
      d.room.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || d.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
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

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => {
          const waitingQueue = patients.filter((p) => p.doctorId === d.id && p.status === 'WAITING');
          const inRoomPatient = patients.find((p) => p.doctorId === d.id && p.status === 'IN_PROGRESS');

          return (
            <div
              key={d.id}
              className="clinical-card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4 hover:border-teal-500/50 transition-all shadow-subtle"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">
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
                  <span className="font-bold text-slate-900 dark:text-white">{waitingQueue.length} Patients</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-750">
                  <span className="text-[10px] text-slate-400 font-bold block">TARGET PACE</span>
                  <span className="font-bold text-slate-900 dark:text-white">{d.targetPace} min</span>
                </div>
              </div>

              {/* Current Patient & Status Switch */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block">IN ROOM</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400 truncate">
                    {inRoomPatient ? `${inRoomPatient.token} (${inRoomPatient.name})` : 'Room Empty'}
                  </span>
                </div>

                <select
                  value={d.availability}
                  onChange={(e) => handleToggleStatus(d.id, e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="AVAILABLE">● Available</option>
                  <option value="BUSY">● With Patient</option>
                  <option value="ON_BREAK">● On Break</option>
                  <option value="OFFLINE">● Offline</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
