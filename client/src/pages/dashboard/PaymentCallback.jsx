import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams, useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { request } from "../../lib/api-client"

export default function PaymentCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const success = searchParams.get("success")
    const statusParam = searchParams.get("status")
    const error = searchParams.get("error")

    if (success === "1" || statusParam === "0" || statusParam === "success" || statusParam === "confirmed") {
      setStatus("success")
      setMessage(t("payments.payment_success"))
    } else if (error || statusParam === "-1" || statusParam === "cancelled" || statusParam === "rejected") {
      setStatus("cancelled")
      setMessage(t("payments.payment_cancelled"))
    } else if (statusParam === "-2" || statusParam === "failed" || statusParam === "error") {
      setStatus("failed")
      setMessage(t("payments.payment_failed"))
    } else {
      setStatus("loading")
      setMessage(t("payments.redirecting"))
    }
  }, [searchParams, t])

  const icons = {
    loading: <Loader2 size={48} className="animate-spin text-primary" />,
    success: <CheckCircle2 size={48} className="text-green-500" />,
    cancelled: <XCircle size={48} className="text-yellow-500" />,
    failed: <AlertTriangle size={48} className="text-red-500" />,
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-4">{icons[status]}</div>
        <p className="text-lg font-semibold text-base-900 dark:text-white mb-2">{message}</p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => navigate("/dashboard/payments")} className="btn btn-primary px-5 py-2 rounded-xl text-sm">
            {t("payments.title")}
          </button>
          <button onClick={() => navigate("/dashboard/subscriptions")} className="btn px-5 py-2 rounded-xl text-sm border border-[rgba(10,10,15,0.12)] dark:border-white/15">
            {t("subscriptions.title")}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
