import { useTranslation } from "react-i18next"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, KeyRound } from "lucide-react"
import AuthLayout from "../../components/AuthLayout"
import { request } from "@/lib/api-client"

export default function ResetPassword() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await request("POST", "/auth/reset-password", { code, password })
      navigate("/login")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('auth.reset_password')} subtitle={t('auth.reset_subtitle')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('auth.confirm_password')}</label>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Tasdiqlash kodi" required
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>

        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('auth.new_password')}</label>
          <div className="relative">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-10" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-300 dark:text-white/30 hover:text-base-500">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound size={16} strokeWidth={2} />}
          {loading ? "Tiklanmoqda..." : t('common.save')}
        </button>
      </form>

      <p className="text-center text-xs text-base-400 mt-6">
        <Link to="/login" className="text-primary hover:underline">{t('auth.sign_in')}</Link>
      </p>
    </AuthLayout>
  )
}
