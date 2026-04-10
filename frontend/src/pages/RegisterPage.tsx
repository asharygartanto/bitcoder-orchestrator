import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { register as registerApi } from '../services/auth';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

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
    <div className="flex min-h-screen items-center justify-center bg-surface-0 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-accent-light">Bitcoder AI</h1>
          <p className="mt-2 text-text-secondary">Create your account</p>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-surface-1 p-8 top-light">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive-light">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-surface-2 py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                  placeholder="Your name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-surface-2 py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-surface-2 py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-dark hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-tertiary">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-light hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
