import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  UserX,
  RotateCcw,
  Sparkles,
  Brain,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiAdmin } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { MLStatus } from '../types';

interface DemoControlBarProps {
  onStateMutated?: () => void;
  activeDoctorId: number;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({
  onStateMutated,
  activeDoctorId,
}) => {
  const { addNotification } = useNotifications();
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isWorking, setIsWorking] = useState<string | null>(null);

  const fetchMLStatus = async () => {
    try {
      const s = await apiAdmin.getMLStatus();
      setMlStatus(s);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMLStatus();
  }, []);

  const handleTriggerEmergency = async () => {
    setIsWorking('emergency');
    try {
      const res = await apiAdmin.triggerEmergencyIncident(activeDoctorId);
      addNotification(
        '🚨 Demo Emergency Triggered',
        `Patient ${res.patient_token || 'next in line'} marked as EMERGENCY. Queue reordered immediately.`,
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
        '🚫 Demo No-Show Confirmed',
        `Patient ${res.patient_token || 'first waiting'} confirmed NO-SHOW. Downstream ETAs reduced.`,
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
        newEnabled ? '🧠 ML Prediction Active' : '🛡️ Fallback to EMA Baseline',
        newEnabled
          ? 'GradientBoostingRegressor model active for duration predictions.'
          : 'ML intentionally disabled. Pure EMA baseline seamless fallback verified with 0 downtime.',
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
    <aside aria-label="Demo Incident Controls" className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/30 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 gap-2">
          {/* Header pill */}
          <div className="flex items-center space-x-2 min-w-0">
            <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center truncate">
              <Sparkles className="w-3.5 h-3.5 mr-1 flex-shrink-0" /> Live Demo Controls
            </span>
            <span className="hidden md:inline-block text-xs text-slate-400 truncate">
              | Test real-time recalculations & ML fallback
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-indigo-300 hover:text-white flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 min-h-[36px]"
          >
            <span>{isExpanded ? 'Hide' : 'Show Controls'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="pb-3 pt-1 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {/* Trigger Emergency Button */}
            <button
              onClick={handleTriggerEmergency}
              disabled={isWorking !== null}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-medium border border-rose-400/30 shadow-sm transition-all active:scale-95 disabled:opacity-50 min-h-[40px]"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-200 flex-shrink-0" />
              <span className="truncate">{isWorking === 'emergency' ? 'Triggering...' : 'Emergency'}</span>
            </button>

            {/* Trigger No-Show Button */}
            <button
              onClick={handleTriggerNoShow}
              disabled={isWorking !== null}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-medium border border-amber-400/30 shadow-sm transition-all active:scale-95 disabled:opacity-50 min-h-[40px]"
            >
              <UserX className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
              <span className="truncate">{isWorking === 'noshow' ? 'Processing...' : 'No-Show'}</span>
            </button>

            {/* ML Toggle Button */}
            <button
              onClick={handleToggleML}
              disabled={isWorking !== null}
              className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border shadow-sm transition-all active:scale-95 disabled:opacity-50 min-h-[40px] ${
                mlStatus?.is_enabled
                  ? 'bg-purple-600/90 hover:bg-purple-600 text-white border-purple-400/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600/40'
              }`}
            >
              {mlStatus?.is_enabled ? (
                <Brain className="w-3.5 h-3.5 text-purple-200 flex-shrink-0" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              )}
              <span className="truncate">
                {isWorking === 'ml'
                  ? 'Switching...'
                  : mlStatus?.is_enabled
                  ? 'ML Active (Click for EMA)'
                  : 'EMA Active (Click for ML)'}
              </span>
            </button>

            {/* Reset Demo State Button */}
            <button
              onClick={handleResetDemo}
              disabled={isWorking !== null}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-600/40 shadow-sm transition-all active:scale-95 disabled:opacity-50 sm:ml-auto min-h-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{isWorking === 'reset' ? 'Resetting...' : 'Reset Demo'}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
