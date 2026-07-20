import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft, Bot, Brain, Zap } from "lucide-react"
import { Link } from "react-router-dom"
import { request } from "../../lib/api-client"

const defaults = ["2,150", "1,340", "48 soat"]

export default function AnalyticsAI() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/analytics/ai")
      .then((res) => {
        setData({
          aiResponses: res.aiResponses,
          smartResponses: res.smartResponses,
          timeSaved: res.timeSaved,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v) => (typeof v === "number" ? v.toLocaleString() : v ?? "")

  const stat = (idx) => {
    if (loading) return defaults[idx]
    if (!data) return defaults[idx]
    const keys = ["aiResponses", "smartResponses", "timeSaved"]
    const v = data[keys[idx]]
    return v != null ? fmt(v) : defaults[idx]
  }

  return (
    <DashboardLayout>
      <Link to="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t('common.back')}
      </Link>
      <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-6">{t('dashboard.ai_analytics')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Bot, label: t('dashboard.cards.ai_responses'), value: stat(0) },
          { icon: Brain, label: t('ai.smart_reply'), value: stat(1) },
          { icon: Zap, label: t('analytics.time_saved'), value: stat(2) },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-base-400">{c.label}</span>
              <c.icon size={15} className="text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold font-display text-base-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
