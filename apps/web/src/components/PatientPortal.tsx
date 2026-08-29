import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ChevronDown,
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  Activity,
  Calendar,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PatientOption {
  token: string;
  name: string;
  department: string;
  position: number;
  checkInTime: string;
  waitMinutes: number;
  doctorName: string;
  doctorTitle: string;
  room: string;
  expectedTime: string;
  step: number; // 1 to 5
}

interface PatientPortalProps {
  lastEventTime?: number;
  initialToken?: string;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  lastEventTime,
  initialToken = 'GM-104',
}) => {
  const { patientToken, setPatientToken } = useAuth();

  const patientsList: PatientOption[] = [
    {
      token: 'GM-104',
      name: 'Sneha Patil',
      department: 'General Medicine',
      position: 4,
      checkInTime: '09:54',
      waitMinutes: 36,
      doctorName: 'Dr. Anjali Sharma',
      doctorTitle: 'Senior Consultant Physician',
      room: 'Room 101',
      expectedTime: '10:52 AM',
      step: 3,
    },
    {
      token: 'PD-202',
      name: 'Aarav Verma',
      department: 'Pediatrics',
      position: 2,
      checkInTime: '10:05',
      waitMinutes: 14,
      doctorName: 'Dr. Anita Patel',
      doctorTitle: 'Pediatric Specialist',
      room: 'Room 201',
      expectedTime: '10:30 AM',
      step: 3,
    },
    {
      token: 'CD-301',
      name: 'Rohan Gupta',
      department: 'Cardiology',
      position: 1,
      checkInTime: '09:30',
      waitMinutes: 5,
      doctorName: 'Dr. Raj Mehta',
      doctorTitle: 'Senior Cardiologist',
      room: 'Room 301',
      expectedTime: '10:20 AM',
      step: 4,
    },
    {
      token: 'GM-101',
      name: 'Pooja Iyer',
      department: 'General Medicine',
      position: 0,
      checkInTime: '09:15',
      waitMinutes: 0,
      doctorName: 'Dr. Anjali Sharma',
      doctorTitle: 'Senior Consultant Physician',
      room: 'Room 101',
      expectedTime: '10:15 AM',
      step: 5,
    },
  ];

  const [selectedToken, setSelectedToken] = useState<string>(initialToken || patientToken || 'GM-104');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (initialToken) setSelectedToken(initialToken);
  }, [initialToken]);

  const activePatient = patientsList.find((p) => p.token === selectedToken) || patientsList[0];

  const handleSelectPatient = (token: string) => {
    setSelectedToken(token);
    setPatientToken(token);
    setIsDropdownOpen(false);
  };

  const steps = [
    { num: 1, title: 'Checked In', sub: 'Arrival confirmed' },
    { num: 2, title: 'Token Active', sub: 'Position assigned' },
    { num: 3, title: 'Waiting', sub: 'In OPD queue' },
    { num: 4, title: 'Consultation', sub: 'With doctor' },
    { num: 5, title: 'Completed', sub: 'Prescription ready' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-150">
      {/* ── Top Bar Header (Screenshot 3) ───────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-subtle">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Patient Live Tracker View</span>
          <span className="text-slate-400 font-normal">• Mobile Self-Service</span>
        </div>

        {/* Switch View Dropdown (Screenshot 3) */}
        <div className="relative">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Switch View:</span>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-750 font-bold text-slate-800 dark:text-slate-200 transition-colors border border-slate-200/80 dark:border-slate-700"
            >
              <span className="truncate max-w-[240px]">
                {activePatient.token} — {activePatient.name} ({activePatient.department} • #{activePatient.position})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </button>
          </div>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-xs space-y-1 animate-in fade-in">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400">
                Select Active Patient Ticket
              </div>
              {patientsList.map((p) => (
                <button
                  key={p.token}
                  onClick={() => handleSelectPatient(p.token)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
                    p.token === activePatient.token
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {p.token} — {p.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {p.department} • Queue #{p.position} ({p.waitMinutes} min)
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Patient Status Card (Screenshot 3) ─────────────────── */}
      <div className="clinical-card overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md">
        {/* Dark Navy Header Card */}
        <div className="bg-[#0f172a] text-white p-6 sm:p-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-xs text-white">
                QS
              </div>
              <span className="font-display font-bold text-base tracking-tight text-white">
                QueueSense
              </span>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-800/90 text-teal-300 border border-slate-700 text-[11px] font-semibold">
              Live OPD Tracker
            </span>
          </div>

          <div className="pt-2">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
              YOUR QUEUE STATUS
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight mt-0.5">
              {activePatient.name}
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              {activePatient.department} • Check-in: {activePatient.checkInTime}
            </p>
          </div>
        </div>

        {/* Inner Card Content */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* 3 Big Metric Pills (Screenshot 3) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {/* Token */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                YOUR TOKEN
              </span>
              <div className="text-xl sm:text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {activePatient.token}
              </div>
            </div>

            {/* Position */}
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/70 text-center space-y-1">
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                QUEUE POSITION
              </span>
              <div className="text-xl sm:text-2xl font-display font-bold text-teal-600 dark:text-teal-300">
                #{activePatient.position}
              </div>
            </div>

            {/* Estimated Wait */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ESTIMATED WAIT
              </span>
              <div className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
                {activePatient.waitMinutes} <span className="text-sm font-normal text-slate-400">min</span>
              </div>
            </div>
          </div>

          {/* Two Info Cards: Assigned Doctor & Expected Consultation Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Doctor Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned Doctor
                </span>
                <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                  {activePatient.doctorName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {activePatient.doctorTitle} • {activePatient.room}
                </p>
              </div>
            </div>

            {/* Expected Time Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Expected Consultation Time
                </span>
                <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                  {activePatient.expectedTime}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                  Status: On schedule
                </p>
              </div>
            </div>
          </div>

          {/* ── CONSULTATION JOURNEY 5-Step Stepper (Screenshot 3) ── */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 space-y-4">
            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider block">
              CONSULTATION JOURNEY
            </span>

            <div className="grid grid-cols-5 gap-2 relative">
              {steps.map((s, idx) => {
                const isCompleted = s.num < activePatient.step;
                const isCurrent = s.num === activePatient.step;
                return (
                  <div key={s.num} className="flex flex-col items-center text-center relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                        isCompleted
                          ? 'bg-teal-600 text-white'
                          : isCurrent
                          ? 'bg-white dark:bg-slate-900 border-2 border-teal-600 text-teal-600 dark:text-teal-400 ring-4 ring-teal-100 dark:ring-teal-950'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 animate-spin-slow" />
                      ) : (
                        <span>{s.num}</span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] font-bold mt-2 truncate w-full ${
                        isCompleted || isCurrent
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {s.title}
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate w-full">
                      {s.sub}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Informational Disclaimer (Screenshot 3) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start space-x-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <span>
              ETAs are computed dynamically using rolling doctor velocity and active room progress. Times are approximate.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
