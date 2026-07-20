import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft, Heart, MessageCircle, Share2, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { request } from "../../lib/api-client"

const defaults = ["8,450", "1,284", "532", "45.2K"]

export default function AnalyticsInstagram() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/analytics/overview")
      .then((res) => {
        const m = res
        setData({
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          views: m.views,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v) => (typeof v === "number" ? v.toLocaleString() : v ?? "")

  const stat = (idx) => {
    if (loading) return defaults[idx]
    if (!data) return defaults[idx]
    const keys = ["likes", "comments", "shares", "views"]
    const v = data[keys[idx]]
    return v != null ? fmt(v) : defaults[idx]
  }

  return (
    <DashboardLayout>
      <Link to="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t('common.back')}
      </Link>
      <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-6">{t('dashboard.ig_analytics')}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Heart, label: t('analytics.likes'), value: stat(0) },
          { icon: MessageCircle, label: t('analytics.comments'), value: stat(1) },
          { icon: Share2, label: t('analytics.repost'), value: stat(2) },
          { icon: TrendingUp, label: t('analytics.views'), value: stat(3) },
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
