import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
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
import { NavSection, UserRole } from './types';

const ROLE_ALLOWED_SECTIONS: Record<string, NavSection[]> = {
  ADMIN: [
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
  ],
  DOCTOR: [
    'doctor_console',
    'live_queues',
    'patients',
    'doctors',
    'notifications',
  ],
  RECEPTION: [
    'overview',
    'live_queues',
    'patients',
    'doctors',
    'notifications',
    'patient_portal',
  ],
  PATIENT: ['patient_portal'],
};

const DEFAULT_ROLE_SECTION: Record<string, NavSection> = {
  ADMIN: 'overview',
  DOCTOR: 'doctor_console',
  RECEPTION: 'live_queues',
  PATIENT: 'patient_portal',
};

function getInitialSectionFromHash(role: string = 'ADMIN'): NavSection {
  const hash = window.location.hash.replace(/^#\/?/, '').replace(/-/g, '_');
  const allowed = ROLE_ALLOWED_SECTIONS[role] || ROLE_ALLOWED_SECTIONS.ADMIN;

  if (allowed.includes(hash as NavSection)) {
    return hash as NavSection;
  }
  const saved = localStorage.getItem('queuesense_active_section');
  if (saved && allowed.includes(saved as NavSection)) {
    return saved as NavSection;
  }
  return DEFAULT_ROLE_SECTION[role] || 'overview';
}

const MainAppRouter: React.FC = () => {
  const { user, isAuthenticated, isLoading, activeDoctorId, patientToken, setPatientToken, loginAs } = useAuth();
  const { addNotification } = useNotifications();

  const userRole = user?.role || 'ADMIN';
  const allowedSections = useMemo(() => ROLE_ALLOWED_SECTIONS[userRole] || ROLE_ALLOWED_SECTIONS.ADMIN, [userRole]);

  const [activeSection, setActiveSection] = useState<NavSection>(() => getInitialSectionFromHash(userRole));
  const [initialPatientToken, setInitialPatientToken] = useState<string | undefined>(undefined);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('General Medicine (GM)');

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now());

  // Enforce RBAC route access whenever user role changes
  useEffect(() => {
    if (!allowedSections.includes(activeSection)) {
      const fallback = DEFAULT_ROLE_SECTION[userRole] || 'overview';
      setActiveSection(fallback);
      localStorage.setItem('queuesense_active_section', fallback);
      window.location.hash = `#${fallback.replace(/_/g, '-')}`;
    }
  }, [userRole, allowedSections, activeSection]);

  // Synchronize section changes to URL hash & localStorage with RBAC check
  const handleSelectSection = (section: NavSection) => {
    const targetSection = allowedSections.includes(section) ? section : (DEFAULT_ROLE_SECTION[userRole] || 'overview');
    setActiveSection(targetSection);
    localStorage.setItem('queuesense_active_section', targetSection);
    window.location.hash = `#${targetSection.replace(/_/g, '-')}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hash listener for browser forward/back buttons
  useEffect(() => {
    const handleHashChange = () => {
      const sec = getInitialSectionFromHash(userRole);
      setActiveSection(sec);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [userRole]);

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
    handleSelectSection(DEFAULT_ROLE_SECTION[userRole] || 'overview');
  };

  const handleTriggerStateMutated = () => {
    setLastEventTime(Date.now());
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

  // 3. Authenticated: Protected Hospital Operations Workspace with RBAC routing
  return (
    <>
      <AppShell
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onOpenDemoControls={() => setIsDemoModalOpen(true)}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
      >
        {/* Section 1: Overview */}
        {activeSection === 'overview' && allowedSections.includes('overview') && (
          <AdminOverview
            onNavigate={handleSelectSection}
            onSelectDepartment={setSelectedDepartment}
            lastEventTime={lastEventTime}
          />
        )}

        {/* Section 2: Live Queue Board */}
        {activeSection === 'live_queues' && allowedSections.includes('live_queues') && (
          <ReceptionLiveBoard lastEventTime={lastEventTime} />
        )}

        {/* Section 3: Patient Portal / Ticket Live Tracker */}
        {activeSection === 'patient_portal' && allowedSections.includes('patient_portal') && (
          <PatientPortal
            lastEventTime={lastEventTime}
            initialToken={initialPatientToken}
          />
        )}

        {/* Section 4: Doctor Console */}
        {activeSection === 'doctor_console' && allowedSections.includes('doctor_console') && (
          <DoctorConsole lastEventTime={lastEventTime} />
        )}

        {/* Section 5: Admin Overview (Dedicated) */}
        {activeSection === 'admin_overview' && allowedSections.includes('admin_overview') && (
          <AdminOverview
            onNavigate={handleSelectSection}
            onSelectDepartment={setSelectedDepartment}
            lastEventTime={lastEventTime}
          />
        )}

        {/* Section 6: Patients Roster */}
        {activeSection === 'patients' && allowedSections.includes('patients') && (
          <PatientsPage />
        )}

        {/* Section 7: Specialist Directory & Roster */}
        {activeSection === 'doctors' && allowedSections.includes('doctors') && (
          <DoctorsPage />
        )}

        {/* Section 8: Analytics & Audit Log */}
        {activeSection === 'analytics' && allowedSections.includes('analytics') && (
          <AuditAndAnalytics lastEventTime={lastEventTime} />
        )}

        {/* Section 9: Notifications */}
        {activeSection === 'notifications' && allowedSections.includes('notifications') && (
          <NotificationsPage />
        )}

        {/* Section 10: Settings (Admin Only) */}
        {activeSection === 'settings' && allowedSections.includes('settings') && (
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
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <QueueProvider>
              <MainAppRouter />
            </QueueProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
