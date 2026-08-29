import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  UserX,
  RotateCcw,
  Sparkles,
  Brain,
  Layers,
  X,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { apiAdmin } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { MLStatus } from '../types';

interface DemoControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDoctorId: number;
  onStateMutated?: () => void;
}

export const DemoControlModal: React.FC<DemoControlModalProps> = ({
  isOpen,
  onClose,
  activeDoctorId,
  onStateMutated,
}) => {
  const { addNotification } = useNotifications();
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null);
  const [isWorking, setIsWorking] = useState<string | null>(null);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchMLStatus = async () => {
    try {
      const s = await apiAdmin.getMLStatus();
      setMlStatus(s);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) fetchMLStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerEmergency = async () => {
    setIsWorking('emergency');
    try {
      const res = await apiAdmin.triggerEmergencyIncident(activeDoctorId);
      addNotification(
        '🚨 Emergency Incident Injected',
        `Patient ${res.patient_token || 'next in line'} escalated to EMERGENCY. Queue reordered immediately.`,
        'alert'
      );
      onStateMutated?.();
    } catch (err: any) {
      addNotification('Action Failed', err.message, 'warning');
    } finally {
      setIsWorking(null);
    }
  };

  const handleTriggerNoShow = async () => {
    setIsWorking('noshow');
    try {
      const res = await apiAdmin.triggerNoShowIncident(activeDoctorId);
      addNotification(
        '🚫 No-Show Injected',
        `Patient ${res.patient_token || 'first waiting'} confirmed NO-SHOW. Downstream ETAs recalculated.`,
        'info'
      );
      onStateMutated?.();
    } catch (err: any) {
      addNotification('Action Failed', err.message, 'warning');
    } finally {
      setIsWorking(null);
    }
  };

  const handleToggleML = async () => {
    setIsWorking('ml');
    try {
      const newEnabled = !mlStatus?.is_enabled;
      const res = await apiAdmin.toggleML(newEnabled);
      setMlStatus(res.metrics);
      addNotification(
        newEnabled ? '🧠 ML Regression Active' : '🛡️ Pure EMA Fallback Active',
        newEnabled
          ? 'GradientBoostingRegressor model active for duration predictions.'
          : 'ML disabled. Zero-downtime mathematical EMA baseline active.',
        'success'
      );
      onStateMutated?.();
    } catch (err: any) {
      addNotification('ML Toggle Failed', err.message, 'warning');
    } finally {
      setIsWorking(null);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all demo queue state to initial seed data?')) return;
    setIsWorking('reset');
    try {
      await apiAdmin.resetDemoData();
      addNotification('🔄 Demo State Reset', 'Database repopulated with clean initial demo dataset.', 'success');
      onStateMutated?.();
    } catch (err: any) {
      addNotification('Reset Failed', err.message, 'warning');
    } finally {
      setIsWorking(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="clinical-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                QueueSense Developer Sandbox
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulate real-time clinical incidents & test queue recalculations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sandbox Actions Grid */}
        <div className="space-y-4 text-xs">
          {/* Incident 1: Emergency Injection */}
          <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start justify-between gap-3">
            <div>
              <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Inject High-Acuity Emergency</span>
              </span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Escalates the next waiting patient in Dr. Sharma's queue to EMERGENCY, shifting downstream wait times.
              </p>
            </div>
            <button
              onClick={handleTriggerEmergency}
              disabled={isWorking !== null}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex-shrink-0 transition-all shadow-sm disabled:opacity-50 min-h-[38px]"
            >
              {isWorking === 'emergency' ? 'Injecting...' : 'Trigger'}
            </button>
          </div>

          {/* Incident 2: No-Show Confirmation */}
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start justify-between gap-3">
            <div>
              <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                <UserX className="w-4 h-4 text-amber-600" />
                <span>Simulate Patient No-Show</span>
              </span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Marks the first waiting patient as NO-SHOW, releasing queue capacity and decrementing downstream wait times.
              </p>
            </div>
            <button
              onClick={handleTriggerNoShow}
              disabled={isWorking !== null}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex-shrink-0 transition-all shadow-sm disabled:opacity-50 min-h-[38px]"
            >
              {isWorking === 'noshow' ? 'Processing...' : 'Trigger'}
            </button>
          </div>

          {/* Incident 3: Machine Learning Engine Toggle */}
          <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-start justify-between gap-3">
            <div>
              <span className="font-bold text-purple-800 dark:text-purple-300 flex items-center space-x-1.5">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>ML Prediction Model Toggle</span>
              </span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Currently: <strong>{mlStatus?.is_enabled ? 'GradientBoosting ML Active' : 'EMA Baseline Active'}</strong>. Tests zero-downtime mathematical fallback.
              </p>
            </div>
            <button
              onClick={handleToggleML}
              disabled={isWorking !== null}
              className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex-shrink-0 transition-all shadow-sm disabled:opacity-50 min-h-[38px]"
            >
              {isWorking === 'ml' ? 'Switching...' : mlStatus?.is_enabled ? 'Disable ML' : 'Enable ML'}
            </button>
          </div>

          {/* Incident 4: Clean Demo State Reset */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Reset Demo State</span>
              </span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Repopulates the database with initial doctors, queue tokens (`A-1`, `A-2`, `A-3`), and baseline parameters.
              </p>
            </div>
            <button
              onClick={handleResetDemo}
              disabled={isWorking !== null}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold flex-shrink-0 transition-all shadow-sm disabled:opacity-50 min-h-[38px]"
            >
              {isWorking === 'reset' ? 'Resetting...' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
