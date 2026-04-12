import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../services/user';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import BitcoderLogo from '../components/common/BitcoderLogo';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="text-center">
          <BitcoderLogo className="mx-auto mb-4 h-16 w-16" />
          <h1 className="text-xl font-bold text-bc-text-dark">Link Tidak Valid</h1>
          <p className="mt-2 text-sm text-bc-text-muted">Link reset password tidak valid atau sudah kadaluarsa.</p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm text-bc-primary hover:underline">
            Minta link baru
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BitcoderLogo className="mx-auto mb-4 h-16 w-16" />
          <h1 className="text-2xl font-bold text-bc-text-dark">Reset Password</h1>
        </div>

        <div className="rounded-xl border border-bc-border bg-white p-8 shadow-sm">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <div>
                <p className="text-sm font-medium text-bc-text-dark">Password Berhasil Diubah</p>
                <p className="mt-1 text-xs text-bc-text-muted">Silakan login dengan password baru Anda.</p>
              </div>
              <Link
                to="/login"
                className="inline-block rounded-lg bg-bc-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-bc-primary-dark"
              >
                Login Sekarang
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-bc-text-dark">Password Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-bc-text-muted" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-bc-border bg-bc-bg-subtle py-2.5 pl-10 pr-10 text-sm outline-none focus:border-bc-primary"
                    placeholder="Minimal 8 karakter"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-bc-text-muted"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-bc-primary py-2.5 text-sm font-semibold text-white hover:bg-bc-primary-dark disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
