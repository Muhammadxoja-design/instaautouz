import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import { BarChart3, TrendingUp, Users, MessageCircle } from "lucide-react"
import { request } from "../../lib/api-client"

const defaultStats = [
  { dataKey: "totalComments", icon: BarChart3, labelKey: "total_comments", value: "12,450", change: "+18%" },
  { dataKey: "uniqueUsers", icon: Users, labelKey: "unique_users", value: "3,280", change: "+12%" },
  { dataKey: "dmMessages", icon: MessageCircle, labelKey: "dm_messages", value: "892", change: "+8%" },
  { dataKey: "aiUsage", icon: TrendingUp, labelKey: "dashboard.ai_usage", value: "2,150", change: "+24%" },
]

export default function Analytics() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const overview = await request("GET", "/analytics/overview")
        if (!cancelled) setData(overview)
      } catch {
        // fallback to defaults
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  const labels = {
    totalComments: t("dashboard.analytics_labels.total_comments"),
    uniqueUsers: t("dashboard.analytics_labels.unique_users"),
    dmMessages: t("dashboard.analytics_labels.dm_messages"),
    aiUsage: t("dashboard.ai_usage"),
  }

  const stats = defaultStats.map((s) => {
    let displayValue = s.value
    if (data) {
      const raw = data[s.dataKey]
      if (raw != null) displayValue = Number(raw).toLocaleString()
    }
    return { ...s, label: labels[s.dataKey] || s.labelKey, value: displayValue }
  })

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("dashboard.analytics")}</h1>
        <p className="text-sm text-base-400 mt-1">{t("dashboard.analytics_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-base-400 font-medium">{c.label}</span>
              <span className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary/10 flex items-center justify-center">
                <c.icon size={15} className="text-primary" strokeWidth={1.5} />
              </span>
            </div>
            <p className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">
              {loading ? "..." : c.value}
            </p>
            <p className="text-xs text-green-500 mt-1">{c.change}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-base-900 dark:text-white mb-4">{t("dashboard.last_30_days")}</h3>
        <div className="h-48 flex items-center justify-center text-sm text-base-300 dark:text-white/20">
          {loading ? t("common.loading") : t("dashboard.chart_placeholder")}
        </div>
      </div>
    </DashboardLayout>
  )
}
