import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Employee, ApprovalRequest } from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  durationMs?: number;
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  token: string | null;
  role: 'ADMIN' | 'DRIVER' | null;
  isLoading: boolean;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message?: string, durationMs?: number) => void;
  removeToast: (id: string) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  activePublicApprovalToken: string | null;
  setActivePublicApprovalToken: (token: string | null) => void;
  isEmailInboxOpen: boolean;
  setIsEmailInboxOpen: (open: boolean) => void;
  latestApprovalRequest: ApprovalRequest | null;
  setLatestApprovalRequest: (req: ApprovalRequest | null) => void;
  refreshUserData: () => Promise<void>;
  switchToDriverPreview: (driverUsername: string) => Promise<void>;
  switchToAdminPreview: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'DRIVER' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activePublicApprovalToken, setActivePublicApprovalToken] = useState<string | null>(null);
  const [isEmailInboxOpen, setIsEmailInboxOpen] = useState<boolean>(false);
  const [latestApprovalRequest, setLatestApprovalRequest] = useState<ApprovalRequest | null>(null);

  // Handle online/offline network events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('info', 'Connection Restored', 'Back online. Any pending attendance sync will start.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('warning', 'Offline Mode', 'No internet connection. Attendance and odometer will be queued locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = useCallback((type: ToastMessage['type'], title: string, message?: string, durationMs = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message, durationMs }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check URL params for direct approval token (e.g. ?approve_token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apprToken = params.get('approve_token');
    if (apprToken) {
      setActivePublicApprovalToken(apprToken);
    }
  }, []);

  // Initial load check
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    const savedToken = localStorage.getItem('auth_token');

    if (savedUser && savedToken) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setEmployee(parsed.employee || null);
        setRole(parsed.role);
        setToken(savedToken);
      } catch {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    } else {
      // Default to Driver DR001 for immediate review
      login('rakesh001', 'driver123').catch(() => {});
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      setUser(data.user);
      setEmployee(data.user.employee || null);
      setRole(data.user.role);
      setToken(data.token);

      localStorage.setItem('auth_user', JSON.stringify(data.user));
      localStorage.setItem('auth_token', data.token);

      showToast('success', 'Signed In', `Welcome, ${data.user.employee?.name || data.user.username}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Network error connecting to backend server.' };
    }
  };

  const logout = () => {
    setUser(null);
    setEmployee(null);
    setRole(null);
    setToken(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    showToast('info', 'Logged Out', 'You have been signed out.');
  };

  const refreshUserData = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'x-user-id': user.id },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEmployee(data.user.employee || null);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  const switchToDriverPreview = async (driverUsername: string) => {
    await login(driverUsername, 'driver123');
  };

  const switchToAdminPreview = async () => {
    await login('admin', 'admin123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        token,
        role,
        isLoading,
        isOnline,
        setIsOnline,
        toasts,
        showToast,
        removeToast,
        login,
        logout,
        activePublicApprovalToken,
        setActivePublicApprovalToken,
        isEmailInboxOpen,
        setIsEmailInboxOpen,
        latestApprovalRequest,
        setLatestApprovalRequest,
        refreshUserData,
        switchToDriverPreview,
        switchToAdminPreview,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
