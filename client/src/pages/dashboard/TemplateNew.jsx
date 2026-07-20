import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

export default function TemplateNew() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get("id")
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      request("GET", "/templates").then((res) => {
        const templates = Array.isArray(res) ? res : []
        const tmpl = templates.find((t) => t.id === id)
        if (tmpl) {
          setName(tmpl.name || "")
          setText(tmpl.text || "")
        }
      }).catch(() => {})
    }
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (id) await request("PUT", "/templates/" + id, { name, text })
      else await request("POST", "/templates", { name, text })
      navigate("/dashboard/templates")
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/templates")} className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t('common.back')}
      </button>
      <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-6">{id ? t('templates.edit_template') : t('templates.create_template')}</h1>

      <div className="card p-6 space-y-5 max-w-lg">
        {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</div>}
        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">Nomi</label>
          <input type="text" placeholder="Shablon nomi" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">Matn</label>
          <textarea rows={4} placeholder="Shablon matni..." value={text} onChange={(e) => setText(e.target.value)} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{saving ? t('common.saving') : t('templates.save_template')}</button>
      </div>
    </DashboardLayout>
  )
}
