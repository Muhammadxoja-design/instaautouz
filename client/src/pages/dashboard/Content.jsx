import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import { Plus, Calendar, Clock, Image, Video, CheckCircle2, Trash2 } from "lucide-react"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

export default function Content() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/content")
      .then((data) => setPosts(Array.isArray(data) ? data : data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    if (!confirm(t("common.delete"))) return
    try {
      await request("DELETE", `/content/${id}`)
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch {}
  }

  function statusBadge(status) {
    const s = (status || "").toLowerCase()
    if (s === "published")
      return <span className="text-xs font-medium px-2.5 py-1 rounded-full text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10">{t("content.published")}</span>
    if (s === "scheduled")
      return <span className="text-xs font-medium px-2.5 py-1 rounded-full text-primary bg-primary/10">{t("content.scheduled")}</span>
    if (s === "failed")
      return <span className="text-xs font-medium px-2.5 py-1 rounded-full text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10">{t("content.failed")}</span>
    return <span className="text-xs font-medium px-2.5 py-1 rounded-full text-base-400 bg-base-50 dark:bg-base-800">{t("content.draft")}</span>
  }

  function formatDate(d) {
    if (!d) return "-"
    return new Date(d).toLocaleDateString()
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("content.title")}</h1>
          <p className="text-sm text-base-400 mt-1">{t("content.subtitle")}</p>
        </div>
        <button onClick={() => navigate("/dashboard/content/new")} className="btn btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16} strokeWidth={2} />
          {t("content.new_post")}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="card p-8 text-center">
          <Image size={32} className="mx-auto text-base-300 dark:text-white/20 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-base-400 mb-4">{t("content.no_content")}</p>
          <button onClick={() => navigate("/dashboard/content/new")} className="btn btn-primary px-4 py-2 rounded-xl text-sm font-semibold">
            <Plus size={14} strokeWidth={2} />
            {t("content.create_first")}
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {posts.map((p) => (
          <div key={p.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.contentType === "video" ? "bg-purple-50 dark:bg-purple-500/10" : "bg-blue-50 dark:bg-blue-500/10"}`}>
                {p.contentType === "video" ? <Video size={16} className="text-purple-500" strokeWidth={1.5} /> : <Image size={16} className="text-blue-500" strokeWidth={1.5} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-base-900 dark:text-white truncate">{p.caption || "(no caption)"}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-base-400">
                  <span className="flex items-center gap-1"><Calendar size={11} strokeWidth={1.5} />{formatDate(p.scheduledAt)}</span>
                  <span className="flex items-center gap-1"><Clock size={11} strokeWidth={1.5} />{p.platform}</span>
                  {p.hashtags?.length > 0 && <span className="text-primary">{p.hashtags.length} tags</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {statusBadge(p.status)}
              <button onClick={() => handleDelete(p.id)} className="text-base-300 hover:text-red-500 transition-colors" title={t("common.delete")}>
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
