import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import CountUp from "../../components/CountUp"
import { MessageCircle, Users, BarChart3, Clock } from "lucide-react"
import { db } from "../../lib/api-client"
import { request } from "../../lib/api-client"

const defaultCards = [
  { key: "comments", icon: MessageCircle, labelKey: "dashboard.cards.active_rules", value: 1284, change: "+12%", color: "text-green-500" },
  { key: "accounts", icon: Users, labelKey: "dashboard.cards.connected_accounts", value: 5, change: "100%", color: "text-green-500" },
  { key: "rate", icon: BarChart3, labelKey: "dashboard.cards.dms_handled", value: 98.3, suffix: "%", decimals: 1, change: "+2.1%", color: "text-green-500" },
  { key: "scheduled", icon: Clock, labelKey: "dashboard.cards.ai_responses", value: 23, change: "3 ta bugun", color: "text-primary" },
]

export default function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ comments: 0, accounts: 0, rate: 0, scheduled: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [comments, setComments] = useState([])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [accounts, rules, overview, conversations] = await Promise.allSettled([
          db.entities.InstagramAccount.filter(),
          db.entities.AutomationRule.filter(),
          request("GET", "/analytics/overview"),
          request("GET", "/dms/conversations"),
        ])

        if (cancelled) return

        const accountsCount = accounts.status === "fulfilled" ? accounts.value.length : 5
        const scheduledCount = rules.status === "fulfilled" ? rules.value.length : 23

        let overviewData = {}
        if (overview.status === "fulfilled") {
          overviewData = overview.value
        }

        const commentsCount = overviewData.todayComments ?? overviewData.comments ?? 1284
        const rateValue = overviewData.responseRate ?? overviewData.rate ?? 98.3

        setStats({
          comments: commentsCount,
          accounts: accountsCount,
          rate: rateValue,
          scheduled: scheduledCount,
        })

        if (conversations.status === "fulfilled") {
          const convData = Array.isArray(conversations.value) ? conversations.value : conversations.value?.conversations || []
          setComments(convData.slice(0, 3))
        } else {
          setComments([])
        }
      } catch {
        if (!cancelled) {
          setError(t("common.error_occurred"))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  const cards = [
    { ...defaultCards[0], value: stats.comments, change: stats.comments > 0 ? "+" + stats.comments : "+12%" },
    { ...defaultCards[1], value: stats.accounts },
    { ...defaultCards[2], value: stats.rate },
    { ...defaultCards[3], value: stats.scheduled },
  ]

  const recentComments = comments.length > 0
    ? comments
    : [1, 2, 3].map((i) => ({
        id: i,
        user: `Foydalanuvchi ${i}`,
        text: "Bu ajoyib post! 😊",
        time: "5 min",
      }))

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("dashboard.overview")}</h1>
        <p className="text-sm text-base-400 mt-1">{t("dashboard.welcome")}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red/10 border border-red-200 dark:border-red/20 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.key} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-base-400 font-medium">{t(c.labelKey)}</span>
              <span className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary/10 flex items-center justify-center">
                <c.icon size={15} className="text-primary" strokeWidth={1.5} />
              </span>
            </div>
            <p className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">
              <CountUp end={c.value} suffix={c.suffix || ""} decimals={c.decimals || 0} />
            </p>
            <p className={`text-xs mt-1 ${c.color}`}>{c.change}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-base-900 dark:text-white mb-4">{t("dashboard.recent_comments")}</h3>
          <div className="space-y-3">
            {recentComments.map((item, i) => (
              <div key={item.id || i} className="flex items-start gap-3 pb-3 border-b border-[rgba(10,10,15,0.06)] dark:border-white/5 last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-base-100 dark:bg-base-800 flex items-center justify-center text-xs font-medium text-base-400">
                  {item.user ? item.user.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-base-900 dark:text-white">{item.user || `Foydalanuvchi ${i + 1}`}</p>
                  <p className="text-xs text-base-400 truncate">{item.text || "Bu ajoyib post! 😊"}</p>
                </div>
                <span className="text-xs text-base-300 whitespace-nowrap">{item.time || "5 min"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-base-900 dark:text-white mb-4">{t("dashboard.activity")}</h3>
          <div className="space-y-4">
{[
  { labelKey: "comments", value: 85 },
  { labelKey: "dms", value: 42 },
  { labelKey: "ai_replies", value: 63 },
  { labelKey: "platforms", value: 3 },
].map((item) => (
              <div key={item.labelKey}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-base-400">{t(`dashboard.activity_labels.${item.labelKey}`)}</span>
                  <span className="font-medium text-base-900 dark:text-white">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-base-100 dark:bg-base-800 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
