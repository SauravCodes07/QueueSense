import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { LandingPage } from './components/LandingPage';
import { AppShell } from './components/AppShell';
import { OverviewDashboard } from './components/OverviewDashboard';
import { PatientPortal } from './components/PatientPortal';
import { DoctorDashboard } from './components/DoctorDashboard';
import { ReceptionLiveBoard } from './components/ReceptionLiveBoard';
import { AuditAndAnalytics } from './components/AuditAndAnalytics';
import { NotificationCenter } from './components/NotificationCenter';
import { DemoControlModal } from './components/DemoControlModal';
import { SSEStreamManager, SSEConnectionStatus } from './services/sse';
import { NavSection } from './types';

const MainAppRouter: React.FC = () => {
  // Top-level mode: 'landing' vs 'app'
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [initialPatientToken, setInitialPatientToken] = useState<string | undefined>(undefined);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now());

  const { activeDoctorId, patientToken, setPatientToken, loginAs } = useAuth();
  const { addNotification } = useNotifications();

  // SSE Stream Listener for Active Doctor's Queue
  useEffect(() => {
    const doctorStream = new SSEStreamManager(`/doctors/${activeDoctorId}/queue`, {
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

  const handleEnterPortalFromLanding = (
    role?: 'patient' | 'doctor' | 'reception' | 'analytics',
    token?: string
  ) => {
    if (token) {
      setPatientToken(token);
      setInitialPatientToken(token);
    }

    if (role === 'patient') {
      setActiveSection('patient_portal');
    } else if (role === 'doctor') {
      loginAs('sharma');
      setActiveSection('doctors');
    } else if (role === 'reception') {
      loginAs('reception');
      setActiveSection('live_queues');
    } else if (role === 'analytics') {
      loginAs('admin');
      setActiveSection('overview');
    } else {
      setActiveSection('overview');
    }

    setViewMode('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTriggerStateMutated = () => {
    setLastEventTime(Date.now());
  };

  return (
    <>
      {viewMode === 'landing' ? (
        <LandingPage
          onEnterPortal={handleEnterPortalFromLanding}
          onOpenDemoControls={() => setIsDemoModalOpen(true)}
        />
      ) : (
        <AppShell
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onOpenDemoControls={() => setIsDemoModalOpen(true)}
          onSwitchToPatientView={() => setActiveSection('patient_portal')}
          onExitToLanding={() => setViewMode('landing')}
        >
          {/* Section 1: Overview Dashboard (Matching Reference Image) */}
          {activeSection === 'overview' && (
            <OverviewDashboard
              onNavigate={setActiveSection}
              onOpenWalkInModal={() => setActiveSection('patient_portal')}
              onOpenTransferModal={() => setActiveSection('live_queues')}
              lastEventTime={lastEventTime}
            />
          )}

          {/* Section 2: Live Queues & Transfers */}
          {(activeSection === 'live_queues' || activeSection === 'transfers') && (
            <ReceptionLiveBoard lastEventTime={lastEventTime} />
          )}

          {/* Section 3: Clinician Console & Workload */}
          {(activeSection === 'doctors' || activeSection === 'workload' || activeSection === 'no_shows') && (
            <DoctorDashboard lastEventTime={lastEventTime} />
          )}

          {/* Section 4: Audit Trail, Analytics & Alerts */}
          {(activeSection === 'audit_trail' || activeSection === 'analytics' || activeSection === 'priority_alerts') && (
            <AuditAndAnalytics lastEventTime={lastEventTime} />
          )}

          {/* Section 5: Dedicated Patient Portal */}
          {activeSection === 'patient_portal' && (
            <PatientPortal
              lastEventTime={lastEventTime}
              initialToken={initialPatientToken}
            />
          )}

          {/* Section 6: System Departments / Users / Settings Views */}
          {(activeSection === 'departments' || activeSection === 'users' || activeSection === 'settings') && (
            <div className="clinical-card p-8 text-center space-y-4">
              <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white capitalize">
                {activeSection} Configuration
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hospital parameters, clinician speed calibration, and automated queue recalculation settings are active.
              </p>
              <div className="pt-4 flex justify-center space-x-3">
                <button
                  onClick={() => setActiveSection('overview')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                >
                  Return to Overview Dashboard
                </button>
              </div>
            </div>
          )}
        </AppShell>
      )}

      {/* Slide-out Notification Drawer */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Restricted Developer / Incident Simulation Sandbox Modal */}
      <DemoControlModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        activeDoctorId={activeDoctorId}
        onStateMutated={handleTriggerStateMutated}
      />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainAppRouter />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
