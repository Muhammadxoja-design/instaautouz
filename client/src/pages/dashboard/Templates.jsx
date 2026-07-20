import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import { Plus, Pencil, Copy } from "lucide-react"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

const fallbackTemplates = [
  { id: "1", name: "Rahmat javobi", text: "Rahmat, murojaatingiz uchun!", useCount: 48 },
  { id: "2", name: "Narx so'rovi", text: "Narx haqida ma'lumot olish uchun DM yozing", useCount: 32 },
  { id: "3", name: "Yetkazish", text: "Yetkazib berish 1-3 ish kuni ichida amalga oshiriladi", useCount: 27 },
]

export default function Templates() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/templates")
      .then((data) => setTemplates(Array.isArray(data) ? data : data.templates || []))
      .catch(() => setTemplates(fallbackTemplates))
      .finally(() => setLoading(false))
  }, [])

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    alert(t('templates.copied'))
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t('templates.title')}</h1>
          <p className="text-sm text-base-400 mt-1">{t('templates.subtitle')}</p>
        </div>
        <button onClick={() => navigate("/dashboard/templates/new")} className="btn btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16} strokeWidth={2} />
          {t('templates.new')}
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card p-4 text-center text-sm text-base-400">{t('common.loading')}</div>
        ) : templates.length === 0 ? (
          <div className="card p-4 text-center text-sm text-base-400">{t('templates.no_templates')}</div>
        ) : (
          templates.map((tmpl) => (
            <div key={tmpl.id} className="card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-base-900 dark:text-white">{tmpl.name}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCopy(tmpl.text)} className="text-base-300 hover:text-primary transition-colors" title={t('templates.copy')}>
                    <Copy size={14} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => navigate(`/dashboard/templates/new?id=${tmpl.id}`)} className="text-base-300 hover:text-primary transition-colors" title={t('templates.edit')}>
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-base-400 mb-2">{tmpl.text}</p>
              <span className="text-xs text-base-300">{t('templates.used_times', { count: tmpl.useCount })}</span>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}
