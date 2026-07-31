import { useTranslation } from "react-i18next"
import { useState, useEffect, useRef } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Eye, EyeOff, LogIn } from "lucide-react"
import AuthLayout from "../../components/AuthLayout"
import { db } from "@/lib/api-client"
import { useAuth } from "@/lib/AuthContext"

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || ''

export default function Login() {
  const { t } = useTranslation()
  const { loginSuccess, isAuthenticated, authChecked } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      navigate(searchParams.get("redirect_to") || "/dashboard", { replace: true })
    }
  }, [authChecked, isAuthenticated, navigate, searchParams])
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tgLoading, setTgLoading] = useState(false)
  const tgBtnRef = useRef(null)

  useEffect(() => {
    if (!TELEGRAM_BOT_USERNAME || !tgBtnRef.current) return
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.async = true;

    /** @type {any} */ (window).onTelegramAuth = async (user) => {
      setTgLoading(true)
      try {
        const data = await db.auth.loginViaTelegram(user)
        const storage = sessionStorage.getItem('remember_me') === 'true' ? localStorage : sessionStorage
        storage.setItem('auth_token', data.token)
        loginSuccess(data, data.token)
        navigate(searchParams.get('redirect_to') || '/dashboard')
      } catch (err) {
        setError(err.message)
      } finally {
        setTgLoading(false)
      }
    }

    tgBtnRef.current.appendChild(script)

    return () => {
      delete /** @type {any} */ (window).onTelegramAuth
    }
  }, [loginSuccess, navigate, searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      sessionStorage.setItem('remember_me', remember ? 'true' : 'false')
      const data = await db.auth.loginViaEmailPassword(email, password)
      if (data.requiresTwoFactor) {
        if (!data.clientId) {
          setError(t("auth.two_factor_error"))
          return
        }
        navigate(`/verify-2fa?clientId=${data.clientId}&redirect_to=${encodeURIComponent(searchParams.get('redirect_to') || '/dashboard')}`)
        return
      }
      loginSuccess(data, data.token)
      navigate(searchParams.get("redirect_to") || "/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('auth.welcome_back')} subtitle={t('auth.login_subtitle')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('common.email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>

        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('common.password')}</label>
          <div className="relative">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-10" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-300 dark:text-white/30 hover:text-base-500">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer" onClick={() => setRemember(!remember)}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              remember ? 'bg-primary border-primary' : 'border-[rgba(10,10,15,0.2)] dark:border-white/20'
            }`}>
              {remember && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
            </div>
            <span className="text-xs text-base-400 select-none">{t('common.remember')}</span>
          </label>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t('auth.forgot_password')}</Link>
        </div>

        <button type="submit" disabled={loading}
          className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn size={16} strokeWidth={2} />}
          {loading ? "Kirilmoqda..." : t('auth.sign_in')}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[rgba(10,10,15,0.08)] dark:border-white/10" /></div>
          <div className="relative flex justify-center"><span className="bg-white dark:bg-base-900 px-3 text-xs text-base-300">{t('common.or')}</span></div>
        </div>

        <div className="space-y-3">
          <button type="button" onClick={() => db.auth.loginWithProvider('google', searchParams.get("redirect_to") || '/dashboard')}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 text-sm font-medium text-base-700 dark:text-white/80 hover:bg-base-50 dark:hover:bg-white/[0.03] transition-colors">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {t('auth.continue_google')}
          </button>

          {TELEGRAM_BOT_USERNAME ? (
            <div className="flex justify-center" ref={tgBtnRef}>
              {tgLoading && <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
            </div>
          ) : (
            <button type="button" disabled
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 text-sm font-medium text-base-400 dark:text-white/40 opacity-50 cursor-not-allowed">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              {t('auth.telegram_not_configured')}
            </button>
          )}
        </div>
      </form>

      <p className="text-center text-xs text-base-400 mt-6">
        {t('auth.no_account')}{" "}
        <Link to="/register" className="text-primary hover:underline font-medium">{t('auth.sign_up')}</Link>
      </p>
    </AuthLayout>
  )
}
