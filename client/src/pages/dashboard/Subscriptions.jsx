import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import PaymentProviderModal from "../../components/PaymentProviderModal"
import { Check, Crown, Star, Zap } from "lucide-react"
import { request } from "../../lib/api-client"

const PLAN_META = {
  monthly_5: { icon: Star, badgeKey: null },
  monthly_20: { icon: Zap, badgeKey: "pricing.popular" },
  monthly_unlimited: { icon: Crown, badgeKey: null },
}

export default function Subscriptions() {
  const { t, i18n } = useTranslation()
  const [plans, setPlans] = useState([])
  const [currentSub, setCurrentSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProvider, setShowProvider] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const data = await request("GET", "/subscriptions")
        if (cancelled) return
        setCurrentSub(data.subscription)
        const yearly = data.plans?.filter((p) => p.id.startsWith("yearly")) || []
        if (yearly.length > 0) {
          setPlans(yearly)
        } else {
          setPlans(data.plans?.filter((p) => p.id.startsWith("monthly")) || [])
        }
      } catch {
        if (!cancelled) setPlans([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  function handleSelectPlan(planId) {
    setSelectedPlan(planId)
    setShowProvider(true)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("subscriptions.title")}</h1>
        <p className="text-sm text-base-400 mt-1">{t("subscriptions.manage")}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {currentSub && (
        <div className="card p-4 mb-6 bg-primary/5 border border-primary/10">
          <p className="text-sm font-medium text-primary">
            {t("subscriptions.current")}: <strong>{t(`pricing.${currentSub.planType}_name`)}</strong>
          </p>
          <p className="text-xs text-base-400 mt-0.5">
            {t("subscriptions.expires")}: {new Date(currentSub.endsAt).toLocaleDateString(i18n.language === "uz" ? "uz-UZ" : i18n.language)}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const meta = PLAN_META[plan.id]
          const Icon = meta?.icon || Star
          const isActive = currentSub?.planType === plan.id
          const features = t(`pricing.${plan.id}_features`, "").split(",").map((f) => f.trim()).filter(Boolean)
          const amountLabel = (plan.amount / 100).toLocaleString()

          return (
            <div key={plan.id} className={`card p-6 flex flex-col relative ${isActive ? "ring-2 ring-primary" : ""}`}>
              {meta?.badgeKey && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary text-white mb-3 inline-block w-fit">
                  {t(meta.badgeKey)}
                </span>
              )}
              <Icon size={20} className="text-primary mb-2" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-base-900 dark:text-white">{t(`pricing.${plan.id}_name`)}</h3>
              <p className="text-3xl font-bold font-display text-base-900 dark:text-white mt-2">
                {amountLabel} <span className="text-sm font-normal text-base-400">{t("pricing.uzs")}</span>
                <span className="text-sm font-normal text-base-400">/{t("pricing.per_month")}</span>
              </p>
              <ul className="space-y-2 my-5 flex-1">
                {features.map((f, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-base-400">
                    <Check size={14} className="text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isActive}
                onClick={() => handleSelectPlan(plan.id)}
                className={`btn w-full py-2 rounded-xl text-sm font-semibold ${
                  isActive
                    ? "border border-[rgba(10,10,15,0.12)] dark:border-white/15 text-base-900 dark:text-white opacity-60 cursor-not-allowed"
                    : "btn-primary"
                }`}
              >
                {isActive ? t("subscriptions.current") : t("pricing.cta")}
              </button>
            </div>
          )
        })}
      </div>

      {showProvider && (
        <PaymentProviderModal
          planId={selectedPlan}
          amount={plans.find((p) => p.id === selectedPlan)?.amount || 0}
          onClose={() => setShowProvider(false)}
        />
      )}
    </DashboardLayout>
  )
}
