import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft, Download, CheckCircle, XCircle, Clock } from "lucide-react"
import { useParams, useNavigate } from "react-router-dom"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

export default function PaymentDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await request("GET", `/payments/${id}`)
        const p = res.payment || res
        if (p && p.id) setPayment(p)
        else setPayment(null)
      } catch {
        setPayment(null)
      } finally {
        setLoading(false)
      }
    }
    fetchPayment()
  }, [id])

  const handleDownload = async () => {
    try {
      await request("GET", "/payments/" + id + "/invoice")
    } catch {}
  }

  const statusIcon = (status) => {
    if (status === "paid") return <CheckCircle size={12} strokeWidth={1.5} />
    if (status === "failed") return <XCircle size={12} strokeWidth={1.5} />
    return <Clock size={12} strokeWidth={1.5} />
  }

  const statusClass = (status) => {
    if (status === "paid") return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10"
    if (status === "failed") return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10"
    return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
  }

  const statusLabel = (status) => {
    if (status === "paid") return t('payments.status_paid')
    if (status === "failed") return t('payments.status_failed')
    return t('payments.status_pending')
  }

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/payments")} className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t('common.back')}
      </button>
      <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-6">{t('payments.detail')} — #{payment?.id || id}</h1>

      <div className="card p-6 max-w-lg space-y-4">
        {loading ? (
          <div className="text-sm text-base-400 text-center py-4">{t('common.loading')}</div>
        ) : (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-[rgba(10,10,15,0.06)] dark:border-white/5">
              <span className="text-sm text-base-400">{t('common.status')}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${statusClass(payment.status)}`}>
                {statusIcon(payment.status)} {statusLabel(payment.status)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-400">{t('payments.plan')}</span>
              <span className="text-sm font-medium text-base-900 dark:text-white">{payment.plan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-400">{t('payments.amount')}</span>
              <span className="text-sm font-medium text-base-900 dark:text-white">{payment.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-400">{t('common.date')}</span>
              <span className="text-sm text-base-600 dark:text-white/70">{payment.date}</span>
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-[rgba(10,10,15,0.06)] dark:border-white/5">
              <span className="text-sm text-base-400">{t('payments.provider')}</span>
              <span className="text-sm text-base-600 dark:text-white/70">{payment.method}</span>
            </div>
            <button onClick={handleDownload} className="btn btn-outline w-full py-2.5 rounded-xl text-sm font-medium">
              <Download size={15} strokeWidth={1.5} /> {t('payments.download_invoice')}
            </button>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
