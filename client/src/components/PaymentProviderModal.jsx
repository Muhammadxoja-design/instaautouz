import { useState } from "react"
import { useTranslation } from "react-i18next"
import { X, Loader2, ArrowRight, CreditCard } from "lucide-react"
import { PROVIDERS, prepareProviderPayment } from "../lib/payment-utils"

const PROVIDER_ICONS = {
  click: "💳",
  payme: "🔵",
  uzum: "🟣",
  paynet: "🟢",
}

export default function PaymentProviderModal({ planId, amount, onClose }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  async function handleProvider(provider) {
    setLoading(provider)
    setError(null)
    try {
      const returnUrl = `${window.location.origin}/dashboard/payments?success=1`
      const result = await prepareProviderPayment(provider.id, {
        amount,
        merchantTransId: `IAU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        returnUrl,
      })
      if (result.redirect_url) {
        window.location.href = result.redirect_url
      } else {
        setError(t("common.error_occurred"))
      }
    } catch (err) {
      setError(err.message || t("common.error_occurred"))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-base-800 rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-base-300 hover:text-base-900 dark:hover:text-white transition-colors">
          <X size={18} strokeWidth={1.5} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <CreditCard size={22} className="text-primary" />
        </div>

        <h3 className="text-lg font-semibold font-display text-base-900 dark:text-white mb-1">{t("payments.select_provider")}</h3>
        <p className="text-sm text-base-400 mb-5">
          {t("pricing.monthly_5_name")} — {(amount / 100).toLocaleString()} {t("pricing.uzs")}
        </p>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg mb-4">{error}</div>
        )}

        <div className="space-y-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProvider(p)}
              disabled={loading !== null}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[rgba(10,10,15,0.08)] dark:border-white/10 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{PROVIDER_ICONS[p.id] || "💳"}</span>
                <span className="text-sm font-medium text-base-900 dark:text-white">{t(`payments.${p.id}`)}</span>
              </div>
              {loading === p.id ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <ArrowRight size={16} className="text-base-300" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
