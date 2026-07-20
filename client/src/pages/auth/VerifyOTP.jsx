import { useTranslation } from "react-i18next"
import { useState, useRef } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import AuthLayout from "../../components/AuthLayout"
import { db } from "@/lib/api-client"

export default function VerifyOTP() {
  const { t } = useTranslation()
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputs = useRef([])
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...code]
    next[i] = val
    setCode(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) { setError("Email topilmadi. Qaytadan urinib ko'ring."); return }
    setError(null)
    setLoading(true)
    try {
      const data = await db.auth.verifyOtp({ email, otpCode: code.join("") })
      if (data.access_token) {
        db.auth.setToken(data.access_token)
      }
      navigate("/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    try {
      await db.auth.resendOtp(email)
    } catch {}
  }

  return (
    <AuthLayout title={t('auth.verify_otp')} subtitle={t('auth.verify_otp_subtitle')}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg text-center">{error}</p>}

        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-2 block text-center">Kod</label>
          <div className="flex gap-2 justify-center">
            {code.map((d, i) => (
              <input key={i} ref={(el) => (inputs.current[i] = el)} type="text" value={d} onChange={(e) => handleChange(i, e.target.value)} maxLength={1}
                className="w-10 h-12 text-center text-lg font-semibold rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || code.some((d) => !d)}
          className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShieldCheck size={16} strokeWidth={2} />}
          {loading ? "Tekshirilmoqda..." : t('common.confirm')}
        </button>

        <p className="text-center text-xs text-base-400">
          {t('auth.didnt_receive')}{" "}
          <button type="button" onClick={handleResend} className="text-primary hover:underline font-medium bg-transparent">{t('auth.resend')}</button>
        </p>
      </form>

      <p className="text-center text-xs text-base-400 mt-6">
        <Link to="/login" className="text-primary hover:underline">Kirish sahifasiga qaytish</Link>
      </p>
    </AuthLayout>
  )
}
