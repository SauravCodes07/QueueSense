import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Clock,
  ShieldCheck,
  Zap,
  Users,
  Stethoscope,
  LayoutDashboard,
  CheckCircle2,
  Lock,
  FileText,
  Search,
  Sparkles,
  BarChart3,
  Moon,
  Sun,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Hero3DCanvas } from './Hero3DCanvas';

interface LandingPageProps {
  onEnterPortal: (role?: 'patient' | 'doctor' | 'reception' | 'analytics', initialToken?: string) => void;
  onOpenDemoControls: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterPortal,
  onOpenDemoControls,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [tokenInput, setTokenInput] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState<'patient' | 'doctor' | 'reception'>('patient');

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim().toUpperCase() || 'A-1';
    onEnterPortal('patient', token);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                Queue<span className="text-emerald-600 dark:text-emerald-400">Sense</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Hospital Operations OS
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#how-it-works" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              How It Works
            </a>
            <a href="#capabilities" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Platform Capabilities
            </a>
            <a href="#previews" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Workspaces
            </a>
            <a href="#trust" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Privacy & Trust
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onEnterPortal('patient')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all"
            >
              Patient Wait Tracker
            </button>

            <button
              onClick={() => onEnterPortal('doctor')}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center space-x-1.5"
            >
              <span>Staff Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-200 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        {/* Background 3D Node Mesh */}
        <div className="absolute inset-0 opacity-25 dark:opacity-20 pointer-events-none">
          <Hero3DCanvas />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            {/* Pill Tagline */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Real-Time Outpatient Velocity Engine</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-6">
              A healthcare queue that tells the truth,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                in real time.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto">
              QueueSense replaces static appointment schedules with live consultation velocity tracking, emergency-aware priority reordering, and multi-clinician load rebalancing.
            </p>

            {/* Quick Token Tracking Bar */}
            <div className="max-w-md mx-auto mb-6 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
              <form onSubmit={handleTrackSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Enter Token (e.g. A-1, A-2)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center space-x-1.5 flex-shrink-0"
                >
                  <span>Track Wait</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Quick Portal Entry Options */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Direct Workspace Access:</span>
              <button
                onClick={() => onEnterPortal('patient')}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 font-medium transition-colors"
              >
                Patient Portal
              </button>
              <button
                onClick={() => onEnterPortal('doctor')}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 font-medium transition-colors"
              >
                Doctor Console
              </button>
              <button
                onClick={() => onEnterPortal('reception')}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 font-medium transition-colors"
              >
                Reception Operations
              </button>
              <button
                onClick={() => onEnterPortal('analytics')}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 font-medium transition-colors"
              >
                Admin & Audit Trail
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Capabilities Section ──────────────────────────────────── */}
      <section id="capabilities" className="py-16 sm:py-24 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
              Clinical Queue Architecture
            </h2>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
              Built for real-world hospital velocity variations
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Standard fixed appointment slots create false precision and patient anxiety. QueueSense calculates honest, probabilistic wait ranges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="clinical-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                  Dynamic Velocity EMA
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Doctor pace is continuously calibrated using Exponential Moving Averages (0.3 × last + 0.7 × old) with GradientBoosting ML fallback.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                Zero False Precision
              </div>
            </div>

            <div className="clinical-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                  Emergency Priority Flow
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  High-acuity triage cases insert immediately behind active consultations. Downstream wait-time ranges recalculate automatically with explainability.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-rose-600 dark:text-rose-400">
                Deterministic Order
              </div>
            </div>

            <div className="clinical-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mb-4">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                  Dual-Queue Load Balancing
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Composite load scoring evaluates queue depth, remaining consultation durations, and specialty compatibility for seamless patient transfers.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-teal-600 dark:text-teal-400">
                Intake Recommendations
              </div>
            </div>

            <div className="clinical-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                  Immutable Cryptographic Audit
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Every priority modification, patient transfer, and no-show confirmation is immutably recorded with staff attribution and operational justifications.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-purple-600 dark:text-purple-400">
                Insert-Only Audit Trail
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
              Operational Workflow
            </h2>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
              How live velocity updates your wait time
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="clinical-card p-6 relative">
              <span className="text-3xl font-display font-extrabold text-slate-300 dark:text-slate-700">01</span>
              <h4 className="font-semibold text-base text-slate-900 dark:text-white mt-2 mb-1">
                Token Issuance
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Walk-in or pre-registered patient checks in at reception and receives an anonymous queue token.
              </p>
            </div>

            <div className="clinical-card p-6 relative">
              <span className="text-3xl font-display font-extrabold text-emerald-500/30">02</span>
              <h4 className="font-semibold text-base text-slate-900 dark:text-white mt-2 mb-1">
                Consultation Tracking
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Doctor consultation stopwatch records precise session durations, updating clinician velocity in real time.
              </p>
            </div>

            <div className="clinical-card p-6 relative">
              <span className="text-3xl font-display font-extrabold text-teal-500/30">03</span>
              <h4 className="font-semibold text-base text-slate-900 dark:text-white mt-2 mb-1">
                EMA Velocity Recalculation
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Remaining wait time ranges adjust immediately for all downstream patients without fixed-interval lag.
              </p>
            </div>

            <div className="clinical-card p-6 relative">
              <span className="text-3xl font-display font-extrabold text-purple-500/30">04</span>
              <h4 className="font-semibold text-base text-slate-900 dark:text-white mt-2 mb-1">
                SSE Live Broadcast
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Updates stream directly to patient smartphones, doctor consoles, and waiting area wall monitors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Workspace Previews ───────────────────────────── */}
      <section id="previews" className="py-16 sm:py-24 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
              Role-Specific Workspaces
            </h2>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
              Tailored interfaces for patients, clinicians & staff
            </h3>
          </div>

          {/* Workspace Tabs */}
          <div className="flex justify-center space-x-2 mb-8">
            <button
              onClick={() => setActivePreviewTab('patient')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activePreviewTab === 'patient'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Patient Experience
            </button>
            <button
              onClick={() => setActivePreviewTab('doctor')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activePreviewTab === 'doctor'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Doctor Clinical Console
            </button>
            <button
              onClick={() => setActivePreviewTab('reception')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activePreviewTab === 'reception'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Reception & Admin Operations
            </button>
          </div>

          {/* Workspace Preview Showcase Card */}
          <div className="clinical-card p-6 sm:p-8 max-w-4xl mx-auto bg-slate-50/50 dark:bg-slate-950/50">
            {activePreviewTab === 'patient' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Token Number</span>
                    <h4 className="text-3xl font-display font-extrabold text-emerald-600 dark:text-emerald-400">A-1</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-bold uppercase">Estimated Wait</span>
                    <h4 className="text-2xl font-display font-bold text-slate-900 dark:text-white">10–14 min</h4>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Why ETA Changed:</strong> Previous consultation completed in 11 minutes (faster than 14m average). Your turn is advancing ahead of schedule.
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => onEnterPortal('patient', 'A-1')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <span>Open Patient Application</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activePreviewTab === 'doctor' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Active Consultation</span>
                    <h4 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Patient A-1</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-bold uppercase">Elapsed Time</span>
                    <h4 className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">06:42</h4>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Target consultation speed: 12 min. Velocity EMA adjusts automatically when consultation ends.
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={() => onEnterPortal('doctor')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <span>Open Doctor Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activePreviewTab === 'reception' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Hospital Load Balancing</span>
                    <h4 className="text-xl font-display font-bold text-slate-900 dark:text-white">Cross-Doctor Operations</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                    3 Clinicians Active
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Real-time density analysis suggests patient transfers from overloaded queues to clinicians with lowest load scores.
                </p>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => onEnterPortal('reception')}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <span>Open Live Operations Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Trust, Privacy & Explainability ───────────────────────────── */}
      <section id="trust" className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="clinical-card p-6">
              <Lock className="w-6 h-6 text-emerald-600 mb-3" />
              <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                Zero Medical History Storage
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                QueueSense strictly tracks operational timestamps and anonymous tokens. No symptoms, diagnoses, or clinical records are stored.
              </p>
            </div>

            <div className="clinical-card p-6">
              <FileText className="w-6 h-6 text-teal-600 mb-3" />
              <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                Explainable ETA Changes
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                When an estimated wait changes, the patient is provided a clear operational reason (e.g. emergency priority or doctor velocity variation).
              </p>
            </div>

            <div className="clinical-card p-6">
              <ShieldCheck className="w-6 h-6 text-purple-600 mb-3" />
              <h4 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                Cryptographic Audit Log
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                All staff interventions (emergency escalations, patient transfers, and no-show marks) are captured immutably with full justification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Developer & Demo Controls Access Strip ─────────────────────── */}
      <div className="bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Developer Sandbox & Simulation Tools Available</span>
          </span>
          <button
            onClick={onOpenDemoControls}
            className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 text-xs font-semibold transition-colors"
          >
            Launch Incident Simulator
          </button>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-slate-900 py-8 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="font-display font-bold text-slate-900 dark:text-white">
              Queue<span className="text-emerald-600 dark:text-emerald-400">Sense</span>
            </span>
            <span>•</span>
            <span>Outpatient Velocity & Wait-Time OS (PS7)</span>
          </div>

          <div className="flex items-center space-x-6">
            <button onClick={() => onEnterPortal('patient')} className="hover:underline">Patient Portal</button>
            <button onClick={() => onEnterPortal('doctor')} className="hover:underline">Clinician Console</button>
            <button onClick={() => onEnterPortal('reception')} className="hover:underline">Operations Board</button>
            <button onClick={() => onEnterPortal('analytics')} className="hover:underline">Audit Trail</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
