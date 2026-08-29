import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  ChevronDown,
  Building,
  LogOut,
  Globe,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/sourceStrings';
import { NavSection } from '../types';

interface TopHeaderProps {
  activeSection: NavSection;
  onOpenNotifications: () => void;
  onOpenDemoControls: () => void;
  onToggleMobileNav: () => void;
  onSearch?: (query: string) => void;
  onSelectDepartment?: (dept: string) => void;
  selectedDepartment?: string;
  onExitToLanding?: () => void;
  onSelectSection?: (section: NavSection) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenNotifications,
  onToggleMobileNav,
  onSearch,
  onSelectDepartment,
  selectedDepartment = 'General Medicine (GM)',
  onExitToLanding,
  onSelectSection,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, loginAs, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { language, setLanguage, t, translateDepartment } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const departments = [
    { id: 'all', name: t('common.all_clinics'), key: 'dept.all' },
    { id: 'gm', name: 'General Medicine (GM)', key: 'dept.general_medicine' },
    { id: 'pd', name: 'Pediatrics (PD)', key: 'dept.pediatrics' },
    { id: 'cd', name: 'Cardiology (CD)', key: 'dept.cardiology' },
    { id: 'or', name: 'Orthopedics (OR)', key: 'dept.orthopedics' },
    { id: 'dm', name: 'Dermatology (DM)', key: 'dept.dermatology' },
  ];

  const languagesList: { id: Language; label: string; native: string }[] = [
    { id: 'en', label: 'English', native: 'English' },
    { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { id: 'mr', label: 'Marathi', native: 'मराठी' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim());
    }
  };

  const handleRoleSwitch = async (roleKey: string) => {
    await loginAs(roleKey);
    setIsUserDropdownOpen(false);
    if (roleKey === 'sharma' || roleKey === 'mehta' || roleKey === 'patel') {
      onSelectSection?.('doctor_console');
    } else if (roleKey === 'reception') {
      onSelectSection?.('live_queues');
    } else {
      onSelectSection?.('overview');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getUserSubtitle = () => {
    if (user?.role === 'DOCTOR') {
      return `Doctor • ${user.name.includes('Sharma') ? 'Room 101' : user.name.includes('Mehta') ? 'Room 301' : 'Room 201'}`;
    }
    if (user?.role === 'RECEPTION') {
      return 'Reception • Front Desk';
    }
    return 'Admin • Executive Desk';
  };

  return (
    <header className="h-16 border-b border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors">
      {/* ── Left: Mobile Nav Toggle & Department Dropdown ── */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Department Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-750 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
          >
            <Building className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <div className="text-left">
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-tight">
                {t('header.dept_label')}
              </span>
              <span className="truncate max-w-[150px] sm:max-w-[200px] block leading-tight">
                {translateDepartment(selectedDepartment)}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isDeptDropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-xs space-y-0.5 animate-in fade-in">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400">
                {t('common.department')}
              </div>
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => {
                    onSelectDepartment?.(dept.name);
                    setIsDeptDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    selectedDepartment === dept.name
                      ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {translateDepartment(dept.name)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Global Search Bar ── */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl mx-4 relative">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('header.search_placeholder')}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all shadow-subtle"
        />
      </form>

      {/* ── Right: Language Selector, Theme Toggle, Notifications, User Menu ── */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Language Selector Dropdown (Instantaneous synchronous translation) */}
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-750 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
            title="Change Language"
            aria-label="Change Language"
          >
            <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="font-semibold text-[11px] uppercase tracking-wide">
              {language === 'hi' ? 'हिन्दी' : language === 'mr' ? 'मराठी' : 'EN'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-xs space-y-0.5 animate-in fade-in">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400">
                {t('common.language')}
              </div>
              {languagesList.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    setLanguage(lang.id);
                    setIsLangDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    language === lang.id
                      ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <span>{lang.native}</span>
                    <span className="text-[10px] text-slate-400">({lang.label})</span>
                  </span>
                  {language === lang.id && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Engine Active Live Pill */}
        <div className="hidden lg:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t('header.engine_active')}</span>
        </div>

        {/* Dark/Light Switch */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={t('nav.notifications')}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Persona Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/60 dark:border-slate-750 cursor-pointer"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-teal-500/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                {getInitials(user?.name || 'OP')}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {user?.name || 'OPD Operations'}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {getUserSubtitle()}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-xs space-y-1 animate-in fade-in">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white truncate">{user?.name || 'OPD Operations'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'ops@queuesense.hospital'}</p>
              </div>

              <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400">
                Quick Role Switch
              </div>
              {[
                { id: 'admin', label: 'Admin (Executive Desk)' },
                { id: 'sharma', label: 'Dr. Priya Sharma (General)' },
                { id: 'mehta', label: 'Dr. Raj Mehta (Cardiology)' },
                { id: 'reception', label: 'Reception Front Desk' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleRoleSwitch(p.id)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}

              <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={async () => {
                    setIsUserDropdownOpen(false);
                    await signOut();
                    onExitToLanding?.();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center space-x-2 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('landing.signout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
