import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { Header } from './components/Header';
import { DemoControlBar } from './components/DemoControlBar';
import { PatientPortal } from './components/PatientPortal';
import { DoctorDashboard } from './components/DoctorDashboard';
import { ReceptionLiveBoard } from './components/ReceptionLiveBoard';
import { AuditAndAnalytics } from './components/AuditAndAnalytics';
import { NotificationCenter } from './components/NotificationCenter';
import { SSEStreamManager, SSEConnectionStatus } from './services/sse';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor' | 'reception' | 'analytics'>('patient');
  const [sseStatus, setSseStatus] = useState<SSEConnectionStatus>('connected');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now());

  const { activeDoctorId, patientToken } = useAuth();
  const { addNotification } = useNotifications();

  // SSE Stream Listener for Active Doctor's Queue
  useEffect(() => {
    const doctorStream = new SSEStreamManager(`/doctors/${activeDoctorId}/queue`, {
      onStatusChange: (st) => setSseStatus(st),
      onQueueUpdate: (data) => {
        setLastEventTime(Date.now());
        if (data.reason && data.reason !== 'connected') {
          addNotification(
            'Live Queue Update',
            `Doctor queue updated. Reason: ${data.reason.replace(/_/g, ' ')}`,
            data.reason.includes('emergency') ? 'alert' : 'info'
          );
        }
      },
    });

    return () => {
      doctorStream.disconnect();
    };
  }, [activeDoctorId]);

  // SSE Stream Listener for Active Patient's Token (if any)
  useEffect(() => {
    if (!patientToken) return;

    const patientStream = new SSEStreamManager(`/patients/${patientToken}`, {
      onETAUpdate: (data) => {
        setLastEventTime(Date.now());
        if (data.reason && data.reason !== 'connected') {
          addNotification(
            'ETA Updated',
            `Your estimated wait is now ${data.eta_low_minutes || 10}–${data.eta_high_minutes || 20} min (${data.eta_clock || ''}).`,
            'info'
          );
        }
      },
    });

    return () => {
      patientStream.disconnect();
    };
  }, [patientToken]);

  const handleTriggerStateMutated = () => {
    setLastEventTime(Date.now());
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Scripted Incident Demo Bar */}
      <DemoControlBar
        activeDoctorId={activeDoctorId}
        onStateMutated={handleTriggerStateMutated}
      />

      {/* Main Header & Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sseStatus={sseStatus}
        onOpenNotifications={() => setIsNotificationOpen(true)}
      />

      {/* Main Tab Content Area with Stable Keying to prevent layout jumping */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 safe-pb">
        {activeTab === 'patient' && <PatientPortal lastEventTime={lastEventTime} />}
        {activeTab === 'doctor' && <DoctorDashboard lastEventTime={lastEventTime} />}
        {activeTab === 'reception' && <ReceptionLiveBoard lastEventTime={lastEventTime} />}
        {activeTab === 'analytics' && <AuditAndAnalytics lastEventTime={lastEventTime} />}
      </main>

      {/* Responsive Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 sm:py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm safe-pb">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>QueueSense (PS7)</strong> — Outpatient Velocity & Wait-Time Tracker
          </span>
          <span className="text-[11px] text-slate-400">
            GradientBoostingRegressor + EMA Fallback • SSE Live Streaming • Zero False Precision
          </span>
        </div>
      </footer>

      {/* Slide-out Notification Drawer */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainAppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
