import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { register as registerApi } from '../services/auth';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import BitcoderLogo from '../components/common/BitcoderLogo';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await registerApi(email, name, password);
      setAuth(res.user, res.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message?.[0] || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BitcoderLogo className="mx-auto mb-4 h-16 w-16" />
          <h1 className="text-2xl font-bold text-bc-text-dark">Bitcoder Orchestrator</h1>
          <p className="mt-2 text-sm text-bc-text-secondary">Create your account</p>
        </div>

        <div className="rounded-xl border border-bc-border bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-bc-text-dark">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-bc-text-muted" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-bc-border bg-bc-bg-subtle py-2.5 pl-10 pr-4 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none transition-all focus:border-bc-primary focus:ring-1 focus:ring-bc-primary/20"
                  placeholder="Your name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-bc-text-dark">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-bc-text-muted" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-bc-border bg-bc-bg-subtle py-2.5 pl-10 pr-4 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none transition-all focus:border-bc-primary focus:ring-1 focus:ring-bc-primary/20"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-bc-text-dark">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-bc-text-muted" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-bc-border bg-bc-bg-subtle py-2.5 pl-10 pr-10 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none transition-all focus:border-bc-primary focus:ring-1 focus:ring-bc-primary/20"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bc-text-muted hover:text-bc-text-secondary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-bc-primary py-2.5 text-sm font-semibold text-white transition-all hover:bg-bc-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-bc-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-bc-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
