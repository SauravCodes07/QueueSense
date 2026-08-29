import React, { useState } from 'react';
import {
  Activity,
  LayoutGrid,
  Users,
  User,
  Stethoscope,
  BarChart3,
  Bell,
  Settings,
  Smartphone,
  Hospital,
  Zap,
  RefreshCw,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { NavSection } from '../types';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';
import { useNotifications } from '../context/NotificationContext';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenDemoControls: () => void;
  onSwitchToPatientView: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  waitingCount?: number;
  unreadNotificationCount?: number;
  onResetDemo?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  onOpenDemoControls,
  isCollapsed = false,
  onResetDemo,
}) => {
  const { user, signOut } = useAuth();
  const { patients } = useQueue();
  const { unreadCount } = useNotifications();
  const [isResetting, setIsResetting] = useState(false);

  const totalWaiting = patients.filter((p) => p.status === 'WAITING').length;

  const operationsItems: { id: NavSection; label: string; icon: React.ComponentType<any>; badge?: number; badgeColor?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'live_queues', label: 'Live Queue', icon: Users, badge: totalWaiting },
    { id: 'patients', label: 'Patients', icon: User },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount, badgeColor: 'bg-rose-500 text-white' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const dedicatedViews: { id: NavSection; label: string; sublabel: string; icon: React.ComponentType<any> }[] = [
    { id: 'patient_portal', label: 'Patient Portal', sublabel: 'Patient View', icon: Smartphone },
    { id: 'doctor_console', label: 'Doctor Console', sublabel: 'Live Room', icon: Activity },
    { id: 'admin_overview', label: 'Admin Overview', sublabel: 'Executive', icon: Hospital },
  ];

  const handleResetClick = async () => {
    setIsResetting(true);
    try {
      if (onResetDemo) {
        await onResetDemo();
      } else {
        await fetch('http://localhost:8000/api/v1/demo/reset', { method: 'POST' });
      }
    } catch (e) {
      console.warn('Demo reset error:', e);
    } finally {
      setTimeout(() => setIsResetting(false), 500);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 z-40 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* ── Top Brand Header ─────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => onSelectSection('overview')}
        >
          <div className="w-10 h-10 rounded-xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white truncate">
                  QueueSense
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Dynamic Outpatient Velocity
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable Navigation Sections ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* OPERATIONS SECTION */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              OPERATIONS
            </div>
          )}
          <div className="space-y-1">
            {operationsItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 shadow-sm border border-teal-200/60 dark:border-teal-800/60'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* DEDICATED VIEWS SECTION */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              DEDICATED VIEWS
            </div>
          )}
          <div className="space-y-1">
            {dedicatedViews.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 shadow-sm border border-teal-200/60 dark:border-teal-800/60'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {item.sublabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ⚡ Interactive Demo Engine Card (from Screenshot 1, 3, 4) */}
        {!isCollapsed && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 text-xs space-y-2.5">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-slate-200 text-[11px]">
              <span className="text-amber-500">⚡</span>
              <span>Interactive Demo Engine</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Test real-time ETA updates by adding emergencies, doctor delays, or completing visits.
            </p>
            <button
              onClick={handleResetClick}
              disabled={isResetting}
              className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all shadow-subtle flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset Demo State</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Footer Telemetry & User Card ────────────────────────────── */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
        {!isCollapsed && (
          <div className="px-2 space-y-0.5">
            <div className="flex items-center space-x-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All systems operational</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              ⚡ Velocity ETA Engine v2.4
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750">
          <div className="flex items-center space-x-2.5 min-w-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-teal-500/40 shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {getInitials(user?.name || 'OPD Operations')}
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user?.name || 'OPD Operations'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.role === 'DOCTOR' ? 'Doctor / Clinician' : user?.role === 'PATIENT' ? 'Patient Portal' : 'Desk Lead • Admin'}
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
