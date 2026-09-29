import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { 
  Users, 
  LayoutGrid, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight, 
  ShieldCheck, 
  UserCheck, 
  Sparkles,
  Layers,
  Database,
  CalendarCheck
} from 'lucide-react';
import heroImage from '../assets/images/hero_classroom_theatre_1790658589531.jpg';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-18 lg:pb-28 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Next-Gen Academic Seating & Attendance</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] font-display">
                Digital Attendance for{' '}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">
                  Fixed Positions
                </span>
              </h1>

              <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                Smart, Simple and Position-Based Classroom Attendance. Model your lecture hall as a fixed cinema-style seating matrix, mark presence with one tap, and analyze attendance with precision.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/login?role=faculty"
                  className="px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" /> Faculty Portal
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login?role=admin"
                  className="px-6 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Console
                </Link>

                <Link
                  to="/register"
                  className="px-5 py-3 text-sm font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                >
                  Create Account
                </Link>
              </div>

              <div className="pt-4 flex items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Theatre Seating Grid</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Boys & Girls Segregation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Supabase & CSV Export</span>
                </div>
              </div>
            </div>

            {/* Visual Hero Art: Generated Smart Lecture Theatre Hall */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900">
                <img
                  src={heroImage}
                  alt="Modern tiered smart lecture theatre with digital seating matrix"
                  className="w-full h-auto object-cover max-h-[420px]"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-5">
                  <div className="text-white text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Cinema Matrix Concept
                  </div>
                  <div className="text-white text-base font-bold">
                    4 × 4 Fixed Seating Architecture
                  </div>
                  <div className="text-slate-300 text-xs mt-0.5">
                    Every student mapped permanently to row, column & roll number.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. About the System */}
      <section id="about" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              The Philosophy
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display">
              Why Fixed Positions Transform Attendance
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Traditional roll-calls waste 15 minutes of every lecture. Paper sheets lead to proxy signatures. By treating the classroom as a theatre layout with dedicated seats for each student, professors take accurate attendance in 30 seconds by simply scanning empty seats.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Cinema-Style Layout</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Design custom tiered seating arrangements (4x4, 6x8, 8x10). Each seat box holds student name, roll number, and department.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Boys / Girls Visual Filter</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Switch instantly between Boys Side, Girls Side, or All Students without altering or displacing the fixed matrix coordinates.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Official CSV Reports</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Generate real database-backed CSV sheets complete with student names, percentages, and session dates for university audits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Simple Workflow
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display mt-2">
              Four Easy Steps to Rapid Attendance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-3xl font-extrabold text-indigo-200 font-mono block mb-2">01</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">Create Classroom</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter section name and dimensions (e.g. 4 rows × 4 columns = 16 fixed positions).
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-3xl font-extrabold text-indigo-200 font-mono block mb-2">02</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">Assign Positions</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Map students to specific coordinates (Row 1, Seat 1) with Roll Number & Branch.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-3xl font-extrabold text-indigo-200 font-mono block mb-2">03</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">1-Tap Marking</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click empty seats to mark Absent; watch the live attendance percentage calculate instantly.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-3xl font-extrabold text-indigo-200 font-mono block mb-2">04</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">Permanent Sync</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Persist into Supabase database, review history, and download certified CSV files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Key Features Bento */}
      <section id="features" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 font-display">
              Enterprise Academic Capabilities
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Everything built for real institutional performance, zero fake stubs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <Database className="w-6 h-6 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Supabase Persistent PostgreSQL</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Row Level Security (RLS) ensures professors only access their assigned classrooms and students, while campus admins monitor global trends.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <CalendarCheck className="w-6 h-6 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Live Attendance Percentages</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dynamic calculations during marking. Instant visibility of Present vs Absent tallies before submitting to avoid human tallying errors.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <Layers className="w-6 h-6 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">Role-Based Access Control</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strict separation between Faculty and Admin portals. Protected client routes prevent unauthorized navigation attempts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Faculty Section */}
      <section id="faculty" className="py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-linear-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                  Faculty Workspace
                </span>
                <h2 className="text-3xl font-extrabold font-display">
                  Fast, Effortless Attendance on Any Device
                </h2>
                <p className="text-sm text-indigo-200 leading-relaxed">
                  Open your classroom matrix from your tablet or laptop at the podium. Click students present or absent in seconds, verify percentages, and submit safely.
                </p>
                <div className="pt-2">
                  <Link
                    to="/login?role=faculty"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-indigo-50 transition-colors shadow-md"
                  >
                    Launch Faculty Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs space-y-3 font-mono">
                <div className="text-indigo-300 font-semibold uppercase text-[11px]">Demo Faculty Credentials</div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-white/10">
                  <div>Email: <span className="text-white">ramesh.faculty@university.edu</span></div>
                  <div>Role: <span className="text-indigo-400">Faculty (Dean of AI & DS)</span></div>
                  <div>Default Section: <span className="text-emerald-400">AI & DS - Section A (4x4 Matrix)</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Admin Section */}
      <section id="admin" className="py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Institutional Administration
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display">
              Full Governance Across All Departments
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto">
              Inspect faculty classroom creation, review university-wide attendance trends, search students across departments, and ensure campus compliance.
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <Link
                to="/login?role=admin"
                className="px-6 py-2.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Open Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-12 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display text-slate-900 font-bold">
            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-mono text-xs">DA</span>
            <span>Digital Attendance for Fixed Positions</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-slate-900 transition-colors">Register</Link>
            <span className="text-slate-300">·</span>
            <span>Supabase PostgreSQL + PHP REST Architecture</span>
          </div>

          <div className="text-slate-400">
            © 2026 Digital Attendance Management System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
