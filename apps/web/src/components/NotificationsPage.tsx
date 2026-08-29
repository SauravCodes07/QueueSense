import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Filter,
  Check,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export const NotificationsPage: React.FC = () => {
  const { notifications, markAsRead, clearAll, markAllAsRead } = useNotifications();
  const [filterType, setFilterType] = useState<'all' | 'alert' | 'info' | 'success'>('all');

  const filtered = notifications.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="clinical-card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Operational Broadcasts & Alerts
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live notifications for patient calls, emergency escalations, delays, and transfers
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={markAllAsRead}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-slate-400 font-medium">Filter:</span>
        {(['all', 'alert', 'info', 'success'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-colors ${
              filterType === type
                ? 'bg-teal-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {type === 'all' ? 'All Alerts' : type}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between space-x-3 ${
                n.read
                  ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 opacity-75'
                  : 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/80 shadow-subtle'
              }`}
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    n.type === 'alert'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                      : n.type === 'success'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                      : 'bg-teal-100 dark:bg-teal-950 text-teal-600'
                  }`}
                >
                  {n.type === 'alert' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : n.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                      {n.title}
                    </h3>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="clinical-card p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
              No Broadcasts
            </p>
            <p className="text-xs text-slate-400">
              All live clinic events and notifications will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
