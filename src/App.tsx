import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { DriverMobileLayout } from './components/driver/DriverMobileLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { PublicApprovalPage } from './components/approval/PublicApprovalPage';
import { NotificationToast } from './components/common/NotificationToast';
import { SimulatedEmailModal } from './components/common/SimulatedEmailModal';

const AppContent: React.FC = () => {
  const { user, activePublicApprovalToken, setActivePublicApprovalToken } = useAuth();

  // 1. If Higher Authority clicked an email approval link token
  if (activePublicApprovalToken) {
    return (
      <PublicApprovalPage
        token={activePublicApprovalToken}
        onExit={() => setActivePublicApprovalToken(null)}
      />
    );
  }

  // 2. If User is not logged in, show Login Screen with 1-click driver/admin demo switchers
  if (!user) {
    return <LoginPage />;
  }

  // 3. If User is a Driver, render the dedicated mobile-styled driver app
  if (user.role === 'DRIVER') {
    return <DriverMobileLayout />;
  }

  // 4. If User is Admin, render the comprehensive desktop & responsive admin management dashboard
  return <AdminLayout />;
};

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        <AppContent />
        <NotificationToast />
        <SimulatedEmailModal />
      </div>
    </AuthProvider>
  );
}
