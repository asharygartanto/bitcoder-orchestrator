import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import ClientsPage from './pages/ClientsPage';
import UsersPage from './pages/UsersPage';
import ApiKeysPage from './pages/ApiKeysPage';
import MonitoringPage from './pages/MonitoringPage';
import LicensesPage from './pages/LicensesPage';
import DepartmentsPage from './pages/DepartmentsPage';;
import AppLayout from './components/layout/AppLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuthStore();
  if (!isHydrated) return null;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuthStore();
  if (!isHydrated) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuthStore();
  if (!isHydrated) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  const { hydrate } = useAuthStore();

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ChatPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AppLayout>
                <AdminPage />
              </AppLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <AdminRoute>
              <AppLayout>
                <ClientsPage />
              </AppLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <AppLayout>
                <UsersPage />
              </AppLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/api-keys"
          element={
            <AdminRoute>
              <AppLayout>
                <ApiKeysPage />
              </AppLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/monitoring"
          element={
            <SuperAdminRoute>
              <AppLayout>
                <MonitoringPage />
              </AppLayout>
            </SuperAdminRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <AdminRoute>
              <AppLayout>
                <DepartmentsPage />
              </AppLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/licenses"
          element={
            <SuperAdminRoute>
              <AppLayout>
                <LicensesPage />
              </AppLayout>
            </SuperAdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function AuthCallback() {
  const { setAuth } = useAuthStore();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  React.useEffect(() => {
    if (token) {
      localStorage.setItem('bitcoder_token', token);
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((user) => {
          setAuth(user, token);
          window.location.href = '/';
        });
    }
  }, [token, setAuth]);

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="animate-pulse-subtle text-bc-text-secondary">Authenticating...</div>
    </div>
  );
}
