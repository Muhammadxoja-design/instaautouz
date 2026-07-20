import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/api-client';

export default function Verify2FA() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const clientId = searchParams.get('clientId');

  useEffect(() => {
    if (!clientId) navigate('/login');
  }, [clientId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await db.auth.verify2FA(clientId, code);
      const storage = sessionStorage.getItem('remember_me') === 'true' ? localStorage : sessionStorage;
      storage.setItem('auth_token', data.token);
      navigate(searchParams.get('redirect_to') || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-base-900 px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center mb-8">
          <span className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">
            Insta<span className="text-primary">Auto</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-[rgba(10,10,15,0.08)] dark:border-white/10 p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield size={24} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold font-display text-base-900 dark:text-white">{t('auth.two_factor_title')}</h1>
            <p className="text-sm text-base-400 mt-1 text-center">{t('auth.two_factor_subtitle')}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-transparent text-base-900 dark:text-white outline-none focus:border-primary transition-colors"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <button type="submit" disabled={code.length < 4 || loading}
              className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('auth.verify')}
            </button>
          </form>
          <p className="text-center text-xs text-base-400 mt-4">
            {t('auth.no_code')}{' '}
            <Link to="/login" className="text-primary hover:underline">{t('auth.back_to_login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
