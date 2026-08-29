import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { QueueProvider } from './context/QueueContext';
import { LandingPage } from './components/LandingPage';
import { AppShell } from './components/AppShell';
import { AdminOverview } from './components/AdminOverview';
import { PatientPortal } from './components/PatientPortal';
import { DoctorConsole } from './components/DoctorConsole';
import { ReceptionLiveBoard } from './components/ReceptionLiveBoard';
import { PatientsPage } from './components/PatientsPage';
import { DoctorsPage } from './components/DoctorsPage';
import { NotificationsPage } from './components/NotificationsPage';
import { SettingsPage } from './components/SettingsPage';
import { AuditAndAnalytics } from './components/AuditAndAnalytics';
import { NotificationCenter } from './components/NotificationCenter';
import { DemoControlModal } from './components/DemoControlModal';
import { AuthModal } from './components/AuthModal';
import { SSEStreamManager } from './services/sse';
import { NavSection } from './types';

const MainAppRouter: React.FC = () => {
  // Top-level mode: 'landing' vs 'app'
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [initialPatientToken, setInitialPatientToken] = useState<string | undefined>(undefined);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('General Medicine (GM)');

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
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
      setActiveSection('doctor_console');
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

  const handleOpenAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setViewMode('app');
    setActiveSection('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTriggerStateMutated = () => {
    setLastEventTime(Date.now());
  };

  const handleResetDemoState = async () => {
    try {
      await fetch('http://localhost:8000/api/v1/demo/reset', { method: 'POST' });
      setLastEventTime(Date.now());
      addNotification('Demo State Reset', 'Initial clean database dataset reseeded successfully.', 'success');
    } catch {
      addNotification('Demo Reset Notice', 'Reset state refreshed locally.', 'info');
    }
  };

  return (
    <>
      {viewMode === 'landing' ? (
        <LandingPage
          onEnterPortal={handleEnterPortalFromLanding}
          onOpenDemoControls={() => setIsDemoModalOpen(true)}
          onOpenAuthModal={handleOpenAuthModal}
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
          {/* Section 1: Overview & Admin Overview (Screenshot 4) */}
          {(activeSection === 'overview' || activeSection === 'admin_overview') && (
            <AdminOverview
              onNavigate={setActiveSection}
              onSelectDepartment={(dept) => {
                setSelectedDepartment(dept);
                setActiveSection('live_queues');
              }}
              lastEventTime={lastEventTime}
            />
          )}

          {/* Section 2: Live Queue Board */}
          {activeSection === 'live_queues' && (
            <ReceptionLiveBoard lastEventTime={lastEventTime} />
          )}

          {/* Section 3: Patients Roster & Walk-In Registration */}
          {activeSection === 'patients' && (
            <PatientsPage />
          )}

          {/* Section 4: Doctors Duty Roster */}
          {activeSection === 'doctors' && (
            <DoctorsPage />
          )}

          {/* Section 5: Doctor Console (Live Room Workspace) */}
          {activeSection === 'doctor_console' && (
            <DoctorConsole lastEventTime={lastEventTime} />
          )}

          {/* Section 6: Patient Live Tracker Portal (Screenshot 3) */}
          {activeSection === 'patient_portal' && (
            <PatientPortal
              lastEventTime={lastEventTime}
              initialToken={initialPatientToken}
            />
          )}

          {/* Section 7: Analytics & Audit Trail */}
          {(activeSection === 'analytics' || activeSection === 'audit_trail' || activeSection === 'workload' || activeSection === 'transfers') && (
            <AuditAndAnalytics lastEventTime={lastEventTime} />
          )}

          {/* Section 8: Operational Notifications Page */}
          {activeSection === 'notifications' && (
            <NotificationsPage />
          )}

          {/* Section 9: Settings Page (Screenshot 2) */}
          {activeSection === 'settings' && (
            <SettingsPage />
          )}
        </AppShell>
      )}

      {/* Supabase Production Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={handleAuthSuccess}
      />

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
          <QueueProvider>
            <MainAppRouter />
          </QueueProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
