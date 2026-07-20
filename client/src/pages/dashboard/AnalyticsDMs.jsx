import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft, MessageCircle, Clock, CheckCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { request } from "../../lib/api-client"

const defaults = ["892", "2.4 min", "94%"]

export default function AnalyticsDMs() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/analytics/dms")
      .then((res) => {
        setData({
          totalMessages: res.totalMessages,
          avgResponseTime: res.avgResponseTime,
          readRate: res.readRate,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v) => (typeof v === "number" ? v.toLocaleString() : v ?? "")

  const stat = (idx) => {
    if (loading) return defaults[idx]
    if (!data) return defaults[idx]
    const keys = ["totalMessages", "avgResponseTime", "readRate"]
    const v = data[keys[idx]]
    return v != null ? fmt(v) : defaults[idx]
  }

  return (
    <DashboardLayout>
      <Link to="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t('common.back')}
      </Link>
      <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-6">{t('dashboard.dm_analytics')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: MessageCircle, label: t('dms.total'), value: stat(0) },
          { icon: Clock, label: t('dms.avg_response'), value: stat(1) },
          { icon: CheckCheck, label: t('dms.read_rate'), value: stat(2) },
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
