import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  ChevronDown,
  Sparkles,
  Command,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { NavSection } from '../types';

interface TopHeaderProps {
  activeSection: NavSection;
  onOpenNotifications: () => void;
  onOpenDemoControls: () => void;
  onToggleMobileNav: () => void;
  onSearch?: (query: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeSection,
  onOpenNotifications,
  onToggleMobileNav,
  onSearch,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, loginAs } = useAuth();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const getGreeting = () => {
    const firstName = user?.name ? user.name.split(' ')[0] : 'Arjun';
    return `Good Morning, ${firstName} 👋`;
  };

  const getSubtitle = () => {
    switch (activeSection) {
      case 'overview':
        return "Here's what's happening across your hospital today.";
      case 'live_queues':
        return 'Real-time multi-department outpatient queues and clinician loads.';
      case 'doctors':
        return 'Clinician consultation console, live stopwatches, and velocity tracking.';
      case 'workload':
        return 'Department load scores, composite balancing, and intake recommendations.';
      case 'transfers':
        return 'Staff-authorized patient transfers and cross-doctor load rebalancing.';
      case 'priority_alerts':
        return 'High-acuity emergency cases, urgent triage, and operational alerts.';
      case 'no_shows':
        return 'Patient no-show confirmations and downstream ETA decrements.';
      case 'audit_trail':
        return 'Immutable cryptographic audit trail of all operational events.';
      case 'analytics':
        return '7-day consultation velocity trends, ML model metrics, and distributions.';
      case 'departments':
        return 'Hospital departments, default consultation times, and queue settings.';
      case 'users':
        return 'Staff roster, clinician credentials, and role-based access control.';
      case 'settings':
        return 'QueueSense system configuration, EMA weights, and ML fallback thresholds.';
      default:
        return "Here's what's happening across your hospital today.";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="sticky top-0 z-20 h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4">
      {/* ── Left Title & Greeting ────────────────────────────────────── */}
      <div className="flex items-center space-x-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileNav}
          className="p-2 md:hidden rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-tight truncate">
            {getGreeting()}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate hidden sm:block">
            {getSubtitle()}
          </p>
        </div>
      </div>

      {/* ── Right Action Strip (Search + Theme + Notifications + User) ─ */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        {/* Global Search Bar with ⌘K Badge */}
        <form onSubmit={handleSearchSubmit} className="relative hidden lg:block w-72">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients, doctors, queues..."
            className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
          />
          <div className="absolute right-2.5 top-2 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-300 pointer-events-none flex items-center space-x-0.5">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </form>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell with Badge */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Operational Broadcasts"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Persona Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center space-x-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {getInitials(user?.name || 'Arjun Singh')}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 text-xs space-y-1 animate-in fade-in">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Arjun Singh'}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email || 'admin@queuesense.demo'}</p>
              </div>

              <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400">
                Switch Role Persona
              </div>

              {[
                { id: 'admin', label: 'Arjun Singh (Super Admin)' },
                { id: 'sharma', label: 'Dr. Priya Sharma (General)' },
                { id: 'mehta', label: 'Dr. Raj Mehta (Cardiology)' },
                { id: 'patel', label: 'Dr. Anita Patel (Paediatrics)' },
                { id: 'reception', label: 'Reception Front Desk' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    loginAs(p.id);
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
