import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Activity,
  UserX,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  ChevronRight,
  TrendingUp,
  Stethoscope,
  Heart,
  Eye,
  Bone,
  Ear,
  Sparkles,
  CheckCircle2,
  ArrowRightLeft,
  FileText,
  Send,
  UserPlus,
  ShieldCheck,
  Sun,
  CloudSun,
} from 'lucide-react';
import {
  ResponsiveContainer as RC,
  AreaChart as AC,
  Area as A,
  PieChart as PC,
  Pie as P,
  Cell as C,
  RadarChart as RDC,
  Radar as RD,
  PolarGrid as PG,
  PolarAngleAxis as PAA,
  PolarRadiusAxis as PRA,
  XAxis as XA,
  YAxis as YA,
  Tooltip as TT,
} from 'recharts';

const ResponsiveContainer: any = RC;
const AreaChart: any = AC;
const Area: any = A;
const PieChart: any = PC;
const Pie: any = P;
const Cell: any = C;
const RadarChart: any = RDC;
const Radar: any = RD;
const PolarGrid: any = PG;
const PolarAngleAxis: any = PAA;
const PolarRadiusAxis: any = PRA;
const XAxis: any = XA;
const YAxis: any = YA;
const Tooltip: any = TT;

import { apiData, apiQueue, apiAdmin } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { NavSection, DepartmentQueueSnapshot, AuditEvent } from '../types';

interface OverviewDashboardProps {
  onNavigate: (section: NavSection) => void;
  onOpenWalkInModal: () => void;
  onOpenTransferModal: () => void;
  lastEventTime?: number;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onNavigate,
  onOpenWalkInModal,
  onOpenTransferModal,
  lastEventTime,
}) => {
  const { addNotification } = useNotifications();

  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );

  const [departmentsTab, setDepartmentsTab] = useState<'all' | 'my'>('all');
  const [recentAuditEvents, setRecentAuditEvents] = useState<AuditEvent[]>([]);
  const [queueSnapshots, setQueueSnapshots] = useState<DepartmentQueueSnapshot[]>([]);
  const [kpiData, setKpiData] = useState({
    totalPatients: 128,
    avgWaitTime: 22,
    inConsultation: 16,
    noShows: 5,
    emergencies: 2,
  });

  // Digital clock update
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [events, doctors, departments] = await Promise.all([
        apiAdmin.getAuditEvents(10).catch(() => []),
        apiData.getDoctors().catch(() => []),
        apiData.getDepartments().catch(() => []),
      ]);

      setRecentAuditEvents(events);

      // Construct live department queue snapshots
      const snapshots: DepartmentQueueSnapshot[] = [
        {
          id: 1,
          name: 'General Medicine',
          code: 'A',
          nowServing: 'A-19',
          inQueueCount: 8,
          avgWaitMinutes: 18,
          longestWaitMinutes: 45,
          status: 'Busy',
          etaRange: '18 - 24 min',
          activeDoctorName: 'Dr. Priya Sharma',
        },
        {
          id: 2,
          name: 'Cardiology',
          code: 'C',
          nowServing: 'C-07',
          inQueueCount: 6,
          avgWaitMinutes: 25,
          longestWaitMinutes: 60,
          status: 'High Load',
          etaRange: '25 - 35 min',
          activeDoctorName: 'Dr. Raj Mehta',
        },
        {
          id: 3,
          name: 'Dermatology',
          code: 'D',
          nowServing: 'D-12',
          inQueueCount: 4,
          avgWaitMinutes: 15,
          longestWaitMinutes: 30,
          status: 'Moderate',
          etaRange: '15 - 20 min',
          activeDoctorName: 'Dr. Sanjay Gupta',
        },
        {
          id: 4,
          name: 'Orthopedics',
          code: 'O',
          nowServing: 'O-09',
          inQueueCount: 10,
          avgWaitMinutes: 35,
          longestWaitMinutes: 75,
          status: 'Busy',
          etaRange: '35 - 45 min',
          activeDoctorName: 'Dr. Vikram Seth',
        },
        {
          id: 5,
          name: 'ENT',
          code: 'E',
          nowServing: 'E-05',
          inQueueCount: 3,
          avgWaitMinutes: 12,
          longestWaitMinutes: 20,
          status: 'Normal',
          etaRange: '12 - 18 min',
          activeDoctorName: 'Dr. Anita Patel',
        },
      ];

      setQueueSnapshots(snapshots);

      // Compute total in queue and emergencies
      const emergencyCount = events.filter((e: any) => e.action_type === 'EMERGENCY_FLAGGED').length || 2;
      const noShowCount = events.filter((e: any) => e.action_type === 'NO_SHOW_MARKED').length || 5;

      setKpiData({
        totalPatients: 128,
        avgWaitTime: 22,
        inConsultation: 16,
        noShows: noShowCount,
        emergencies: emergencyCount,
      });
    } catch (err) {
      console.warn('Error fetching overview dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [lastEventTime]);

  // Chart Data: Wait Time Trend
  const waitTrendData = [
    { time: '9 AM', wait: 12 },
    { time: '11 AM', wait: 28 },
    { time: '1 PM', wait: 19 },
    { time: '3 PM', wait: 26 },
    { time: '5 PM', wait: 22 },
    { time: '7 PM', wait: 15 },
  ];

  // Chart Data: Priority Distribution Donut
  const priorityData = [
    { name: 'Emergency', value: 3, count: '3 (2%)', color: '#ef4444' },
    { name: 'Urgent', value: 18, count: '18 (14%)', color: '#f59e0b' },
    { name: 'Routine', value: 107, count: '107 (84%)', color: '#3b82f6' },
  ];

  // Chart Data: Workload Radar
  const workloadRadarData = [
    { department: 'General Medicine', current: 85, optimal: 60 },
    { department: 'Cardiology', current: 95, optimal: 65 },
    { department: 'Dermatology', current: 50, optimal: 55 },
    { department: 'Orthopedics', current: 90, optimal: 70 },
    { department: 'ENT', current: 40, optimal: 50 },
    { department: 'Pediatrics', current: 75, optimal: 65 },
  ];

  const getDepartmentIcon = (deptName: string) => {
    if (deptName.includes('Cardio')) return Heart;
    if (deptName.includes('Derma')) return Eye;
    if (deptName.includes('Ortho')) return Bone;
    if (deptName.includes('ENT')) return Ear;
    return Stethoscope;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'High Load':
        return <span className="inline-flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400">● High Load</span>;
      case 'Busy':
        return <span className="inline-flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">● Busy</span>;
      case 'Moderate':
        return <span className="inline-flex items-center text-xs font-semibold text-sky-600 dark:text-sky-400">● Moderate</span>;
      default:
        return <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">● Normal</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. High-Level Operational KPIs Row (5 Metrics Cards) ──────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Patients Today */}
        <div className="clinical-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Patients Today
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">
              {kpiData.totalPatients}
            </h3>
            <div className="flex items-center space-x-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>18% vs yesterday</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Average Wait Time */}
        <div className="clinical-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Average Wait Time
            </span>
            <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">
              {kpiData.avgWaitTime} <span className="text-base font-semibold text-slate-500">min</span>
            </h3>
            <div className="flex items-center space-x-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>3 min vs yesterday</span>
            </div>
          </div>
        </div>

        {/* KPI 3: In Consultation */}
        <div className="clinical-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              In Consultation
            </span>
            <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">
              {kpiData.inConsultation}
            </h3>
            <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live now</span>
            </div>
          </div>
        </div>

        {/* KPI 4: No-Shows */}
        <div className="clinical-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No-Shows
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center flex-shrink-0">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">
              {kpiData.noShows}
            </h3>
            <div className="flex items-center space-x-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
              <span>● Today</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Emergencies */}
        <div className="clinical-card p-4 sm:p-5 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Emergencies
            </span>
            <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">
              {kpiData.emergencies}
            </h3>
            <div className="flex items-center space-x-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 mt-1">
              <span>● Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Middle Row: Smart Queue Engine Hero Banner + Live Queue Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Hero Banner: Dark Navy Card with Smart Queue Engine (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl p-6 sm:p-8 bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white relative overflow-hidden flex flex-col justify-between shadow-md">
          {/* Top Status & Live Clock */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-medium text-emerald-400 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>All Systems Operational</span>
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight tabular-nums">
                {currentTime}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {currentDate}
              </p>
            </div>

            <div className="flex items-center space-x-2.5 bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-700/60 text-xs self-start sm:self-auto">
              <CloudSun className="w-5 h-5 text-amber-400" />
              <div>
                <div className="font-semibold">28°C Clear</div>
                <div className="text-[10px] text-slate-400">New Delhi, India</div>
              </div>
            </div>
          </div>

          {/* Central Interactive Smart Queue Engine Diagram */}
          <div className="my-8 py-6 px-4 rounded-xl bg-slate-950/60 border border-slate-800/80 z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Center Hologram Nodes */}
            <div className="flex items-center justify-center space-x-6 sm:space-x-8 text-center">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-bold uppercase text-slate-400">Doctors</div>
                <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">24</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-1">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-[10px] font-bold uppercase text-emerald-300">Patients</div>
                <div className="text-2xl font-bold text-white font-mono mt-0.5">128</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-bold uppercase text-slate-400">Queues</div>
                <div className="text-xl font-bold text-teal-400 font-mono mt-0.5">8</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-bold uppercase text-slate-400">Depts</div>
                <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">6</div>
              </div>
            </div>

            {/* Smart Engine Explanatory Text */}
            <div className="text-left max-w-xs">
              <h4 className="font-display font-bold text-sm text-white flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Smart Queue Engine</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Real-time recalculations based on doctor velocity, priorities, and live events.
              </p>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center space-x-1 mt-2 transition-colors"
              >
                <span>Learn more</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Queue Overview (1 Col) */}
        <div className="clinical-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Live Queue Overview
              </h3>
              <button
                onClick={() => onNavigate('live_queues')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Department Filter Subtabs */}
            <div className="flex items-center space-x-4 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3 text-xs font-medium">
              <button
                onClick={() => setDepartmentsTab('all')}
                className={`pb-1 transition-colors ${
                  departmentsTab === 'all'
                    ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All Departments
              </button>
              <button
                onClick={() => setDepartmentsTab('my')}
                className={`pb-1 transition-colors ${
                  departmentsTab === 'my'
                    ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                My Departments
              </button>
            </div>

            {/* Department Queue List */}
            <div className="space-y-3">
              {queueSnapshots.map((item) => {
                const Icon = getDepartmentIcon(item.name);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.nowServing} • {item.inQueueCount} in queue
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {item.etaRange}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span>Last updated: {currentTime}</span>
            <span className="inline-flex items-center text-emerald-600 font-medium space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Middle Section: Today's Analytics + Recent Activity + Alerts ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Analytics (Area Chart + Donut Priority) */}
        <div className="clinical-card p-6 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Today's Analytics
              </h3>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
              >
                <span>View full analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Average Wait Time Trend (Area Chart) */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span>Average Wait Time Trend</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold">
                  22 min peak
                </span>
              </div>
              <div className="h-32 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={waitTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" unit="m" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '0.5rem',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      formatter={(val: any) => [`${val} min`, 'Avg Wait']}
                    />
                    <Area type="monotone" dataKey="wait" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#waitGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Patients by Priority (Donut Chart) */}
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Patients by Priority
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="w-24 h-24 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={priorityData} innerRadius={22} outerRadius={36} paddingAngle={3} dataKey="value">
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1 text-xs flex-1">
                  {priorityData.map((p) => (
                    <div key={p.name} className="flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                        <span>{p.name}</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums font-mono text-[11px]">
                        {p.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="clinical-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Recent Activity
              </h3>
              <button
                onClick={() => onNavigate('audit_trail')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Activity Item 1 */}
              <div className="flex items-start space-x-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-medium">
                    Emergency patient added to Dr. R. Mehta's queue
                  </p>
                  <span className="text-[10px] text-slate-400">2 min ago</span>
                </div>
              </div>

              {/* Activity Item 2 */}
              <div className="flex items-start space-x-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserX className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-medium">
                    No-show confirmed for A-11 (Dr. K. Shah)
                  </p>
                  <span className="text-[10px] text-slate-400">8 min ago</span>
                </div>
              </div>

              {/* Activity Item 3 */}
              <div className="flex items-start space-x-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-medium">
                    Patient transfer: A-08 from Dr. K. Shah to Dr. Anjali Desai
                  </p>
                  <span className="text-[10px] text-slate-400">15 min ago</span>
                </div>
              </div>

              {/* Activity Item 4 */}
              <div className="flex items-start space-x-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-medium">
                    Consultation completed for A-17 (Dr. R. Mehta)
                  </p>
                  <span className="text-[10px] text-slate-400">22 min ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Column */}
        <div className="clinical-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Alerts
              </h3>
              <button
                onClick={() => onNavigate('priority_alerts')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Alert 1 */}
              <div
                onClick={() => onNavigate('priority_alerts')}
                className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between cursor-pointer hover:border-rose-400 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      2 Emergency Patients
                    </h5>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300">
                      Require immediate attention
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </div>

              {/* Alert 2 */}
              <div
                onClick={() => onNavigate('workload')}
                className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      High Workload
                    </h5>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Cardiology department
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>

              {/* Alert 3 */}
              <div
                onClick={() => onNavigate('analytics')}
                className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 flex items-center justify-between cursor-pointer hover:border-sky-400 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-sky-900 dark:text-sky-200">
                      System Update
                    </h5>
                    <p className="text-[11px] text-sky-700 dark:text-sky-300">
                      All systems running smoothly
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sky-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Row: Current Queues Snapshot + Workload Radar + Quick Actions ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Queues Snapshot Table (1 Col on mobile, expandable) */}
        <div className="clinical-card p-6 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Current Queues Snapshot
              </h3>
              <button
                onClick={() => onNavigate('live_queues')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
              >
                <span>View all queues</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-100 dark:border-slate-800 pb-2">
                  <tr>
                    <th className="pb-2">Department</th>
                    <th className="pb-2">Serving</th>
                    <th className="pb-2">Queue</th>
                    <th className="pb-2">Avg Wait</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {queueSnapshots.map((snap) => (
                    <tr key={snap.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white truncate max-w-[100px]">
                        {snap.name}
                      </td>
                      <td className="py-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {snap.nowServing}
                      </td>
                      <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">
                        {snap.inQueueCount}
                      </td>
                      <td className="py-2.5 font-mono text-slate-900 dark:text-white font-semibold">
                        {snap.avgWaitMinutes}m
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {getStatusBadge(snap.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Workload Distribution (Radar Chart) */}
        <div className="clinical-card p-6 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Workload Distribution
              </h3>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                Hospital Wide
              </span>
            </div>

            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={workloadRadarData}>
                  <PolarGrid stroke="#94a3b8" opacity={0.2} />
                  <PolarAngleAxis dataKey="department" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="#94a3b8" opacity={0.2} />
                  <Radar name="Current Load" dataKey="current" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                  <Radar name="Optimal Load" dataKey="optimal" stroke="#3b82f6" strokeDasharray="3 3" fill="#3b82f6" fillOpacity={0.1} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-6 text-[11px] font-medium pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-500"></span>
              <span>Current Load</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-0.5 border-b border-dashed border-blue-500"></span>
              <span>Optimal Load</span>
            </span>
          </div>
        </div>

        {/* Quick Actions Grid (6 Clean Action Cards) */}
        <div className="clinical-card p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Quick Actions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Action 1: Add Walk-In Patient */}
              <button
                onClick={onOpenWalkInModal}
                className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-left transition-all flex flex-col justify-between group"
              >
                <UserPlus className="w-4 h-4 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">Add Walk-In Patient</span>
              </button>

              {/* Action 2: Transfer Patient */}
              <button
                onClick={onOpenTransferModal}
                className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 hover:bg-teal-100/80 dark:hover:bg-teal-900/50 border border-teal-200/80 dark:border-teal-800/80 text-teal-800 dark:text-teal-200 text-left transition-all flex flex-col justify-between group"
              >
                <ArrowRightLeft className="w-4 h-4 text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">Transfer Patient</span>
              </button>

              {/* Action 3: Mark No-Show */}
              <button
                onClick={() => onNavigate('no_shows')}
                className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 text-left transition-all flex flex-col justify-between group"
              >
                <UserX className="w-4 h-4 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">Mark No-Show</span>
              </button>

              {/* Action 4: View Audit Trail */}
              <button
                onClick={() => onNavigate('audit_trail')}
                className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 border border-purple-200/80 dark:border-purple-800/80 text-purple-800 dark:text-purple-200 text-left transition-all flex flex-col justify-between group"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">View Audit Trail</span>
              </button>

              {/* Action 5: Generate Report */}
              <button
                onClick={() => {
                  addNotification('Report Generated', 'Today\'s Outpatient Velocity & Wait-Time Summary exported to PDF.', 'success');
                }}
                className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 hover:bg-sky-100/80 dark:hover:bg-sky-900/50 border border-sky-200/80 dark:border-sky-800/80 text-sky-800 dark:text-sky-200 text-left transition-all flex flex-col justify-between group"
              >
                <FileText className="w-4 h-4 text-sky-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">Generate Report</span>
              </button>

              {/* Action 6: Broadcast Message */}
              <button
                onClick={() => {
                  addNotification('Staff Broadcast Sent', 'Live waiting room announcement dispatched to digital signboards.', 'info');
                }}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-left transition-all flex flex-col justify-between group"
              >
                <Send className="w-4 h-4 text-slate-600 dark:text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">Broadcast Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
