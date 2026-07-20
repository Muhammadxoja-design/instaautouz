import { useTranslation } from "react-i18next"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Send } from "lucide-react"
import AuthLayout from "../../components/AuthLayout"
import { db } from "@/lib/api-client"

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await db.auth.resetPasswordRequest(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title={t('auth.email_sent')} subtitle={t('auth.email_sent_subtitle')}>
          <p className="text-sm text-base-400 text-center">{email} {t('auth.code_sent_to_email')}</p>
        <Link to="/login" className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-semibold mt-6 text-center">
          {t('auth.sign_in')}
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.forgot_password')} subtitle={t('auth.forgot_subtitle')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('common.email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>
        <button type="submit" disabled={loading}
          className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} strokeWidth={2} />}
          {loading ? "Yuborilmoqda..." : t('auth.send_reset_link')}
        </button>
      </form>
      <p className="text-center text-xs text-base-400 mt-6">
        {t('auth.remember_password')}{" "}
        <Link to="/login" className="text-primary hover:underline">{t('auth.sign_in')}</Link>
      </p>
    </AuthLayout>
  )
}
