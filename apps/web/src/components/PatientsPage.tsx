import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Plus,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
  X,
  RefreshCw,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useQueue } from '../context/QueueContext';

export const PatientsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { patients, doctors, registerPatient } = useQueue();

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New patient form fields
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDept, setNewDept] = useState('General Medicine');
  const [newDoctorId, setNewDoctorId] = useState<number>(1);
  const [newPriority, setNewPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');

  const handleDeptChange = (dept: string) => {
    setNewDept(dept);
    const matchingDoc = doctors.find((d) => d.department === dept);
    if (matchingDoc) setNewDoctorId(matchingDoc.id);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await registerPatient({
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        department: newDept,
        doctorId: newDoctorId,
        priority: newPriority,
      });

      setIsRegisterModalOpen(false);
      setNewName('');
      setNewPhone('');
      addNotification(
        'Patient Registered & Queued',
        `Token ${created.token} assigned to ${created.name} (Assigned to ${created.doctorName} in ${created.department}).`,
        'success'
      );
    } catch (err) {
      console.warn('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.token.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.doctorName.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || p.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Action Header */}
      <div className="clinical-card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-display font-bold text-slate-900 dark:text-white">
            Patients Roster & Enrollment
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Outpatient directory, token allocations, and real-time clinical assignments
          </p>
        </div>

        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center space-x-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register Walk-In Patient</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 max-w-md relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name, token, doctor, or phone..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-subtle"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Department:</span>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none shadow-subtle"
          >
            <option value="All">All Clinics</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Dermatology">Dermatology</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="clinical-card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-5">TOKEN</th>
                <th className="py-3 px-4">PATIENT NAME</th>
                <th className="py-3 px-4">PHONE</th>
                <th className="py-3 px-4">CLINIC / DEPT</th>
                <th className="py-3 px-4">ASSIGNED DOCTOR</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">PRIORITY</th>
                <th className="py-3 px-5">CHECK-IN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">{p.token}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{p.phone}</td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">{p.department}</td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">{p.doctorName}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.status === 'IN_PROGRESS'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                          : p.status === 'COMPLETED'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : p.status === 'NO_SHOW'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200'
                          : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200'
                      }`}
                    >
                      {p.status === 'IN_PROGRESS' ? '● In Consultation' : p.status === 'WAITING' ? '● Waiting in Queue' : p.status === 'NO_SHOW' ? '● No-Show' : 'Completed'}
                    </span>
                  </td>
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
                      {p.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500">{p.checkInTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Walk-In Patient Registration Modal ───────────────────────── */}
      {isRegisterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsRegisterModalOpen(false)}
        >
          <div
            className="clinical-card w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Register Walk-In Patient
                </h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sneha Patil"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department *
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Dermatology">Dermatology</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Doctor *
                  </label>
                  <select
                    value={newDoctorId}
                    onChange={(e) => setNewDoctorId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    {doctors
                      .filter((d) => d.department === newDept)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.room})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Triage Priority Tier
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="ROUTINE">Routine (Standard Queue)</option>
                  <option value="URGENT">Urgent (Priority Intake)</option>
                  <option value="EMERGENCY">Emergency (Immediate Escalation)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Issuing Token...' : 'Issue Token & Enroll in Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
