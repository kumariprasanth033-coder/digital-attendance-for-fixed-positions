import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Navbar } from '../components/common/Navbar';
import { UserCheck, ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

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

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'admin') {
      setEmail('admin.portal@university.edu');
    } else {
      setEmail('ramesh.faculty@university.edu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password, role);
      if (res.success) {
        if (role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/faculty/dashboard');
        }
      } else {
        setError(res.error || 'Invalid credentials.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
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
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                role === 'admin'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
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
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-xs flex items-center justify-center gap-2 ${
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
              Quick Test Accounts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRole('faculty');
                  setEmail('ramesh.faculty@university.edu');
                  setPassword('password123');
                }}
                className="p-2 rounded-lg bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 font-medium text-left border border-indigo-100 transition-colors"
              >
                <div className="font-bold">Faculty Demo</div>
                <div className="text-[10px] text-indigo-500">Dr. Ramesh Kumar</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('admin');
                  setEmail('admin.portal@university.edu');
                  setPassword('password123');
                }}
                className="p-2 rounded-lg bg-purple-50/60 hover:bg-purple-100 text-purple-700 font-medium text-left border border-purple-100 transition-colors"
              >
                <div className="font-bold">Admin Demo</div>
                <div className="text-[10px] text-purple-500">Dean Office</div>
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
