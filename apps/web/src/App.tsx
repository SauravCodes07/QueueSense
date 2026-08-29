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
import { Activity } from 'lucide-react';

function getInitialSectionFromHash(): NavSection {
  const hash = window.location.hash.replace(/^#\/?/, '').replace(/-/g, '_');
  const validSections: NavSection[] = [
    'overview',
    'live_queues',
    'patients',
    'doctors',
    'analytics',
    'notifications',
    'settings',
    'patient_portal',
    'doctor_console',
    'admin_overview',
  ];
  if (validSections.includes(hash as NavSection)) {
    return hash as NavSection;
  }
  const saved = localStorage.getItem('queuesense_active_section');
  if (saved && validSections.includes(saved as NavSection)) {
    return saved as NavSection;
  }
  return 'overview';
}

const MainAppRouter: React.FC = () => {
  const { user, session, isAuthenticated, isLoading, activeDoctorId, patientToken, setPatientToken, loginAs, signOut } = useAuth();
  const { addNotification } = useNotifications();

  const [activeSection, setActiveSection] = useState<NavSection>(getInitialSectionFromHash);
  const [initialPatientToken, setInitialPatientToken] = useState<string | undefined>(undefined);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('General Medicine (GM)');

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now());

  // Synchronize section changes to URL hash & localStorage for refresh persistence
  const handleSelectSection = (section: NavSection) => {
    setActiveSection(section);
    localStorage.setItem('queuesense_active_section', section);
    window.location.hash = `#${section.replace(/_/g, '-')}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hash listener for browser forward/back buttons
  useEffect(() => {
    const handleHashChange = () => {
      const sec = getInitialSectionFromHash();
      setActiveSection(sec);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // SSE Stream Listener for Active Doctor's Queue
  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [activeDoctorId, isAuthenticated]);

  // SSE Stream Listener for Active Patient's Token
  useEffect(() => {
    if (!isAuthenticated || !patientToken) return;

    const patientStream = new SSEStreamManager(`/patients/${patientToken}`, {
      onETAUpdate: (data) => {
        setLastEventTime(Date.now());
        if (data.reason && data.reason !== 'connected') {
          addNotification(
            'ETA Updated',
            `Your estimated wait is now ${data.eta_low_minutes || 10}–${data.eta_high_minutes || 20} min.`,
            'info'
          );
        }
      },
    });

    return () => {
      patientStream.disconnect();
    };
  }, [patientToken, isAuthenticated]);

  const handleEnterPortalFromLanding = (
    role?: 'patient' | 'doctor' | 'reception' | 'analytics',
    token?: string
  ) => {
    if (token) {
      setPatientToken(token);
      setInitialPatientToken(token);
    }

    if (role === 'patient') {
      handleSelectSection('patient_portal');
    } else if (role === 'doctor') {
      loginAs('sharma');
      handleSelectSection('doctor_console');
    } else if (role === 'reception') {
      loginAs('reception');
      handleSelectSection('live_queues');
    } else if (role === 'analytics') {
      loginAs('admin');
      handleSelectSection('overview');
    } else {
      handleSelectSection('overview');
    }
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    handleSelectSection('overview');
  };

  const handleTriggerStateMutated = () => {
    setLastEventTime(Date.now());
  };

  const handleResetDemoState = async () => {
    try {
      await fetch('http://localhost:8000/api/v1/demo/reset', { method: 'POST' });
      setLastEventTime(Date.now());
      addNotification('Demo State Reset', 'Initial database dataset reseeded.', 'success');
    } catch {
      addNotification('Demo Reset Notice', 'Reset completed.', 'info');
    }
  };

  // 1. Loading state while Supabase restores session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-teal-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center animate-pulse">
            <span className="font-display font-bold text-sm text-teal-400">QS</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Restoring secure session...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Strict Landing Page Gate
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage
          onEnterPortal={handleEnterPortalFromLanding}
          onOpenDemoControls={() => setIsDemoModalOpen(true)}
          onOpenAuthModal={handleOpenAuthModal}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          onSuccess={handleAuthSuccess}
        />

        <DemoControlModal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
          activeDoctorId={activeDoctorId}
          onStateMutated={handleTriggerStateMutated}
        />
      </>
    );
  }

  // 3. Authenticated: Protected Hospital Operations Workspace
  return (
    <>
      <AppShell
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onOpenDemoControls={() => setIsDemoModalOpen(true)}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        onResetDemo={handleResetDemoState}
      >
        {/* Section 1: Admin Overview */}
        {activeSection === 'overview' && (
          <AdminOverview
            onNavigate={handleSelectSection}
            onSelectDepartment={setSelectedDepartment}
            lastEventTime={lastEventTime}
          />
        )}

        {/* Section 2: Live Queue Board */}
        {activeSection === 'live_queues' && (
          <ReceptionLiveBoard lastEventTime={lastEventTime} />
        )}

        {/* Section 3: Patient Portal / Ticket Live Tracker */}
        {activeSection === 'patient_portal' && (
          <PatientPortal
            lastEventTime={lastEventTime}
            initialToken={initialPatientToken}
          />
        )}

        {/* Section 4: Doctor Console */}
        {activeSection === 'doctor_console' && (
          <DoctorConsole lastEventTime={lastEventTime} />
        )}

        {/* Section 5: Admin Overview (Dedicated) */}
        {activeSection === 'admin_overview' && (
          <AdminOverview
            onNavigate={handleSelectSection}
            onSelectDepartment={setSelectedDepartment}
            lastEventTime={lastEventTime}
          />
        )}

        {/* Section 6: Patients Roster */}
        {activeSection === 'patients' && (
          <PatientsPage />
        )}

        {/* Section 7: Specialist Directory & Roster */}
        {activeSection === 'doctors' && (
          <DoctorsPage />
        )}

        {/* Section 8: Analytics & Audit Log */}
        {activeSection === 'analytics' && (
          <AuditAndAnalytics lastEventTime={lastEventTime} />
        )}

        {/* Section 9: Notifications */}
        {activeSection === 'notifications' && (
          <NotificationsPage />
        )}

        {/* Section 10: Settings */}
        {activeSection === 'settings' && (
          <SettingsPage />
        )}
      </AppShell>

      {/* Slide-out Notification Drawer */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Demo Sandbox Modal */}
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
