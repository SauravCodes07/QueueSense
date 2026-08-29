import React from 'react';
import {
  Activity,
  Users,
  Stethoscope,
  LayoutDashboard,
  BarChart3,
  Moon,
  Sun,
  Bell,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { SSEConnectionStatus } from '../services/sse';

interface HeaderProps {
  activeTab: 'patient' | 'doctor' | 'reception' | 'analytics';
  onTabChange: (tab: 'patient' | 'doctor' | 'reception' | 'analytics') => void;
  sseStatus: SSEConnectionStatus;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  sseStatus,
  onOpenNotifications,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, loginAs } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Product Title */}
          <div
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer min-w-0 flex-shrink-0"
            onClick={() => onTabChange('patient')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white truncate">
                  Queue<span className="text-emerald-600 dark:text-emerald-400">Sense</span>
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex-shrink-0">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> PS7
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:block truncate">
                Dynamic Outpatient Velocity & Wait-Time Tracker
              </p>
            </div>
          </div>

          {/* Desktop Center Navigation Tabs */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => onTabChange('patient')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'patient'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Patient Wait</span>
            </button>

            <button
              onClick={() => onTabChange('doctor')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'doctor'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Console</span>
            </button>

            <button
              onClick={() => onTabChange('reception')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'reception'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Live Board</span>
            </button>

            <button
              onClick={() => onTabChange('analytics')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics & Audit</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
            {/* Live SSE Status Pill */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                sseStatus === 'connected'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : sseStatus === 'reconnecting'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  sseStatus === 'connected'
                    ? 'text-emerald-500 animate-pulse'
                    : sseStatus === 'reconnecting'
                    ? 'text-amber-500 animate-spin'
                    : 'text-rose-500'
                }`}
              />
              <span className="capitalize">{sseStatus === 'connected' ? 'Live SSE' : sseStatus}</span>
            </div>

            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <select
                aria-label="Switch User Role Persona"
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[125px] sm:max-w-[170px] truncate"
                value={
                  user?.email === 'dr.sharma@queuesense.demo'
                    ? 'sharma'
                    : user?.email === 'dr.mehta@queuesense.demo'
                    ? 'mehta'
                    : user?.email === 'dr.patel@queuesense.demo'
                    ? 'patel'
                    : user?.role === 'RECEPTION'
                    ? 'reception'
                    : user?.role === 'ADMIN'
                    ? 'admin'
                    : 'admin'
                }
                onChange={(e) => loginAs(e.target.value)}
              >
                <option value="admin">Admin Staff</option>
                <option value="reception">Reception Desk</option>
                <option value="sharma">Dr. Sharma (General)</option>
                <option value="mehta">Dr. Mehta (Cardio)</option>
                <option value="patel">Dr. Patel (Paeds)</option>
              </select>
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Mobile Responsive Bottom Tab Bar with Minimum 44px Touch Targets */}
        <nav aria-label="Mobile Navigation" className="grid grid-cols-4 md:hidden py-1.5 border-t border-slate-200 dark:border-slate-800 gap-1">
          <button
            onClick={() => onTabChange('patient')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs transition-colors min-h-[44px] ${
              activeTab === 'patient'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Patient</span>
          </button>

          <button
            onClick={() => onTabChange('doctor')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs transition-colors min-h-[44px] ${
              activeTab === 'doctor'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Doctor</span>
          </button>

          <button
            onClick={() => onTabChange('reception')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs transition-colors min-h-[44px] ${
              activeTab === 'reception'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Board</span>
          </button>

          <button
            onClick={() => onTabChange('analytics')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs transition-colors min-h-[44px] ${
              activeTab === 'analytics'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Analytics</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
