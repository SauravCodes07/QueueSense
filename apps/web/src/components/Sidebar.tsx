import React from 'react';
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
  LogOut,
} from 'lucide-react';
import { NavSection } from '../types';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenDemoControls: () => void;
  onSwitchToPatientView?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  waitingCount?: number;
  unreadNotificationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed = false,
}) => {
  const { user, signOut } = useAuth();
  const { patients } = useQueue();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();

  const userRole = user?.role || 'ADMIN';
  const totalWaiting = patients.filter((p) => p.status === 'WAITING').length;

  // Role-Based Operations Navigation Items
  const allOperationsItems: {
    id: NavSection;
    labelKey: string;
    icon: React.ComponentType<any>;
    badge?: number;
    badgeColor?: string;
    roles: string[];
  }[] = [
    { id: 'overview', labelKey: 'nav.overview', icon: LayoutGrid, roles: ['ADMIN', 'RECEPTION'] },
    { id: 'live_queues', labelKey: 'nav.live_queues', icon: Users, badge: totalWaiting, roles: ['ADMIN', 'DOCTOR', 'RECEPTION'] },
    { id: 'patients', labelKey: 'nav.patients', icon: User, roles: ['ADMIN', 'DOCTOR', 'RECEPTION'] },
    { id: 'doctors', labelKey: 'nav.doctors', icon: Stethoscope, roles: ['ADMIN', 'DOCTOR', 'RECEPTION'] },
    { id: 'analytics', labelKey: 'nav.analytics', icon: BarChart3, roles: ['ADMIN'] },
    { id: 'notifications', labelKey: 'nav.notifications', icon: Bell, badge: unreadCount, badgeColor: 'bg-rose-500 text-white', roles: ['ADMIN', 'DOCTOR', 'RECEPTION'] },
    { id: 'settings', labelKey: 'nav.settings', icon: Settings, roles: ['ADMIN'] }, // Settings strictly ADMIN ONLY
  ];

  // Role-Based Dedicated Views
  const allDedicatedViews: {
    id: NavSection;
    labelKey: string;
    sublabelKey: string;
    icon: React.ComponentType<any>;
    roles: string[];
  }[] = [
    { id: 'doctor_console', labelKey: 'nav.doctor_console', sublabelKey: 'doctor.live_session', icon: Activity, roles: ['ADMIN', 'DOCTOR'] },
    { id: 'patient_portal', labelKey: 'nav.patient_portal', sublabelKey: 'portal.mobile_view', icon: Smartphone, roles: ['ADMIN', 'RECEPTION', 'PATIENT'] },
    { id: 'admin_overview', labelKey: 'nav.admin_overview', sublabelKey: 'overview.matrix_sub', icon: Hospital, roles: ['ADMIN'] },
  ];

  const operationsItems = allOperationsItems.filter((item) => item.roles.includes(userRole));
  const dedicatedViews = allDedicatedViews.filter((item) => item.roles.includes(userRole));

  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeLabel = (role: string) => {
    if (role === 'DOCTOR') return 'Doctor';
    if (role === 'RECEPTION') return 'Front Desk';
    if (role === 'ADMIN') return 'Admin Lead';
    return role;
  };

  const defaultHomeSection: NavSection =
    userRole === 'DOCTOR' ? 'doctor_console' : userRole === 'RECEPTION' ? 'live_queues' : 'overview';

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
          onClick={() => onSelectSection(defaultHomeSection)}
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
                  {getRoleBadgeLabel(userRole)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {t('landing.tagline')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable Navigation Sections ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* DEDICATED VIEWS SECTION (Prioritized for Clinicians & Focused Roles) */}
        {dedicatedViews.length > 0 && (
          <div>
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {t('nav.dedicated_views')}
              </div>
            )}
            <div className="space-y-1">
              {dedicatedViews.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const label = t(item.labelKey);
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSection(item.id)}
                    title={isCollapsed ? label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 shadow-sm border border-teal-200/60 dark:border-teal-800/60'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        {t(item.sublabelKey)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* OPERATIONS SECTION */}
        {operationsItems.length > 0 && (
          <div>
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {t('nav.operations')}
              </div>
            )}
            <div className="space-y-1">
              {operationsItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const label = t(item.labelKey);
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSection(item.id)}
                    title={isCollapsed ? label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 shadow-sm border border-teal-200/60 dark:border-teal-800/60'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
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
        )}
      </div>

      {/* ── User Footer ──────────────────────────────────────────────── */}
      {!isCollapsed && user && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-xl object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                {getInitials(user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            title={t('landing.signout')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
