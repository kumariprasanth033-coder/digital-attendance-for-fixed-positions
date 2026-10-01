import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Navbar } from '../components/common/Navbar';
import { UserCheck, ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole: UserRole = searchParams.get('role') === 'admin' ? 'admin' : 'faculty';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState(
    initialRole === 'admin' ? 'admin.portal@university.edu' : 'ramesh.faculty@university.edu'
  );
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email confirmation states
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState<string | null>(null);

  const { login, resendConfirmationEmail, devConfirmAndLogin } = useAuth();
  const navigate = useNavigate();

  // Sync role and default email if search query param changes
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'admin') {
      setRole('admin');
      setEmail('admin.portal@university.edu');
    } else if (roleParam === 'faculty') {
      setRole('faculty');
      setEmail('ramesh.faculty@university.edu');
    }
  }, [searchParams]);

  // Check URL on mount for email confirmation redirect or verified param
  useEffect(() => {
    const isVerifiedParam = searchParams.get('verified') === 'true';
    const hash = window.location.hash;
    const hasSignupHash = hash.includes('type=signup') || hash.includes('type=email_verification');
    const hasAccessToken = hash.includes('access_token=');

    if (isVerifiedParam || (hasAccessToken && hasSignupHash)) {
      setVerifiedSuccess('Email verified successfully! You can now sign in with your credentials.');
      // Clean hash without full page reload
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [searchParams]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    setEmailNotConfirmed(false);
    setResendSuccess(null);
    if (newRole === 'admin') {
      setEmail('admin.portal@university.edu');
    } else {
      setEmail('ramesh.faculty@university.edu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailNotConfirmed(false);
    setResendSuccess(null);
    setLoading(true);

    try {
      const res = await login(email, password, role);
      if (res.success) {
        const targetRole = res.userRole || role;
        if (targetRole === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/faculty/dashboard');
        }
      } else {
        if (res.emailNotConfirmed) {
          setEmailNotConfirmed(true);
        } else {
          setError(res.error || 'Incorrect email or password.');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setResendSuccess(null);

    try {
      const res = await resendConfirmationEmail(email);
      if (res.success) {
        setResendSuccess('Confirmation email sent. Please check your inbox and spam folder.');
        setResendCooldown(30); // 30-second cooldown
      } else {
        setError(res.error || 'Failed to resend confirmation email.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unable to send confirmation email.');
    } finally {
      setResending(false);
    }
  };

  const handleDevBypass = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await devConfirmAndLogin(email, role);
      if (res.success) {
        if (role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/faculty/dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl border border-slate-200">
          
          <div className="text-center mb-6">
            <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white inline-flex items-center justify-center font-bold text-base mb-3 shadow-xs">
              DA
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 font-display">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select your academic portal role to proceed
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200/70">
            <button
              type="button"
              onClick={() => handleRoleChange('faculty')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                role === 'faculty'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Faculty Portal
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
            </button>
          </div>

          {/* Email verification success alert */}
          {verifiedSuccess && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{verifiedSuccess}</span>
            </div>
          )}

          {/* General login error alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Explicit "Email Not Confirmed" Handled Box */}
          {emailNotConfirmed && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2.5 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950">
                    Your email address has not been confirmed yet.
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    A verification link was sent to <strong>{email}</strong>. Please check your inbox and spam folder to confirm your academic account.
                  </p>
                </div>
              </div>

              {resendSuccess && (
                <div className="p-2 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-[11px] flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendCooldown > 0 || resending}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 
                      ? `Resend available in ${resendCooldown}s` 
                      : resending 
                      ? 'Sending...' 
                      : 'Resend Confirmation Email'}
                  </span>
                </button>

                {/* Development mode convenience helper */}
                <button
                  type="button"
                  onClick={handleDevBypass}
                  className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold underline sm:ml-auto cursor-pointer"
                  title="Verify session immediately for demo testing"
                >
                  [Dev Testing: Verify & Enter]
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">Default: password123</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                role === 'admin'
                  ? 'bg-purple-700 hover:bg-purple-800'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } disabled:opacity-50`}
            >
              {loading ? 'Authenticating...' : `Sign In as ${role === 'admin' ? 'Administrator' : 'Faculty'}`}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Instant 1-Click Test Access
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={async () => {
                  setRole('faculty');
                  setEmail('ramesh.faculty@university.edu');
                  setPassword('password123');
                  setError(null);
                  setEmailNotConfirmed(false);
                  setLoading(true);
                  try {
                    const res = await login('ramesh.faculty@university.edu', 'password123', 'faculty');
                    if (res.success) {
                      navigate('/faculty/dashboard');
                    } else {
                      setError(res.error || 'Login failed');
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="p-2.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-medium text-left border border-indigo-200/80 transition-all hover:shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Faculty Login</span>
                  <span className="text-[10px] bg-indigo-200/60 px-1.5 py-0.5 rounded font-bold">1-Click</span>
                </div>
                <div className="text-[10px] text-indigo-600 mt-0.5">Dr. Ramesh Kumar</div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setRole('admin');
                  setEmail('admin.portal@university.edu');
                  setPassword('password123');
                  setError(null);
                  setEmailNotConfirmed(false);
                  setLoading(true);
                  try {
                    const res = await login('admin.portal@university.edu', 'password123', 'admin');
                    if (res.success) {
                      navigate('/admin/dashboard');
                    } else {
                      setError(res.error || 'Login failed');
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="p-2.5 rounded-xl bg-purple-50/80 hover:bg-purple-100 text-purple-700 font-medium text-left border border-purple-200/80 transition-all hover:shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Admin Login</span>
                  <span className="text-[10px] bg-purple-200/60 px-1.5 py-0.5 rounded font-bold">1-Click</span>
                </div>
                <div className="text-[10px] text-purple-600 mt-0.5">Dean Office</div>
              </button>
            </div>
          </div>

          <div className="text-center mt-6 text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
              Create an account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};
