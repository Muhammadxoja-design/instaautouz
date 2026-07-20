import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import { Search } from "lucide-react"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

const fallbackConversations = [
  { id: "1", name: "Aziza Karimova", lastMessage: "Rahmat, juda yaxshi!", time: "5 min", unread: 2 },
  { id: "2", name: "Jahongir Aliyev", lastMessage: "Narxlarni bilmoqchiman", time: "1 soat", unread: 0 },
  { id: "3", name: "Madina Rahimova", lastMessage: "Qachon yetkazib berasiz?", time: "3 soat", unread: 1 },
]

export default function DMs() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    request("GET", "/dms/conversations")
      .then((data) => setConversations(Array.isArray(data) ? data : data.conversations || []))
      .catch(() => setConversations(fallbackConversations))
      .finally(() => setLoading(false))
  }, [])

  const filtered = conversations.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t('dms.title')}</h1>
        <p className="text-sm text-base-400 mt-1">{t('dms.subtitle')}</p>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-300" strokeWidth={1.5} />
        <input
          type="text"
          placeholder={t('dms.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <div className="card divide-y divide-[rgba(10,10,15,0.06)] dark:divide-white/5">
        {loading ? (
          <div className="p-4 text-center text-sm text-base-400">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-base-400">{t('dms.no_conversations')}</div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/dashboard/dms/${c.id}`)}
              className="flex items-center gap-3 p-4 hover:bg-base-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                {(c.name || "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-base-900 dark:text-white">{c.name}</p>
                  <span className="text-xs text-base-300">{c.time}</span>
                </div>
                <p className="text-xs text-base-400 truncate">{c.lastMessage}</p>
              </div>
              {c.unread > 0 && (
                <span className="text-xs font-semibold w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                  {c.unread}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}
