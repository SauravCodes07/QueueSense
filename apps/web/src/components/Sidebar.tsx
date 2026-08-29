import React, { useState } from 'react';
import {
  Activity,
  LayoutGrid,
  Users,
  Stethoscope,
  ArrowRightLeft,
  AlertTriangle,
  UserX,
  ShieldCheck,
  BarChart3,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Sparkles,
  UserCircle,
  Building,
} from 'lucide-react';
import { NavSection } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenDemoControls: () => void;
  onSwitchToPatientView: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  onOpenDemoControls,
  onSwitchToPatientView,
  isCollapsed = false,
}) => {
  const { user, loginAs } = useAuth();
  const [selectedHospital, setSelectedHospital] = useState('City Care Hospital');
  const [isHospitalDropdownOpen, setIsHospitalDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const mainNavItems: { id: NavSection; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'live_queues', label: 'Live Queues', icon: Users },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
    { id: 'workload', label: 'Workload', icon: Activity },
    { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    { id: 'priority_alerts', label: 'Priority & Alerts', icon: AlertTriangle },
    { id: 'no_shows', label: 'No-Shows', icon: UserX },
    { id: 'audit_trail', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const systemNavItems: { id: NavSection; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'users', label: 'Users', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside
      className={`bg-slate-900 dark:bg-slate-950 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 transition-all duration-200 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* ── Brand Header ────────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 flex-shrink-0">
            <Activity className="w-4 h-4 text-white animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base text-white tracking-tight leading-none">
                Queue<span className="text-emerald-400">Sense</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight truncate mt-1">
                Dynamic Outpatient Velocity & Wait-Time Tracker
              </p>
            </div>
          )}
        </div>

        {/* Hospital Switcher Pill Dropdown */}
        {!isCollapsed && (
          <div className="relative mt-4">
            <button
              onClick={() => setIsHospitalDropdownOpen(!isHospitalDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-white transition-colors"
            >
              <div className="flex items-center space-x-2 truncate">
                <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{selectedHospital}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </button>

            {isHospitalDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 p-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5 animate-in fade-in">
                {['City Care Hospital', 'Apex Health Medical Center', 'Metro General OPD'].map((h) => (
                  <button
                    key={h}
                    onClick={() => {
                      setSelectedHospital(h);
                      setIsHospitalDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${
                      selectedHospital === h
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation Links ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* MAIN Section */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Main
            </div>
          )}
          <div className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* SYSTEM Section */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              System
            </div>
          )}
          <div className="space-y-1">
            {systemNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dedicated Patient Portal & Demo Launcher Strip */}
        <div className="pt-2 border-t border-slate-800 space-y-1">
          <button
            onClick={onSwitchToPatientView}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 transition-all"
            title="Switch to Patient Wait Tracker"
          >
            <UserCircle className="w-4 h-4 flex-shrink-0 text-teal-400" />
            {!isCollapsed && <span className="truncate">Patient Wait View</span>}
          </button>

          <button
            onClick={onOpenDemoControls}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
            title="Incident Simulation Sandbox"
          >
            <Sparkles className="w-4 h-4 flex-shrink-0 text-indigo-400" />
            {!isCollapsed && <span className="truncate">Incident Simulator</span>}
          </button>
        </div>
      </div>

      {/* ── User Profile Footer Card ─────────────────────────────────── */}
      <div className="p-3 border-t border-slate-800 relative">
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors text-left"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-700/80 text-emerald-200 border border-emerald-500/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {getInitials(user?.name || 'Arjun Singh')}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || 'Arjun Singh'}
                </p>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {user?.role === 'DOCTOR' ? 'Clinician' : user?.role === 'RECEPTION' ? 'Reception Staff' : 'Admin • Super Admin'}
                  </span>
                </div>
              </div>
            )}
          </div>
          {!isCollapsed && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
        </button>

        {isUserMenuOpen && !isCollapsed && (
          <div className="absolute bottom-full left-3 right-3 mb-2 p-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 text-xs space-y-1 animate-in fade-in">
            <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400">
              Switch User Persona
            </div>
            <button
              onClick={() => { loginAs('admin'); setIsUserMenuOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              Arjun Singh (Super Admin)
            </button>
            <button
              onClick={() => { loginAs('sharma'); setIsUserMenuOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              Dr. Priya Sharma (General)
            </button>
            <button
              onClick={() => { loginAs('mehta'); setIsUserMenuOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              Dr. Raj Mehta (Cardio)
            </button>
            <button
              onClick={() => { loginAs('patel'); setIsUserMenuOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              Dr. Anita Patel (Paeds)
            </button>
            <button
              onClick={() => { loginAs('reception'); setIsUserMenuOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              Reception Front Desk
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
