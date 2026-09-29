import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Faculty pages
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { ClassroomsPage } from './pages/faculty/ClassroomsPage';
import { ClassroomDetailPage } from './pages/faculty/ClassroomDetailPage';
import { TakeAttendancePage } from './pages/faculty/TakeAttendancePage';
import { AttendanceHistoryPage } from './pages/faculty/AttendanceHistoryPage';
import { ReportsPage } from './pages/faculty/ReportsPage';
import { ProfilePage } from './pages/faculty/ProfilePage';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { FacultyManagementPage } from './pages/admin/FacultyManagementPage';
import { AdminClassroomsPage } from './pages/admin/AdminClassroomsPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminProfilePage } from './pages/admin/AdminProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Faculty routes */}
          <Route element={<ProtectedRoute requiredRole="faculty" />}>
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/classrooms" element={<ClassroomsPage />} />
            <Route path="/faculty/classrooms/:id" element={<ClassroomDetailPage />} />
            <Route path="/faculty/classrooms/:id/attendance" element={<TakeAttendancePage />} />
            <Route path="/faculty/attendance" element={<AttendanceHistoryPage />} />
            <Route path="/faculty/reports" element={<ReportsPage />} />
            <Route path="/faculty/profile" element={<ProfilePage />} />
          </Route>

          {/* Protected Admin routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/faculty" element={<FacultyManagementPage />} />
            <Route path="/admin/classrooms" element={<AdminClassroomsPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
