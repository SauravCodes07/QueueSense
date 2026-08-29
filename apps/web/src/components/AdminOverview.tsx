import React from 'react';
import {
  Building2,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { NavSection } from '../types';
import { useQueue } from '../context/QueueContext';
import { useLanguage } from '../context/LanguageContext';

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
  const { t, translateDepartment, formatNumber } = useLanguage();

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
            {t('overview.volume')}
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {formatNumber(metrics.totalVolume)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.activeCount} active</span> • {metrics.servedCount} served
          </p>
        </div>

        {/* Card 2: SPECIALISTS */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            {t('overview.specialists')}
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.activeDoctorsCount} / {metrics.totalDoctorsCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {matrix.length} {t('common.department').toLowerCase()}s
          </p>
        </div>

        {/* Card 3: WAIT */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            {t('overview.wait')}
          </span>
          <div className="text-2xl font-display font-bold text-teal-600 dark:text-teal-400">
            {metrics.avgWaitMinutes} {t('common.min')}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Target: 20 min
          </p>
        </div>

        {/* Card 4: EFFICIENCY */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            {t('overview.efficiency')}
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.efficiencyPercent}%
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            +4.2% today
          </p>
        </div>

        {/* Card 5: CASES */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            {t('overview.cases')}
          </span>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            {metrics.emergencyCasesCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Priority triaged
          </p>
        </div>

        {/* Card 6: MANAGED */}
        <div className="clinical-card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            {t('overview.managed')}
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
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                {t('overview.matrix_title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {matrix.length} {t('overview.matrix_sub')}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">{t('common.department')}</th>
                <th className="py-3.5 px-4">{t('overview.active_total_docs')}</th>
                <th className="py-3.5 px-4">{t('overview.patients_in_q')}</th>
                <th className="py-3.5 px-4">{t('overview.avg_wait')}</th>
                <th className="py-3.5 px-4">{t('overview.efficiency_flow')}</th>
                <th className="py-3.5 px-4">{t('overview.op_status')}</th>
                <th className="py-3.5 px-5 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {matrix.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Department & Rooms */}
                  <td className="py-4 px-5">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {translateDepartment(dept.name)}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {dept.rooms}
                      </p>
                    </div>
                  </td>

                  {/* Active / Total Doctors */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {dept.activeDoctors} / {dept.totalDoctors}
                      </span>
                    </div>
                  </td>

                  {/* Patients in Queue */}
                  <td className="py-4 px-4">
                    <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                      {dept.patientsInQueue}
                    </span>
                  </td>

                  {/* Avg Waiting Time */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {dept.avgWaitMinutes} {t('common.min')}
                      </span>
                    </div>
                  </td>

                  {/* Efficiency % & Progress Bar */}
                  <td className="py-4 px-4">
                    <div className="space-y-1.5 max-w-[130px]">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <span>{dept.efficiencyPercent}%</span>
                        <span className="text-slate-400 font-normal">Optimal</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            dept.efficiencyPercent >= 80 ? 'bg-teal-500' : dept.efficiencyPercent >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${dept.efficiencyPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Operational Status Pill */}
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        dept.status === 'normal'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : dept.status === 'delay'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dept.status === 'normal' ? 'bg-emerald-500' : dept.status === 'delay' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                      <span>{dept.statusLabel}</span>
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => handleManageQueue(dept.name)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-500 hover:text-white dark:hover:bg-teal-600 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all inline-flex items-center space-x-1"
                    >
                      <span>{t('overview.manage_queue')}</span>
                      <ArrowRight className="w-3 h-3" />
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
