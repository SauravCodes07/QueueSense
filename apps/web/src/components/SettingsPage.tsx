import React, { useState } from 'react';
import {
  Building,
  Activity,
  Stethoscope,
  Bell,
  Globe,
  Sun,
  Moon,
  CheckCircle2,
  Lock,
  ShieldAlert,
  Clock,
  Phone,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/sourceStrings';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t, translateDepartment } = useLanguage();

  const [activeTab, setActiveTab] = useState<'profile' | 'queue_policy' | 'clinics' | 'alerts' | 'display'>('profile');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Hospital Profile Form State
  const [hospitalName, setHospitalName] = useState('QueueSense Super-Speciality Hospital');
  const [campusCode, setCampusCode] = useState('QS-MUM-01 (Apex Wing)');
  const [accreditationCode, setAccreditationCode] = useState('NABH-QS-9042');
  const [helpdeskPhone, setHelpdeskPhone] = useState('+91 22 2650 0000');
  const [emergencyPhone, setEmergencyPhone] = useState('108 / +91 22 2650 9999');
  const [isEmergency247, setIsEmergency247] = useState(true);

  // Queue Policy Form State
  const [prioritizeEmergency, setPrioritizeEmergency] = useState(true);
  const [defaultTargetPace, setDefaultTargetPace] = useState(12);
  const [noShowGraceMinutes, setNoShowGraceMinutes] = useState(15);
  const [maxQueuePerShift, setMaxQueuePerShift] = useState(35);

  // Notifications State
  const [smsTokenCheckin, setSmsTokenCheckin] = useState(true);
  const [smsNextInLine, setSmsNextInLine] = useState(true);
  const [audioChimeOnCall, setAudioChimeOnCall] = useState(true);
  const [delayBroadcastEnabled, setDelayBroadcastEnabled] = useState(true);

  // RBAC Access Control Guard: Settings is available ONLY to Administrators
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="min-h-[450px] flex items-center justify-center p-6 animate-in fade-in">
        <div className="clinical-card max-w-md w-full p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Administrator Access Required
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Hospital Operations configuration and clinical triage policies are restricted to platform administrators.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Current Role: <b>{user.role}</b></span>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const languagesList: { id: Language; label: string; native: string }[] = [
    { id: 'en', label: 'English (Default)', native: 'English' },
    { id: 'hi', label: 'Hindi (National)', native: 'हिन्दी' },
    { id: 'mr', label: 'Marathi (Regional)', native: 'मराठी' },
  ];

  const hospitalTabs = [
    { id: 'profile', label: 'Hospital Facility', icon: Building },
    { id: 'queue_policy', label: 'Queue & Triage Policy', icon: Activity },
    { id: 'clinics', label: 'OPD Clinics & Rooms', icon: Stethoscope },
    { id: 'alerts', label: 'Patient Alerts & SMS', icon: Bell },
    { id: 'display', label: 'Localization & Theme', icon: Globe },
  ];

  const clinicsList = [
    { name: 'General Medicine', rooms: 'Room 101, Room 102', doctors: 'Dr. Priya Sharma', pace: 12, status: 'Active' },
    { name: 'Pediatrics', rooms: 'Room 201', doctors: 'Dr. Anita Patel', pace: 10, status: 'Active' },
    { name: 'Cardiology', rooms: 'Room 301', doctors: 'Dr. Raj Mehta', pace: 15, status: 'Active' },
    { name: 'Orthopedics', rooms: 'Room 401', doctors: 'Dr. Vikram Seth', pace: 14, status: 'Active' },
    { name: 'Dermatology', rooms: 'Room 501', doctors: 'Dr. Tanya Kapoor', pace: 10, status: 'Active' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-150">
      {/* ── Left Sidebar Navigation ──────────────────────────────────── */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-display font-bold text-slate-900 dark:text-white mb-3">
            {t('nav.settings')}
          </h2>
          <div className="space-y-1 text-xs">
            {hospitalTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shadow-sm border border-teal-200/60 dark:border-teal-800/60'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Settings Panel ───────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white">
              Hospital Operations Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure OPD departments, patient triage rules, SMS alerts, and clinical preferences
            </p>
          </div>
          {savedSuccess && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">Hospital settings updated.</span>
            </div>
          )}
        </div>

        {/* ── Tab 1: Hospital Facility Profile ── */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Hospital Facility Profile</h3>
                <p className="text-xs text-slate-400">General hospital credentials, accreditation, and outpatient contact lines</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block font-semibold text-slate-800 dark:text-slate-200">Hospital Full Name</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-800 dark:text-slate-200">Campus / Branch Unit</label>
                <input
                  type="text"
                  value={campusCode}
                  onChange={(e) => setCampusCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-800 dark:text-slate-200">Accreditation Code</label>
                <input
                  type="text"
                  value={accreditationCode}
                  onChange={(e) => setAccreditationCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-800 dark:text-slate-200">OPD Helpdesk Phone</label>
                <input
                  type="text"
                  value={helpdeskPhone}
                  onChange={(e) => setHelpdeskPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-800 dark:text-slate-200">Emergency & Trauma Hotline</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">24x7 Emergency OPD Status</p>
                <p className="text-[11px] text-slate-400">Keep emergency triage routing open 24 hours daily</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmergency247(!isEmergency247)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  isEmergency247 ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isEmergency247 ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab 2: Clinical Queue & Triage Policy ── */}
        {activeTab === 'queue_policy' && (
          <form onSubmit={handleSave} className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Queue & Triage Policy</h3>
                <p className="text-xs text-slate-400">Configure consultation velocities, priority bumping, and no-show releases</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Deterministic Triage Priority</p>
                  <p className="text-slate-400 mt-0.5">Always position Emergency & Urgent patients ahead of Routine walk-ins</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrioritizeEmergency(!prioritizeEmergency)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    prioritizeEmergency ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      prioritizeEmergency ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-800 dark:text-slate-200">Default Target Pace (Min/Patient)</label>
                  <select
                    value={defaultTargetPace}
                    onChange={(e) => setDefaultTargetPace(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value={10}>10 minutes</option>
                    <option value={12}>12 minutes (Standard)</option>
                    <option value={15}>15 minutes</option>
                    <option value={20}>20 minutes</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-800 dark:text-slate-200">No-Show Release Grace Period</label>
                  <select
                    value={noShowGraceMinutes}
                    onChange={(e) => setNoShowGraceMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes (Standard)</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-800 dark:text-slate-200">Max Queue Cap per Shift</label>
                  <input
                    type="number"
                    value={maxQueuePerShift}
                    onChange={(e) => setMaxQueuePerShift(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab 3: OPD Clinics & Room Allocation ── */}
        {activeTab === 'clinics' && (
          <div className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active OPD Clinics & Rooms</h3>
                <p className="text-xs text-slate-400">Assigned consultation chambers and target specialist speeds</p>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Specialty / Clinic</th>
                    <th className="py-2.5 px-3">Room Allocation</th>
                    <th className="py-2.5 px-3">Assigned Specialist</th>
                    <th className="py-2.5 px-3">Target Velocity</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {clinicsList.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{c.rooms}</td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200">{c.doctors}</td>
                      <td className="py-3 px-3 text-teal-600 dark:text-teal-400 font-semibold">{c.pace} min/pt</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 4: Patient Alerts & SMS Broadcast ── */}
        {activeTab === 'alerts' && (
          <form onSubmit={handleSave} className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Patient SMS & Notification Gateway</h3>
                <p className="text-xs text-slate-400">Automated mobile alerts and waiting room audio broadcast chimes</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Token Issuance SMS</p>
                  <p className="text-slate-400 mt-0.5">Send SMS with token number & live tracking link upon registration</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsTokenCheckin(!smsTokenCheckin)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    smsTokenCheckin ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${smsTokenCheckin ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">"Next in Line" Alert</p>
                  <p className="text-slate-400 mt-0.5">Notify patient when they reach position #2 in waiting queue</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsNextInLine(!smsNextInLine)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    smsNextInLine ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${smsNextInLine ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Audio Chime on Doctor Call</p>
                  <p className="text-slate-400 mt-0.5">Play audio announcement chime on waiting room display board</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAudioChimeOnCall(!audioChimeOnCall)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    audioChimeOnCall ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${audioChimeOnCall ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Emergency Delay Broadcast</p>
                  <p className="text-slate-400 mt-0.5">Broadcast ETA recalculation notification when emergency cases arrive</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDelayBroadcastEnabled(!delayBroadcastEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    delayBroadcastEnabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${delayBroadcastEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab 5: Localization & Clinical Theme ── */}
        {activeTab === 'display' && (
          <div className="space-y-5">
            {/* Multi-Language Selector Card */}
            <div className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {t('settings.language_title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('settings.language_desc')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {languagesList.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      language === l.id
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{l.native}</span>
                      {language === l.id && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{l.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Preference Card */}
            <div className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {t('settings.theme_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('settings.theme_desc')}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center space-x-2 cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
