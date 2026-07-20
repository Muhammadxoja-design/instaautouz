import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { db } from "../../lib/api-client"

export default function AutomationNew() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get("id")
  const [keyword, setKeyword] = useState("")
  const [reply, setReply] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      db.entities.AutomationRule.get(id).then((rule) => {
        if (rule) {
          setKeyword(rule.keyword || "")
          setReply(rule.reply || "")
        }
      }).catch(() => {})
    }
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (id) await db.entities.AutomationRule.update(id, { keyword, reply })
      else await db.entities.AutomationRule.create({ keyword, reply })
      navigate("/dashboard/automation")
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/automation")} className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t("common.back")}
      </button>
      <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-6">{id ? t("automation.edit_rule") : t("automation.create_rule")}</h1>

      <div className="card p-6 space-y-5 max-w-lg">
        {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</div>}
        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("automation.keywords")}</label>
          <input type="text" placeholder={t("automation.keyword_placeholder")} value={keyword} onChange={(e) => setKeyword(e.target.value)} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("automation.reply_template")}</label>
          <textarea rows={3} placeholder={t("automation.reply_placeholder")} value={reply} onChange={(e) => setReply(e.target.value)} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{saving ? t("common.saving") : t("automation.save_rule")}</button>
      </div>
    </DashboardLayout>
  )
}
