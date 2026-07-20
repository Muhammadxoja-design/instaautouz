import { useState } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft, Instagram, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { request } from "../../lib/api-client"

export default function IGConnect() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const res = await request("GET", "/oauth/url")
      window.location.href = res.url
    } catch (err) {
      setError(err.message || t("common.error_occurred"))
    } finally {
      setConnecting(false)
    }
  }

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/ig-accounts")} className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t("common.back")}
      </button>
      <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-6">{t("ig_accounts.connect_ig")}</h1>

      <div className="card p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-5">
          <Instagram size={28} className="text-white" />
        </div>
        <h2 className="text-lg font-semibold font-display text-base-900 dark:text-white mb-2">{t("ig_accounts.connect_ig")}</h2>
        <p className="text-sm text-base-400 mb-6">{t("ig_accounts.connect_desc")}</p>
      {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg mb-4">{error}</div>}
        <button onClick={handleConnect} disabled={connecting} className="btn btn-primary px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
          {connecting ? <Loader2 size={16} className="animate-spin" /> : <Instagram size={16} strokeWidth={2} />}
          {connecting ? t("ig_accounts.connecting") : t("ig_accounts.connect_ig")}
        </button>
        <p className="text-xs text-base-400 mt-4">{t("ig_accounts.password_disclaimer")}</p>
      </div>
    </DashboardLayout>
  )
}
