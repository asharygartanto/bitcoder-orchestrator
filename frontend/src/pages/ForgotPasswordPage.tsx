import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/user';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import BitcoderLogo from '../components/common/BitcoderLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError('Gagal mengirim email reset. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BitcoderLogo className="mx-auto mb-4 h-16 w-16" />
          <h1 className="text-2xl font-bold text-bc-text-dark">Lupa Password</h1>
          <p className="mt-2 text-sm text-bc-text-secondary">Masukkan email untuk reset password</p>
        </div>

        <div className="rounded-xl border border-bc-border bg-white p-8 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <div>
                <p className="text-sm font-medium text-bc-text-dark">Email Terkirim</p>
                <p className="mt-1 text-xs text-bc-text-muted">
                  Kami telah mengirim link reset password ke <strong>{email}</strong>.
                  Cek inbox dan folder spam Anda.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-bc-primary hover:underline"
              >
                <ArrowLeft size={14} /> Kembali ke Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <p className="text-xs text-bc-text-muted">
                Masukkan alamat email yang terdaftar. Kami akan mengirim link untuk mengatur ulang password Anda.
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-bc-text-dark">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-bc-text-muted" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-bc-border bg-bc-bg-subtle py-2.5 pl-10 pr-4 text-sm text-bc-text-dark placeholder-bc-text-muted outline-none focus:border-bc-primary"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-bc-primary py-2.5 text-sm font-semibold text-white transition-all hover:bg-bc-primary-dark disabled:opacity-50"
              >
                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1 text-sm text-bc-text-secondary hover:text-bc-primary"
              >
                <ArrowLeft size={14} /> Kembali ke Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
