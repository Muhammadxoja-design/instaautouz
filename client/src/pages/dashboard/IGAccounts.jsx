import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import { Instagram, Plus, Trash2 } from "lucide-react"
import { db } from "../../lib/api-client"

export default function IGAccounts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const data = await db.entities.InstagramAccount.filter()
      setAccounts(data)
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm(t("ig_accounts.delete_confirm"))) return
    try {
      await db.entities.InstagramAccount.delete(id)
      fetchAccounts()
    } catch {
      // ignore
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("ig_accounts.title")}</h1>
          <p className="text-sm text-base-400 mt-1">{t("ig_accounts.manage")}</p>
        </div>
        <button onClick={() => navigate("/dashboard/ig-accounts/connect")} className="btn btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16} strokeWidth={2} />
          {t("ig_accounts.connect")}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {accounts.map((acc) => (
          <div key={acc.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Instagram size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-base-900 dark:text-white">{acc.username}</p>
                <p className="text-xs text-base-400">{acc.followers} followers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-full">
                {acc.status}
              </span>
              <button onClick={() => handleDelete(acc.id)} className="text-base-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}

        {!loading && accounts.length === 0 && (
          <div className="card p-8 text-center border-dashed">
            <Instagram size={32} className="mx-auto text-base-300 dark:text-white/20 mb-3" strokeWidth={1.5} />
<p className="text-sm text-base-400">{t("ig_accounts.no_accounts")}</p>
          <button onClick={() => navigate("/dashboard/ig-accounts/connect")} className="btn btn-primary px-4 py-2 rounded-xl text-sm font-semibold mt-3">
            <Plus size={16} strokeWidth={2} />
            {t("ig_accounts.connect")}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
