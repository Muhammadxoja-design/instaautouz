import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { ExternalLink } from "lucide-react"
import { db } from "../../lib/api-client"
import { useTranslation } from "react-i18next"
import { useSearchParams, useNavigate } from "react-router-dom"

export default function Payments() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setSuccessMsg(t("payments.payment_success"))
      window.history.replaceState({}, "", "/dashboard/payments")
      setTimeout(() => setSuccessMsg(null), 5000)
    }
  }, [searchParams, t])

  useEffect(() => {
    let cancelled = false
    async function fetchPayments() {
      try {
        const items = await db.entities.Payment.filter()
        if (cancelled) return
        if (items && items.length > 0) {
          setPayments(items)
        }
      } catch {
        if (!cancelled) setPayments([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPayments()
    return () => { cancelled = true }
  }, [])

  function statusBadge(status) {
    const paid = status === "paid" || status === "completed" || status === "confirmed"
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        paid
          ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10"
          : status === "pending" || status === "created"
          ? "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
          : status === "cancelled" || status === "reversed"
          ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10"
          : "text-base-500 bg-base-100 dark:bg-white/5"
      }`}>
        {paid ? t("payments.status_paid") : status === "pending" || status === "created" ? t("payments.status_pending") : status === "cancelled" || status === "reversed" ? t("payments.status_failed") : status}
      </span>
    )
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString()
  }

  function formatAmount(amount) {
    if (!amount) return "-"
    return `${(amount / 100).toLocaleString()} ${t("pricing.uzs")}`
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("payments.title")}</h1>
        <p className="text-sm text-base-400 mt-1">{t("payments.subtitle")}</p>
      </div>

      {successMsg && (
        <div className="mb-4 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/10 px-4 py-3 rounded-xl border border-green-200 dark:border-green-500/20">
          {successMsg}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(10,10,15,0.06)] dark:border-white/5">
                {[
                  t("payments.invoice"),
                  t("payments.amount"),
                  t("common.status"),
                  t("payments.provider"),
                  t("common.date"),
                  ""
                ].map((h, idx) => (
                  <th key={idx} className="text-left px-4 py-3 text-xs font-medium text-base-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-base-400">{t("payments.no_payments")}</td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-[rgba(10,10,15,0.06)] dark:border-white/5 last:border-0">
                  <td className="px-4 py-3 text-sm text-base-900 dark:text-white">#{p.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-base-900 dark:text-white">{formatAmount(p.amount)}</td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3 text-sm text-base-400 capitalize">{p.provider || "-"}</td>
                  <td className="px-4 py-3 text-sm text-base-400">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      className="text-base-300 hover:text-primary transition-colors"
                      title={t("payments.detail")}
                      onClick={() => navigate(`/dashboard/payments/${p.id}`)}
                    >
                      <ExternalLink size={14} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
