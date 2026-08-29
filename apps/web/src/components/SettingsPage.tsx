import React, { useState } from 'react';
import {
  Copy,
  Check,
  Building,
  Key,
  Shield,
  CreditCard,
  Sliders,
  Sun,
  Moon,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
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

  const configTabs = [
    { id: 'general', label: 'General' },
    { id: 'infrastructure', label: 'Infrastructure' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'api_keys', label: 'API Keys' },
    { id: 'jwt_keys', label: 'JWT Keys' },
    { id: 'log_drains', label: 'Log Drains' },
    { id: 'addons', label: 'Add-ons' },
  ];

  const integrationTabs = [
    { id: 'data_api', label: 'Data API' },
    { id: 'vault', label: 'Vault', badge: 'BETA' },
  ];

  const billingTabs = [
    { id: 'subscription', label: 'Subscription' },
    { id: 'usage', label: 'Usage' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-150">
      {/* ── Left Sidebar Subnav (Screenshot 2) ────────────────────────── */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-display font-bold text-slate-900 dark:text-white mb-3">
            Settings
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

            {/* INTEGRATIONS */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-3">
                INTEGRATIONS
              </span>
              <div className="space-y-0.5">
                {integrationTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl font-medium flex items-center justify-between transition-colors ${
                      activeTab === t.id
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{t.label}</span>
                    {t.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {t.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* BILLING */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-3">
                BILLING
              </span>
              <div className="space-y-0.5">
                {billingTabs.map((t) => (
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

      {/* ── Main Settings Panel (Screenshot 2) ────────────────────────── */}
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white">
            Project Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            General configuration, domains, ownership, and lifecycle
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Project settings updated successfully.</span>
          </div>
        )}

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
                Interface Appearance
              </p>
              <p className="text-[11px] text-slate-400">
                Currently using {theme === 'dark' ? 'Dark' : 'Light'} Mode
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

          {/* Save Button (Screenshot 2) */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center space-x-1.5"
            >
              <span>Save changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
