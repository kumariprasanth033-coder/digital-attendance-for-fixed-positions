import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { api, localDb } from '../services/api';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password?: string, roleHint?: UserRole) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
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
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(isSupabaseConfigured());

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const configured = isSupabaseConfigured();
      setIsSupabaseLive(configured);

      if (configured) {
        try {
          const client = getSupabase();
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            // Fetch profile
            const { data: prof } = await client
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (prof) {
              setProfile(prof as Profile);
            }
          }
        } catch (e) {
          console.warn('Supabase auth session check failed, falling back:', e);
        }
      }

      // If no active session found from Supabase, check local saved session
      const savedUserStr = localStorage.getItem('app_current_user');
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          setUser({ id: parsed.id, email: parsed.email });
          setProfile(parsed);
        } catch {
          // ignore
        }
      } else {
        // Default to demo faculty session for instant seamless usability
        const defaultProfile = localDb.getProfiles().find(p => p.role === 'faculty') || {
          id: 'faculty-demo-001',
          full_name: 'Dr. Ramesh Kumar',
          email: 'ramesh.faculty@university.edu',
          role: 'faculty' as UserRole,
          account_status: 'active' as const,
          created_at: new Date().toISOString()
        };
        setUser({ id: defaultProfile.id, email: defaultProfile.email });
        setProfile(defaultProfile);
        localStorage.setItem('app_current_user', JSON.stringify(defaultProfile));
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password = '', roleHint?: UserRole): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const configured = isSupabaseConfigured();

    if (configured && password) {
      try {
        const client = getSupabase();
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          setLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email || '' });
          // Fetch profile
          const { data: prof } = await client
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const activeProf: Profile = prof || {
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            email: data.user.email || email,
            role: (data.user.user_metadata?.role as UserRole) || roleHint || 'faculty',
            account_status: 'active',
            created_at: new Date().toISOString()
          };

          setProfile(activeProf);
          localStorage.setItem('app_current_user', JSON.stringify(activeProf));
          setLoading(false);
          return { success: true };
        }
      } catch (err: unknown) {
        console.warn('Supabase login error:', err);
      }
    }

    // Local authentication lookup / fallback
    const profiles = localDb.getProfiles();
    const existing = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      setUser({ id: existing.id, email: existing.email });
      setProfile(existing);
      localStorage.setItem('app_current_user', JSON.stringify(existing));
      setLoading(false);
      return { success: true };
    }

    // If logging in with demo or any email when unconfigured
    const newProf: Profile = {
      id: `usr-${Date.now()}`,
      full_name: email.split('@')[0].replace(/[._]/g, ' '),
      email,
      role: roleHint || (email.includes('admin') ? 'admin' : 'faculty'),
      account_status: 'active',
      created_at: new Date().toISOString()
    };

    localDb.setProfiles([...profiles, newProf]);
    setUser({ id: newProf.id, email: newProf.email });
    setProfile(newProf);
    localStorage.setItem('app_current_user', JSON.stringify(newProf));
    setLoading(false);
    return { success: true };
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const configured = isSupabaseConfigured();

    if (configured) {
      try {
        const client = getSupabase();
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              role
            }
          }
        });

        if (error) {
          setLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            full_name: name.trim(),
            email: email.trim(),
            role,
            account_status: 'active',
            created_at: new Date().toISOString()
          };

          // Upsert into public.profiles
          await client.from('profiles').upsert([newProfile]);
          setUser({ id: data.user.id, email: data.user.email || email });
          setProfile(newProfile);
          localStorage.setItem('app_current_user', JSON.stringify(newProfile));
          setLoading(false);
          return { success: true };
        }
      } catch (err: unknown) {
        console.warn('Supabase register error:', err);
      }
    }

    // Local registration
    const profiles = localDb.getProfiles();
    if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
      setLoading(false);
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newProfile: Profile = {
      id: `usr-${Date.now()}`,
      full_name: name.trim(),
      email: email.trim(),
      role,
      account_status: 'active',
      created_at: new Date().toISOString()
    };

    localDb.setProfiles([newProfile, ...profiles]);
    setUser({ id: newProfile.id, email: newProfile.email });
    setProfile(newProfile);
    localStorage.setItem('app_current_user', JSON.stringify(newProfile));
    setLoading(false);
    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        await client.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem('app_current_user');
  };

  const updateProfile = async (fullName: string): Promise<boolean> => {
    if (!profile) return false;
    try {
      const updated = await api.updateProfile(profile.id, { full_name: fullName });
      setProfile(updated);
      localStorage.setItem('app_current_user', JSON.stringify(updated));
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

  const switchDemoRole = (targetRole: UserRole) => {
    const profiles = localDb.getProfiles();
    const match = profiles.find(p => p.role === targetRole) || {
      id: targetRole === 'admin' ? 'admin-demo-001' : 'faculty-demo-001',
      full_name: targetRole === 'admin' ? 'Admin Dean Office' : 'Dr. Ramesh Kumar',
      email: targetRole === 'admin' ? 'admin.portal@university.edu' : 'ramesh.faculty@university.edu',
      role: targetRole,
      account_status: 'active' as const,
      created_at: new Date().toISOString()
    };

    setUser({ id: match.id, email: match.email });
    setProfile(match);
    localStorage.setItem('app_current_user', JSON.stringify(match));
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
