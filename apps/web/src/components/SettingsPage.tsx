import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sun,
  Moon,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/sourceStrings';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState('general');
  const [projectName, setProjectName] = useState('QueueSense Health Systems');
  const [projectId] = useState('rtpylojjkwhxnybftizc');
  const [projectRegion] = useState('ap-south-1 (Mumbai)');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRegion, setCopiedRegion] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCopy = (text: string, type: 'id' | 'region') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedRegion(true);
      setTimeout(() => setCopiedRegion(false), 2000);
    }
  };

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

  const configTabs = [
    { id: 'general', label: 'General' },
    { id: 'infrastructure', label: 'Infrastructure' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'api_keys', label: 'API Keys' },
    { id: 'jwt_keys', label: 'JWT Keys' },
    { id: 'log_drains', label: 'Log Drains' },
    { id: 'addons', label: 'Add-ons' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-150">
      {/* ── Left Sidebar Subnav ───────────────────────────────────────── */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-display font-bold text-slate-900 dark:text-white mb-3">
            {t('nav.settings')}
          </h2>
          <div className="space-y-4 text-xs">
            {/* CONFIGURATION */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-3">
                CONFIGURATION
              </span>
              <div className="space-y-0.5">
                {configTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors ${
                      activeTab === t.id
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Settings Panel ───────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white">
            {t('settings.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.subtitle')}
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        {/* Multi-Language Selector Card */}
        <div className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                {t('settings.language_title')}
              </h2>
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
                className={`p-3.5 rounded-2xl border text-left transition-all ${
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

        <form onSubmit={handleSave} className="clinical-card p-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-5">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            General settings
          </h2>

          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Project name
            </label>
            <p className="text-[11px] text-slate-400">
              Displayed throughout the dashboard.
            </p>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full max-w-md px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Project ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Project ID
            </label>
            <p className="text-[11px] text-slate-400">
              Reference used in APIs and URLs.
            </p>
            <div className="flex items-center space-x-2 max-w-md">
              <input
                type="text"
                readOnly
                value={projectId}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy(projectId, 'id')}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 shadow-subtle flex-shrink-0"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Project Region */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Project region
            </label>
            <div className="flex items-center space-x-2 max-w-md">
              <input
                type="text"
                readOnly
                value={projectRegion}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy(projectRegion, 'region')}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 shadow-subtle flex-shrink-0"
              >
                {copiedRegion ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRegion ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Theme Switch Control */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between max-w-md">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('settings.theme_title')}
              </p>
              <p className="text-[11px] text-slate-400">
                {t('settings.theme_desc')}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center space-x-2"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              <span>Toggle Theme</span>
            </button>
          </div>

          {/* Save Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center space-x-1.5"
            >
              <span>{t('common.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
