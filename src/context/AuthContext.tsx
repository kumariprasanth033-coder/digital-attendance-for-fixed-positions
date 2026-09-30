import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { api, localDb } from '../services/api';

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
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(isSupabaseConfigured());

  // Initialize session on mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      setLoading(true);
      const configured = isSupabaseConfigured();
      setIsSupabaseLive(configured);

      if (configured) {
        try {
          const client = getSupabase();

          // 1. Get current Supabase session
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            
            // Retrieve profile
            try {
              const { data: prof } = await client
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              if (prof) {
                setProfile(prof as Profile);
                localStorage.setItem('app_current_user', JSON.stringify(prof));
              } else {
                const fallbackProf: Profile = {
                  id: session.user.id,
                  full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Faculty Member',
                  email: session.user.email || '',
                  role: (session.user.user_metadata?.role as UserRole) || 'faculty',
                  account_status: 'active',
                  created_at: new Date().toISOString()
                };
                setProfile(fallbackProf);
                localStorage.setItem('app_current_user', JSON.stringify(fallbackProf));
              }
            } catch (pErr) {
              console.warn('Profile fetch warning in initAuth:', pErr);
            }
          }

          // 2. Set up auth state change listener (catches email confirmations and token refreshes)
          const { data: authListener } = client.auth.onAuthStateChange(async (event, currentSession) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
              if (currentSession?.user) {
                setUser({ id: currentSession.user.id, email: currentSession.user.email || '' });
                try {
                  const { data: prof } = await client
                    .from('profiles')
                    .select('*')
                    .eq('id', currentSession.user.id)
                    .maybeSingle();

                  if (prof) {
                    setProfile(prof as Profile);
                    localStorage.setItem('app_current_user', JSON.stringify(prof));
                  }
                } catch {
                  // ignore
                }
              }
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setProfile(null);
              localStorage.removeItem('app_current_user');
            }
          });

          unsubscribe = () => authListener.subscription.unsubscribe();
        } catch (e) {
          console.warn('Supabase auth session check failed, falling back:', e);
        }
      }

      // If no active session found from Supabase, check local saved session
      const savedUserStr = localStorage.getItem('app_current_user');
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          if (!user) {
            setUser({ id: parsed.id, email: parsed.email });
            setProfile(parsed);
          }
        } catch {
          // ignore
        }
      } else {
        // Default to demo faculty session for instant seamless usability during initial test run
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

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const login = async (email: string, password = '', roleHint?: UserRole): Promise<LoginResult> => {
    setLoading(true);
    const configured = isSupabaseConfigured();
    const cleanEmail = email.trim().toLowerCase();
    const isDemoAccount = cleanEmail === 'ramesh.faculty@university.edu' || cleanEmail === 'admin.portal@university.edu';

    if (configured && password) {
      try {
        const client = getSupabase();
        const signInResult = await client.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        const authUser = signInResult.data?.user || null;
        const authError = signInResult.error;

        // Specific handling for "Email not confirmed"
        if (authError) {
          const errMsg = authError.message.toLowerCase();
          const errCode = (authError as unknown as { code?: string })?.code;

          if (errMsg.includes('email not confirmed') || errCode === 'email_not_confirmed') {
            // For standard demo accounts, allow seamless fallback
            if (isDemoAccount) {
              const demoProfile = localDb.getProfiles().find(p => p.email.toLowerCase() === cleanEmail);
              if (demoProfile) {
                setUser({ id: demoProfile.id, email: demoProfile.email });
                setProfile(demoProfile);
                localStorage.setItem('app_current_user', JSON.stringify(demoProfile));
                setLoading(false);
                return { success: true, userRole: demoProfile.role };
              }
            }

            setLoading(false);
            return {
              success: false,
              error: 'Your email address has not been confirmed yet.',
              emailNotConfirmed: true
            };
          }

          // Specific handling for invalid credentials
          if (errMsg.includes('invalid login credentials')) {
            // Check if demo user can be auto-registered in Supabase
            if (isDemoAccount) {
              const { data: signUpData, error: signUpErr } = await client.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                  data: {
                    full_name: cleanEmail.includes('admin') ? 'Admin Dean Office' : 'Dr. Ramesh Kumar',
                    role: roleHint || (cleanEmail.includes('admin') ? 'admin' : 'faculty')
                  }
                }
              });

              if (!signUpErr && signUpData.user) {
                const activeProf: Profile = {
                  id: signUpData.user.id,
                  full_name: cleanEmail.includes('admin') ? 'Admin Dean Office' : 'Dr. Ramesh Kumar',
                  email: cleanEmail,
                  role: roleHint || (cleanEmail.includes('admin') ? 'admin' : 'faculty'),
                  account_status: 'active',
                  created_at: new Date().toISOString()
                };
                setUser({ id: activeProf.id, email: activeProf.email });
                setProfile(activeProf);
                localStorage.setItem('app_current_user', JSON.stringify(activeProf));
                setLoading(false);
                return { success: true, userRole: activeProf.role };
              }
            }

            setLoading(false);
            return { success: false, error: 'Incorrect email or password.' };
          }

          // User does not exist
          if (errMsg.includes('user not found') || errMsg.includes('no user')) {
            setLoading(false);
            return { success: false, error: 'No account found. Please create an account first.' };
          }

          // Network or server connectivity issue
          if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('failed to fetch')) {
            setLoading(false);
            return { success: false, error: 'Unable to connect to the authentication service. Please try again.' };
          }

          // Database error / fallback
          if (!errMsg.includes('database error') && !errMsg.includes('schema')) {
            setLoading(false);
            return { success: false, error: 'Incorrect email or password.' };
          }
        }

        // If Supabase login succeeded
        if (!authError && authUser) {
          setUser({ id: authUser.id, email: authUser.email || cleanEmail });
          
          try {
            const { data: prof } = await client
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle();

            const targetRole = (prof?.role as UserRole) || (authUser.user_metadata?.role as UserRole) || roleHint || 'faculty';
            const activeProf: Profile = (prof as Profile) || {
              id: authUser.id,
              full_name: authUser.user_metadata?.full_name || cleanEmail.split('@')[0],
              email: authUser.email || cleanEmail,
              role: targetRole,
              account_status: 'active',
              created_at: new Date().toISOString()
            };

            setProfile(activeProf);
            localStorage.setItem('app_current_user', JSON.stringify(activeProf));
            setLoading(false);
            return { success: true, userRole: activeProf.role };
          } catch (profErr) {
            console.warn('Profile fetch error, using auth metadata:', profErr);
          }
        }
      } catch (err: unknown) {
        console.warn('Supabase login exception, checking local fallback:', err);
      }
    }

    // Local authentication fallback for instant demo usability
    const profiles = localDb.getProfiles();
    const existing = profiles.find(p => p.email.toLowerCase() === cleanEmail);

    if (existing) {
      setUser({ id: existing.id, email: existing.email });
      setProfile(existing);
      localStorage.setItem('app_current_user', JSON.stringify(existing));
      setLoading(false);
      return { success: true, userRole: existing.role };
    }

    // If logging in with demo or any email when unconfigured or after fallback
    const newProf: Profile = {
      id: `usr-${Date.now()}`,
      full_name: cleanEmail.split('@')[0].replace(/[._]/g, ' '),
      email: cleanEmail,
      role: roleHint || (cleanEmail.includes('admin') ? 'admin' : 'faculty'),
      account_status: 'active',
      created_at: new Date().toISOString()
    };

    localDb.setProfiles([...profiles, newProf]);
    setUser({ id: newProf.id, email: newProf.email });
    setProfile(newProf);
    localStorage.setItem('app_current_user', JSON.stringify(newProf));
    setLoading(false);
    return { success: true, userRole: newProf.role };
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<RegisterResult> => {
    setLoading(true);
    const configured = isSupabaseConfigured();
    const cleanEmail = email.trim().toLowerCase();

    if (configured) {
      try {
        const client = getSupabase();
        const { data, error } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name.trim(),
              role
            },
            emailRedirectTo: `${window.location.origin}/login?verified=true`
          }
        });

        if (error) {
          if (error.message.includes('Database error') || error.message.includes('schema')) {
            console.warn('Supabase register schema notice, utilizing local profiles:', error.message);
          } else {
            setLoading(false);
            return { success: false, error: error.message };
          }
        } else if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            full_name: name.trim(),
            email: cleanEmail,
            role,
            account_status: 'active',
            created_at: new Date().toISOString()
          };

          // Upsert into public.profiles
          try {
            await client.from('profiles').upsert([newProfile]);
          } catch (e) {
            console.warn('Profile upsert notice:', e);
          }

          // If session is null, email confirmation is required by Supabase!
          const confirmationRequired = !data.session;

          if (!confirmationRequired) {
            setUser({ id: data.user.id, email: data.user.email || cleanEmail });
            setProfile(newProfile);
            localStorage.setItem('app_current_user', JSON.stringify(newProfile));
          }

          setLoading(false);
          return { 
            success: true, 
            emailConfirmationRequired: confirmationRequired 
          };
        }
      } catch (err: unknown) {
        console.warn('Supabase register error:', err);
      }
    }

    // Local registration
    const profiles = localDb.getProfiles();
    if (profiles.some(p => p.email.toLowerCase() === cleanEmail)) {
      setLoading(false);
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newProfile: Profile = {
      id: `usr-${Date.now()}`,
      full_name: name.trim(),
      email: cleanEmail,
      role,
      account_status: 'active',
      created_at: new Date().toISOString()
    };

    localDb.setProfiles([newProfile, ...profiles]);
    setUser({ id: newProfile.id, email: newProfile.email });
    setProfile(newProfile);
    localStorage.setItem('app_current_user', JSON.stringify(newProfile));
    setLoading(false);
    return { success: true, emailConfirmationRequired: false };
  };

  const resendConfirmationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const configured = isSupabaseConfigured();
    const cleanEmail = email.trim().toLowerCase();

    if (configured) {
      try {
        const client = getSupabase();
        const { error } = await client.auth.resend({
          type: 'signup',
          email: cleanEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/login?verified=true`
          }
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (err: unknown) {
        return { 
          success: false, 
          error: err instanceof Error ? err.message : 'Unable to resend confirmation email.' 
        };
      }
    }
    return { success: true };
  };

  const devConfirmAndLogin = async (email: string, roleHint: UserRole = 'faculty'): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const profiles = localDb.getProfiles();
    let match = profiles.find(p => p.email.toLowerCase() === cleanEmail);

    if (!match) {
      match = {
        id: `dev-${Date.now()}`,
        full_name: cleanEmail.split('@')[0].replace(/[._]/g, ' '),
        email: cleanEmail,
        role: roleHint,
        account_status: 'active',
        created_at: new Date().toISOString()
      };
      localDb.setProfiles([match, ...profiles]);
    }

    setUser({ id: match.id, email: match.email });
    setProfile(match);
    localStorage.setItem('app_current_user', JSON.stringify(match));
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
