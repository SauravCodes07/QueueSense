import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ChevronDown,
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';
import { useLanguage } from '../context/LanguageContext';

interface PatientPortalProps {
  lastEventTime?: number;
  initialToken?: string;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  initialToken = 'GM-104',
}) => {
  const { patientToken, setPatientToken } = useAuth();
  const { patients } = useQueue();
  const { t, translateDepartment, translatePriority } = useLanguage();

  const [selectedToken, setSelectedToken] = useState<string>(
    initialToken || patientToken || (patients[0] ? patients[0].token : 'GM-104')
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (initialToken) setSelectedToken(initialToken);
  }, [initialToken]);

  const activePatient = patients.find((p) => p.token.toLowerCase() === selectedToken.toLowerCase()) || patients[0];

  const handleSelectPatient = (token: string) => {
    setSelectedToken(token);
    setPatientToken(token);
    setIsDropdownOpen(false);
  };

  // Determine current step (1 to 5)
  const currentStep =
    !activePatient ? 1 :
    activePatient.status === 'COMPLETED' ? 5 :
    activePatient.status === 'IN_PROGRESS' ? 4 :
    activePatient.status === 'WAITING' ? 3 : 2;

  const steps = [
    { num: 1, title: t('portal.step1_title'), sub: t('portal.step1_sub') },
    { num: 2, title: t('portal.step2_title'), sub: t('portal.step2_sub') },
    { num: 3, title: t('portal.step3_title'), sub: t('portal.step3_sub') },
    { num: 4, title: t('portal.step4_title'), sub: t('portal.step4_sub') },
    { num: 5, title: t('portal.step5_title'), sub: t('portal.step5_sub') },
  ];

  if (!activePatient) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No active patient ticket selected.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-150">
      {/* ── Top Bar Header ───────────────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-subtle">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>{t('portal.header')}</span>
          <span className="text-slate-400 font-normal">• {t('portal.mobile_view')}</span>
        </div>

        {/* Dynamic Token Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <span>{t('portal.switch_view')}</span>
            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{activePatient.token}</span>
            <span className="text-slate-400">({activePatient.name})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 max-h-64 overflow-y-auto p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-xs space-y-0.5 animate-in fade-in">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400">
                {t('portal.select_ticket')}
              </div>
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p.token)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors ${
                    p.token === activePatient.token
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-mono font-bold block">{p.token}</span>
                    <span className="text-[11px] text-slate-400 truncate block">{p.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {p.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Mobile Ticket Card ──────────────────────────────────── */}
      <div className="clinical-card p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl space-y-6">
        {/* Top Status Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('portal.queue_status')}
            </span>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                {activePatient.status === 'IN_PROGRESS' ? t('status.in_consultation') : activePatient.status === 'COMPLETED' ? t('status.completed') : t('status.waiting')}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            {translateDepartment(activePatient.department)}
          </span>
        </div>

        {/* Big Ticket & ETA Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {/* Token */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('portal.your_token')}
            </span>
            <div className="text-3xl font-mono font-bold text-slate-900 dark:text-white mt-1">
              {activePatient.token}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">{activePatient.name}</span>
          </div>

          {/* Position */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('portal.queue_position')}
            </span>
            <div className="text-3xl font-mono font-bold text-teal-600 dark:text-teal-400 mt-1">
              {activePatient.position > 0 ? `#${activePatient.position}` : activePatient.status === 'IN_PROGRESS' ? 'NOW' : 'DONE'}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">{translatePriority(activePatient.priority)}</span>
          </div>

          {/* Wait Time */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('portal.est_wait')}
            </span>
            <div className="text-3xl font-mono font-bold text-slate-900 dark:text-white mt-1">
              ~{activePatient.etaMinutes} <span className="text-sm font-sans font-normal text-slate-400">{t('common.min')}</span>
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">Velocity-adjusted</span>
          </div>
        </div>

        {/* Clinician & Expected Call Time */}
        <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {activePatient.doctorName}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {translateDepartment(activePatient.department)} • {activePatient.doctorRoom}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              {t('portal.expected_time')}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {activePatient.expectedTime}
            </span>
          </div>
        </div>

        {/* ── 5-Step Consultation Journey Stepper ─────────────────────── */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('portal.journey_title')}
          </h3>

          <div className="relative">
            <div className="grid grid-cols-5 gap-2">
              {steps.map((step) => {
                const isPassed = currentStep >= step.num;
                const isCurrent = currentStep === step.num;

                return (
                  <div key={step.num} className="flex flex-col items-center text-center space-y-1.5 relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all z-10 ${
                        isCurrent
                          ? 'bg-teal-600 text-white ring-4 ring-teal-500/20 scale-110'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isPassed && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                    </div>

                    <div>
                      <p
                        className={`text-[11px] font-bold leading-tight ${
                          isCurrent
                            ? 'text-teal-600 dark:text-teal-400'
                            : isPassed
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[9px] text-slate-400 hidden sm:block leading-tight mt-0.5">
                        {step.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ETA Disclaimer Note */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
          <p>
            {t('portal.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
};
