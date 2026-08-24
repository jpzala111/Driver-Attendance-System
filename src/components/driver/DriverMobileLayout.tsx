import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Attendance } from '../../types';
import { Home, CalendarCheck2, Gauge, User, Wifi, WifiOff, LogOut, Truck } from 'lucide-react';
import { DriverHomeScreen } from './DriverHomeScreen';
import { DriverAttendanceScreen } from './DriverAttendanceScreen';
import { DriverOdometerScreen } from './DriverOdometerScreen';
import { DriverProfileScreen } from './DriverProfileScreen';
import { MapViewerModal } from '../common/MapViewerModal';

export const DriverMobileLayout: React.FC = () => {
  const { isOnline, setIsOnline, user, employee, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'HOME' | 'ATTENDANCE' | 'ODOMETER' | 'PROFILE'>('HOME');
  const [mapAttendance, setMapAttendance] = useState<Attendance | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Centered App Container */}
      <div className="w-full max-w-lg mx-auto flex flex-col min-h-screen bg-slate-950 sm:border-x sm:border-slate-800/80 shadow-2xl relative">
        {/* Modern App Top Header */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-100 tracking-tight">Driver Portal</h1>
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  {employee?.employee_code || 'DRIVER'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-xs">
                {employee?.name || user?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Online/Offline Toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                isOnline
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/50'
                  : 'bg-amber-950/60 text-amber-300 border-amber-600/60 animate-pulse'
              }`}
              title="Click to toggle offline mode"
            >
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-950/30 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Screen Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 bg-slate-950">
          {activeTab === 'HOME' && <DriverHomeScreen onOpenMap={(att) => setMapAttendance(att)} />}
          {activeTab === 'ATTENDANCE' && <DriverAttendanceScreen onOpenMap={(att) => setMapAttendance(att)} />}
          {activeTab === 'ODOMETER' && <DriverOdometerScreen />}
          {activeTab === 'PROFILE' && <DriverProfileScreen />}
        </main>

        {/* Sticky Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 max-w-lg mx-auto px-4 py-2 flex items-center justify-around shadow-2xl">
          {/* Tab 1: HOME */}
          <button
            onClick={() => setActiveTab('HOME')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'HOME'
                ? 'text-blue-400 font-bold bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'HOME' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">Home</span>
          </button>

          {/* Tab 2: ATTENDANCE */}
          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'ATTENDANCE'
                ? 'text-blue-400 font-bold bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck2 className={`w-5 h-5 ${activeTab === 'ATTENDANCE' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">History</span>
          </button>

          {/* Tab 3: ODOMETER */}
          <button
            onClick={() => setActiveTab('ODOMETER')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'ODOMETER'
                ? 'text-blue-400 font-bold bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className={`w-5 h-5 ${activeTab === 'ODOMETER' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">Odometer</span>
          </button>

          {/* Tab 4: PROFILE */}
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'text-blue-400 font-bold bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === 'PROFILE' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">Profile</span>
          </button>
        </nav>
      </div>

      {/* Map Modal */}
      {mapAttendance && <MapViewerModal attendance={mapAttendance} onClose={() => setMapAttendance(null)} />}
    </div>
  );
};
