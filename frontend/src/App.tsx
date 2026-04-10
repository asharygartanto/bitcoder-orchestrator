import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import AppLayout from './components/layout/AppLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <Navigate to="/" />;
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
    <div className="flex h-screen items-center justify-center bg-surface-0">
      <div className="animate-pulse-subtle text-text-secondary">Authenticating...</div>
    </div>
  );
}
