import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { api } from '../services/api';

export interface LoginResult {
  success: boolean;
  error?: string;
  emailNotConfirmed?: boolean;
  userRole?: UserRole;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
  emailConfirmationRequired?: boolean;
}

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password?: string, roleHint?: UserRole) => Promise<LoginResult>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<RegisterResult>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  devConfirmAndLogin: (email: string, roleHint?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  switchDemoRole: (role: UserRole) => void;
  isSupabaseLive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSupabaseLive] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const savedSession = localStorage.getItem('app_session_user');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.id) {
            // Verify profile from database
            const res = await fetch(`/api/profiles/${encodeURIComponent(parsed.id)}`);
            if (res.ok) {
              const liveProfile = await res.json();
              setUser({ id: liveProfile.id, email: liveProfile.email });
              setProfile(liveProfile);
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore session from database:', e);
      }

      const isAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register');
      if (isAuthPage) {
        setLoading(false);
        return;
      }

      // Default demo faculty session so the app works seamlessly out of the box
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'ramesh.faculty@university.edu', roleHint: 'faculty' })
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setProfile(data.profile);
          localStorage.setItem('app_session_user', JSON.stringify(data.user));
        }
      } catch (err) {
        console.warn('Initial auth notice:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password = '', roleHint?: UserRole): Promise<LoginResult> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, roleHint })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }));
        setLoading(false);
        return { success: false, error: err.error || 'Login failed' };
      }

      const data = await res.json();
      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem('app_session_user', JSON.stringify(data.user));
      setLoading(false);
      return { success: true, userRole: data.profile.role as UserRole };
    } catch (err: unknown) {
      setLoading(false);
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<RegisterResult> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name.trim(), email: cleanEmail, password, role })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Registration failed' }));
        setLoading(false);
        return { success: false, error: err.error || 'Registration failed' };
      }

      const data = await res.json();
      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem('app_session_user', JSON.stringify(data.user));
      setLoading(false);
      return { success: true, emailConfirmationRequired: false };
    } catch (err: unknown) {
      setLoading(false);
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
    }
  };

  const resendConfirmationEmail = async (): Promise<{ success: boolean; error?: string }> => {
    return { success: true };
  };

  const devConfirmAndLogin = async (email: string, roleHint: UserRole = 'faculty'): Promise<{ success: boolean; error?: string }> => {
    return login(email, 'password123', roleHint);
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('app_session_user');
  };

  const updateProfile = async (fullName: string): Promise<boolean> => {
    if (!profile) return false;
    try {
      const updated = await api.updateProfile(profile.id, { full_name: fullName });
      setProfile(updated);
      return true;
    } catch {
      return false;
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    if (!profile) return false;
    try {
      await api.deleteAccount(profile.id);
      await logout();
      return true;
    } catch {
      return false;
    }
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    const targetEmail = targetRole === 'admin' 
      ? 'admin.portal@university.edu' 
      : 'ramesh.faculty@university.edu';
    await login(targetEmail, 'password123', targetRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        loading,
        login,
        register,
        resendConfirmationEmail,
        devConfirmAndLogin,
        logout,
        updateProfile,
        deleteAccount,
        switchDemoRole,
        isSupabaseLive
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
