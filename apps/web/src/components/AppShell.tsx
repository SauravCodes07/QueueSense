import React, { useState } from 'react';
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Left Sidebar (Desktop / Tablet) ─────────────────────────── */}
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

      {/* ── Mobile Sidebar Drawer ───────────────────────────────────── */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm md:hidden animate-in fade-in"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div
            className="w-72 h-full bg-slate-900 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              activeSection={activeSection}
              onSelectSection={(sec) => {
                onSelectSection(sec);
                setIsMobileNavOpen(false);
              }}
              onOpenDemoControls={() => {
                onOpenDemoControls?.();
                setIsMobileNavOpen(false);
              }}
              onSwitchToPatientView={() => {
                onSwitchToPatientView?.();
                setIsMobileNavOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Main Application Column ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
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
