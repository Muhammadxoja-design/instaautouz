import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { Instagram, Music2, MessageSquare, Plus, Trash2 } from "lucide-react"
import { request } from "../../lib/api-client"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

const iconMap = {
  Instagram: Instagram,
  MessageSquare: MessageSquare,
  Music2: Music2,
}

const fallbackPlatforms = [
  { id: 1, name: "Instagram", icon: "Instagram", status: "connected", username: "@my_business", color: "from-purple-500 to-pink-500" },
  { id: 2, name: "Telegram", icon: "MessageSquare", status: "connected", username: "@my_channel", color: "from-blue-400 to-blue-600" },
  { id: 3, name: "TikTok", icon: "Music2", status: "Ulanish", username: "—", color: "from-gray-800 to-gray-900" },
]

export default function Platforms() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/platforms")
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.platforms || data?.data || []
        setPlatforms(list)
      })
      .catch(() => setPlatforms(fallbackPlatforms))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = (id) => {
    request("DELETE", "/platforms/" + id)
      .then(() => {
        setPlatforms((prev) => prev.filter((p) => p.id !== id))
      })
      .catch(() => {})
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t('platforms.title')}</h1>
          <p className="text-sm text-base-400 mt-1">{t('platforms.subtitle')}</p>
        </div>
        <button onClick={() => navigate("/dashboard/ig-accounts/connect")} className="btn btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16} strokeWidth={2} />
          {t('common.connect')}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {platforms.map((p) => {
          const IconComponent = iconMap[p.icon] || Instagram
          return (
            <div key={p.id || p.name} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                  <IconComponent size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-base-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-base-400">{p.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  p.status === "connected" || p.status === "active"
                    ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10"
                    : "text-base-400 bg-base-50 dark:bg-base-800"
                }`}>{p.status === "connected" || p.status === "active" ? t('platforms.connected') : t('common.connect')}</span>
                {(p.status === "connected" || p.status === "active") && (
                  <button onClick={() => handleDelete(p.id)} className="text-base-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
