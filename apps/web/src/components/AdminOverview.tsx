import React from 'react';
import {
  Building2,
  Users,
  Clock,
  Activity,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { NavSection } from '../types';
import { useQueue } from '../context/QueueContext';

interface AdminOverviewProps {
  onNavigate: (section: NavSection) => void;
  onSelectDepartment?: (deptName: string) => void;
  lastEventTime?: number;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  onNavigate,
  onSelectDepartment,
}) => {
  const { getDepartmentMatrix, getOverviewMetrics } = useQueue();

  const matrix = getDepartmentMatrix();
  const metrics = getOverviewMetrics();

  const handleManageQueue = (deptName: string) => {
    onSelectDepartment?.(deptName);
    onNavigate('live_queues');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ── Top 6 Metric Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: VOLUME */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            VOLUME
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.totalVolume}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.activeCount} active</span> • {metrics.servedCount} served
          </p>
        </div>

        {/* Card 2: SPECIALISTS */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            SPECIALISTS
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.activeDoctorsCount} / {metrics.totalDoctorsCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {matrix.length} departments
          </p>
        </div>

        {/* Card 3: WAIT */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            WAIT
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.avgWaitMinutes} <span className="text-sm font-normal text-slate-400">min</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Dynamic aggregate
          </p>
        </div>

        {/* Card 4: EFFICIENCY */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            EFFICIENCY
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.efficiencyPercent}<span className="text-sm font-normal text-slate-400">%</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Target &gt;= 80%
          </p>
        </div>

        {/* Card 5: CASES */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            CASES
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.emergencyCasesCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            All triaged
          </p>
        </div>

        {/* Card 6: MANAGED */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            MANAGED
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.slotsReclaimedCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Slots reclaimed
          </p>
        </div>
      </div>

      {/* ── Department Performance Matrix Table ──────────────────────── */}
      <div className="clinical-card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Department Performance Matrix
            </h2>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {matrix.length} Outpatient Clinics
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-3 px-5">DEPARTMENT</th>
                <th className="py-3 px-4">ACTIVE / TOTAL DOCTORS</th>
                <th className="py-3 px-4">PATIENTS IN QUEUE</th>
                <th className="py-3 px-4">AVG WAITING TIME</th>
                <th className="py-3 px-4 min-w-[140px]">EFFICIENCY & FLOW</th>
                <th className="py-3 px-4">OPERATIONAL STATUS</th>
                <th className="py-3 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {matrix.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3.5 px-5">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                      {row.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {row.rooms}
                    </p>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    {row.activeDoctors} / {row.totalDoctors}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {row.patientsInQueue}
                  </td>

                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                    {row.avgWaitMinutes} min
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex items-center">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.status === 'bottleneck'
                            ? 'bg-teal-500'
                            : row.status === 'delay'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${row.efficiencyPercent}%` }}
                      />
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                        row.status === 'bottleneck'
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : row.status === 'delay'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleManageQueue(row.name)}
                      className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline inline-flex items-center space-x-1"
                    >
                      <span>Manage Queue</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
