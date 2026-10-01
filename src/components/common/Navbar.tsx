import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Database, 
  UserCheck, 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  User, 
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { SupabaseConfigModal } from './SupabaseConfigModal';

export const Navbar: React.FC = () => {
  const { user, profile, role, logout, switchDemoRole, isSupabaseLive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showConfig, setShowConfig] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchRole = (targetRole: 'faculty' | 'admin') => {
    switchDemoRole(targetRole);
    setUserDropdown(false);
    setMobileMenuOpen(false);
    if (targetRole === 'faculty') {
      navigate('/faculty/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Wordmark */}
          <Link 
            to="/" 
            className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              DA
            </span>
            <span className="font-display">Digital Attendance</span>
          </Link>

          {/* Desktop Navigation Links */}
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
                <a href="#about" className="hover:text-slate-900 transition-colors">Philosophy</a>
                <a href="#how-it-works" className="hover:text-slate-900 transition-colors">Seating Matrix</a>
                <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
              </>
            )}
          </nav>

          {/* Action Area */}
          <div className="flex items-center gap-2">
            {/* Faculty AI Assistant Quick Trigger */}
            {role === 'faculty' && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-faculty-chat'))}
                title="Open Faculty AI Assistant (Real Database Query)"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200/80 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs cursor-pointer group"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-300 animate-pulse" />
                <span>AI Assistant</span>
              </button>
            )}

            {/* Supabase status / config button */}
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              title={isSupabaseLive ? "Supabase Live Connected" : "Supabase Config"}
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isSupabaseLive
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isSupabaseLive ? 'Live DB' : 'DB Config'}</span>
            </button>

            {/* Quick Role Switcher (Faculty <-> Admin) */}
            {user && (
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-[11px] font-medium border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSwitchRole('faculty')}
                  title="Switch to Faculty View"
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                    role === 'faculty' ? 'bg-white text-indigo-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                  <span className="hidden sm:inline">Faculty</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchRole('admin')}
                  title="Switch to Admin Governance Console"
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                    role === 'admin' ? 'bg-white text-purple-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </div>
            )}

            {/* User Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight max-w-[120px] truncate">
                      {profile?.full_name || 'My Account'}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">{profile?.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-mono uppercase font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        Active Role: {role}
                      </span>
                    </div>

                    {/* Role Switcher in dropdown */}
                    <div className="p-1.5 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] text-slate-400 font-medium px-2 py-0.5">Switch Dashboard:</p>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleSwitchRole('faculty')}
                          className={`px-2 py-1 text-xs rounded text-center font-medium transition-colors ${
                            role === 'faculty' ? 'bg-indigo-600 text-white font-semibold' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Faculty View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchRole('admin')}
                          className={`px-2 py-1 text-xs rounded text-center font-medium transition-colors ${
                            role === 'admin' ? 'bg-purple-700 text-white font-semibold' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Admin Console
                        </button>
                      </div>
                    </div>

                    <Link
                      to={role === 'admin' ? '/admin/profile' : '/faculty/profile'}
                      onClick={() => setUserDropdown(false)}
                      className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" /> Profile Settings
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdown(false);
                        setShowConfig(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-slate-500" /> Database & Keys
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdown(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
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
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t border-slate-200 mt-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
            {role === 'faculty' ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <Link
                  to="/faculty/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg text-center ${location.pathname === '/faculty/dashboard' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/faculty/classrooms"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg text-center ${location.pathname.startsWith('/faculty/classrooms') ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}
                >
                  Classrooms
                </Link>
                <Link
                  to="/faculty/attendance"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg text-center ${location.pathname === '/faculty/attendance' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}
                >
                  History
                </Link>
                <Link
                  to="/faculty/reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg text-center ${location.pathname === '/faculty/reports' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}
                >
                  Reports
                </Link>
              </div>
            ) : role === 'admin' ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg text-center ${location.pathname === '/admin/dashboard' ? 'bg-purple-50 text-purple-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}
                >
                  Overview
                </Link>
                <Link
                  to="/admin/faculty"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg text-center ${location.pathname === '/admin/faculty' ? 'bg-purple-50 text-purple-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}
                >
                  Faculty Directory
                </Link>
                <Link
                  to="/admin/classrooms"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg text-center ${location.pathname === '/admin/classrooms' ? 'bg-purple-50 text-purple-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}
                >
                  Classrooms
                </Link>
                <Link
                  to="/admin/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg text-center ${location.pathname === '/admin/analytics' ? 'bg-purple-50 text-purple-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}
                >
                  Analytics
                </Link>
              </div>
            ) : null}

            {/* AI Assistant Quick Mobile Trigger */}
            {role === 'faculty' && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('open-faculty-chat'));
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Open Faculty AI Assistant</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Supabase modal */}
      <SupabaseConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </>
  );
};
