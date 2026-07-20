import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { MessageSquare, Bell, BellOff } from "lucide-react"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

const defaults = { connected: true, botUsername: "@InstaAutoUZ_bot", notifications: true, nightMode: false }

export default function Telegram() {
  const { t } = useTranslation()
  const [status, setStatus] = useState(defaults)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/telegram/status")
      .then((data) => setStatus({ ...defaults, ...data }))
      .catch(() => setStatus(defaults))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (key) => {
    const value = !status[key]
    request("POST", "/telegram/toggle", { key, value })
      .then(() => setStatus((prev) => ({ ...prev, [key]: value })))
      .catch(() => {})
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t('telegram.title')}</h1>
        <p className="text-sm text-base-400 mt-1">{t('telegram.subtitle')}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary/10 flex items-center justify-center">
            <MessageSquare size={24} className="text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-base-900 dark:text-white">{t('telegram.bot_username')}</p>
            <p className="text-xs text-base-400">{status.botUsername}</p>
          </div>
          {status.connected && (
            <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-full">
              {t('telegram.connected')}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl border border-[rgba(10,10,15,0.08)] dark:border-white/10">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-primary" strokeWidth={1.5} />
              <span className="text-sm text-base-900 dark:text-white">{t('telegram.notifications')}</span>
            </div>
            <div
              onClick={() => toggle("notifications")}
              className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                status.notifications ? "bg-primary" : "bg-base-200 dark:bg-base-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                  status.notifications ? "right-0.5" : "left-0.5"
                }`}
              />
            </div>
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-[rgba(10,10,15,0.08)] dark:border-white/10">
            <div className="flex items-center gap-3">
              <BellOff size={16} className="text-base-300" strokeWidth={1.5} />
              <span className="text-sm text-base-400">{t('telegram.night_mode')}</span>
            </div>
            <div
              onClick={() => toggle("nightMode")}
              className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                status.nightMode ? "bg-primary" : "bg-base-200 dark:bg-base-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                  status.nightMode ? "right-0.5" : "left-0.5"
                }`}
              />
            </div>
          </label>
        </div>
      </div>
    </DashboardLayout>
  )
}
