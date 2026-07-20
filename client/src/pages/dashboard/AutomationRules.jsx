import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import { Zap, Plus, ToggleLeft, Pencil } from "lucide-react"
import { db } from "../../lib/api-client"

export default function AutomationRules() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRules = async () => {
    try {
      setLoading(true)
      const data = await db.entities.AutomationRule.filter()
      setRules(data)
    } catch {
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  const handleToggle = async (item) => {
    try {
      await db.entities.AutomationRule.update(item.id, { status: !item.status })
      fetchRules()
    } catch {
      // ignore
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("automation.title")}</h1>
          <p className="text-sm text-base-400 mt-1">{t("automation.subtitle")}</p>
        </div>
        <button onClick={() => navigate("/dashboard/automation/new")} className="btn btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16} strokeWidth={2} />
          {t("automation.new_rule")}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary-50 dark:bg-primary/10 flex items-center justify-center">
                  <Zap size={13} className="text-primary" />
                </span>
                <span className="text-sm font-medium text-base-900 dark:text-white">{r.keyword}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/dashboard/automation/new?id=${r.id}`)} className="text-base-300 hover:text-primary transition-colors">
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
                <button onClick={() => handleToggle(r)} className={`transition-colors ${r.status ? "text-primary" : "text-base-300"}`}>
                  <ToggleLeft size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <p className="text-xs text-base-400 ml-8">{r.reply}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
