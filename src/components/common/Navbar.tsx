import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Database, UserCheck, ShieldCheck, LogOut, ChevronDown, User, Sparkles } from 'lucide-react';
import { SupabaseConfigModal } from './SupabaseConfigModal';

export const Navbar: React.FC = () => {
  const { user, profile, role, logout, switchDemoRole, isSupabaseLive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showConfig, setShowConfig] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Zone 1: Single text element wordmark */}
          <Link 
            to="/" 
            className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              DA
            </span>
            <span className="font-display">Digital Attendance</span>
          </Link>

          {/* Zone 2: 4-6 text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {role === 'faculty' ? (
              <>
                <Link 
                  to="/faculty/dashboard" 
                  className={`hover:text-slate-900 transition-colors ${location.pathname === '/faculty/dashboard' ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/faculty/classrooms" 
                  className={`hover:text-slate-900 transition-colors ${location.pathname.startsWith('/faculty/classrooms') ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  Classrooms
                </Link>
                <Link 
                  to="/faculty/attendance" 
                  className={`hover:text-slate-900 transition-colors ${location.pathname === '/faculty/attendance' ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  History
                </Link>
                <Link 
                  to="/faculty/reports" 
                  className={`hover:text-slate-900 transition-colors ${location.pathname === '/faculty/reports' ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  Reports
                </Link>
              </>
            ) : role === 'admin' ? (
              <>
                <Link 
                  to="/admin/dashboard" 
                  className={`hover:text-slate-900 transition-colors ${location.pathname === '/admin/dashboard' ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  Overview
                </Link>
                <Link 
                  to="/admin/faculty" 
                  className={`hover:text-slate-900 transition-colors ${location.pathname === '/admin/faculty' ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  Faculty Directory
                </Link>
                <Link 
                  to="/admin/classrooms" 
                  className={`hover:text-slate-900 transition-colors ${location.pathname === '/admin/classrooms' ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  Classrooms
                </Link>
                <Link 
                  to="/admin/analytics" 
                  className={`hover:text-slate-900 transition-colors ${location.pathname === '/admin/analytics' ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  Analytics
                </Link>
              </>
            ) : (
              <>
                <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
                <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
                <a href="#matrix-preview" className="hover:text-slate-900 transition-colors">Seating Matrix</a>
                <a href="#faculty" className="hover:text-slate-900 transition-colors">Faculty Portal</a>
              </>
            )}
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2.5">
            {/* Faculty AI Assistant Quick Trigger */}
            {role === 'faculty' && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-faculty-chat'))}
                title="Open Faculty AI Assistant (Real Database Query)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200/80 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs cursor-pointer group"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-300 animate-pulse" />
                <span>AI Assistant</span>
                <span className="hidden xl:inline text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-100 group-hover:bg-indigo-700 text-indigo-800 group-hover:text-indigo-100">
                  Real DB
                </span>
              </button>
            )}

            {/* Supabase status / config button */}
            <button
              onClick={() => setShowConfig(true)}
              title={isSupabaseLive ? "Supabase Live Connected" : "Supabase Preview Mode (Click to configure)"}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isSupabaseLive
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isSupabaseLive ? 'Supabase Live' : 'Supabase Config'}</span>
            </button>

            {/* Quick Role Switcher for instant evaluation */}
            {user && (
              <div className="hidden lg:flex items-center p-0.5 bg-slate-100 rounded-lg text-[11px] font-medium border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    switchDemoRole('faculty');
                    navigate('/faculty/dashboard');
                  }}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                    role === 'faculty' ? 'bg-white text-indigo-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3 h-3" /> Faculty
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchDemoRole('admin');
                    navigate('/admin/dashboard');
                  }}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                    role === 'admin' ? 'bg-white text-purple-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" /> Admin
                </button>
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">
                      {profile?.full_name || 'My Account'}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">{profile?.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>

                    <Link
                      to={role === 'admin' ? '/admin/profile' : '/faculty/profile'}
                      onClick={() => setUserDropdown(false)}
                      className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" /> Profile Settings
                    </Link>

                    <button
                      onClick={() => {
                        setUserDropdown(false);
                        setShowConfig(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Database className="w-3.5 h-3.5 text-slate-500" /> Supabase Keys
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setUserDropdown(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Supabase modal */}
      <SupabaseConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </>
  );
};
