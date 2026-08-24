import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Attendance } from '../../types';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Gauge,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
  Settings,
  Mail,
  LogOut,
  Menu,
  X,
  Truck,
  Plus,
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminDrivers } from './AdminDrivers';
import { AdminAttendance } from './AdminAttendance';
import { AdminOdometer } from './AdminOdometer';
import { AdminOdooExport } from './AdminOdooExport';
import { AdminReports } from './AdminReports';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminSettings } from './AdminSettings';
import { MapViewerModal } from '../common/MapViewerModal';

export const AdminLayout: React.FC = () => {
  const { user, logout, isEmailInboxOpen, setIsEmailInboxOpen, unreadEmailCount } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mapAttendance, setMapAttendance] = useState<Attendance | null>(null);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
    { id: 'odometer', label: 'Odometer Logs', icon: Gauge },
    { id: 'odoo-export', label: 'Odoo 19 Export', icon: FileSpreadsheet, badge: 'Odoo 19' },
    { id: 'reports', label: 'Reports (10)', icon: BarChart3 },
    { id: 'audit-logs', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row selection:bg-blue-500 selection:text-white">
      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div>
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight text-slate-100">TRANS-LOGIX</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Driver Attendance</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <span className="font-bold text-slate-200 block truncate">{user?.username}</span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase">Administrator</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-slate-200 bg-slate-900 rounded-xl border border-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs text-slate-500 font-mono">Operations &bull; {activeSection.toUpperCase()}</span>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEmailInboxOpen(true)}
              className="relative p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer"
              title="Higher Authority Simulated Email Inbox"
            >
              <Mail className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Authority Inbox</span>
              {unreadEmailCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-950 animate-bounce">
                  {unreadEmailCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeSection === 'dashboard' && (
            <AdminDashboard
              onNavigate={(section) => setActiveSection(section)}
              onOpenMap={(att) => setMapAttendance(att)}
              onCreateDriver={() => setActiveSection('drivers')}
            />
          )}
          {activeSection === 'drivers' && <AdminDrivers />}
          {activeSection === 'attendance' && (
            <AdminAttendance onOpenMap={(att) => setMapAttendance(att)} />
          )}
          {activeSection === 'odometer' && <AdminOdometer />}
          {activeSection === 'odoo-export' && <AdminOdooExport />}
          {activeSection === 'reports' && <AdminReports />}
          {activeSection === 'audit-logs' && <AdminAuditLogs />}
          {activeSection === 'settings' && <AdminSettings />}
        </main>
      </div>

      {/* Map Modal */}
      {mapAttendance && <MapViewerModal attendance={mapAttendance} onClose={() => setMapAttendance(null)} />}
    </div>
  );
};
