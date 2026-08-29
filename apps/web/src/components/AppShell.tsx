import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { NavSection } from '../types';

interface AppShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenNotifications?: () => void;
  onOpenDemoControls?: () => void;
  onSwitchToPatientView?: () => void;
  onExitToLanding?: () => void;
  selectedDepartment?: string;
  onSelectDepartment?: (dept: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeSection,
  onSelectSection,
  onOpenNotifications,
  onOpenDemoControls,
  onSwitchToPatientView,
  selectedDepartment,
  onSelectDepartment,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const closeMobileNav = () => setIsMobileNavOpen(false);

  // Mobile drawer — rendered via portal so it escapes the flex layout and
  // covers the full viewport (not just the content column).
  const mobileDrawer = isMobileNavOpen
    ? ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] md:hidden"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={closeMobileNav}
          />
          {/* Drawer panel — slides in from the left */}
          <div
            className="absolute left-0 top-0 h-full w-72 shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              activeSection={activeSection}
              onSelectSection={(sec) => {
                onSelectSection(sec);
                closeMobileNav();
              }}
              onOpenDemoControls={() => {
                onOpenDemoControls?.();
                closeMobileNav();
              }}
              onSwitchToPatientView={() => {
                onSwitchToPatientView?.();
                closeMobileNav();
              }}
            />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="min-h-screen min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Left Sidebar (Desktop / Tablet only) ───────────────────────── */}
      <div className="hidden md:block">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={onSelectSection}
          onOpenDemoControls={onOpenDemoControls || (() => {})}
          onSwitchToPatientView={onSwitchToPatientView || (() => {})}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* ── Mobile Sidebar Portal ──────────────────────────────────────── */}
      {mobileDrawer}

      {/* ── Main Application Column — always full width on mobile ──────── */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top Header */}
        <TopHeader
          activeSection={activeSection}
          onOpenNotifications={onOpenNotifications || (() => {})}
          onOpenDemoControls={onOpenDemoControls || (() => {})}
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
          selectedDepartment={selectedDepartment}
          onSelectDepartment={onSelectDepartment}
          onSelectSection={onSelectSection}
        />

        {/* Workspace Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

