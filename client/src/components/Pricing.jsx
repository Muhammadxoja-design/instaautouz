import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import CountUp from "./CountUp"

const plans = [
  {
    nameKey: "pricing.free",
    price: 0,
    descKey: "pricing.free_desc",
    featuresKeys: ["pricing.free_feature_1", "pricing.free_feature_2", "pricing.free_feature_3"],
    ctaKey: "pricing.free_cta",
    highlighted: false,
  },
  {
    nameKey: "pricing.pro",
    price: 14,
    descKey: "pricing.pro_desc",
    featuresKeys: ["pricing.pro_feature_1", "pricing.pro_feature_2", "pricing.pro_feature_3", "pricing.pro_feature_4"],
    ctaKey: "pricing.pro_cta",
    highlighted: true,
    badgeKey: "pricing.popular",
  },
  {
    nameKey: "pricing.business",
    price: 39,
    descKey: "pricing.business_desc",
    featuresKeys: ["pricing.business_feature_1", "pricing.business_feature_2", "pricing.business_feature_3", "pricing.business_feature_4"],
    ctaKey: "pricing.business_cta",
    highlighted: false,
  },
]

export default function Pricing() {
  const { t } = useTranslation()
  return (
    <section id="narxlar" className="section-alt py-24 px-6">
      <div className="max-w-content mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <span className="section-eyebrow">{t("pricing.eyebrow")}</span>
          <h2 className="section-title">{t("pricing.title")}</h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="grid md:grid-cols-3 gap-6 items-start max-w-4xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.nameKey}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
              className={`rounded-2xl p-8 border ${
                plan.highlighted
                  ? "bg-base-900 border-base-800 dark:bg-white dark:border-white/20"
                  : "card"
              }`}
            >
              {plan.badgeKey && (
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary text-white mb-4">
                  {t(plan.badgeKey)}
                </span>
              )}
              <h3 className={`text-lg font-semibold font-display ${
                plan.highlighted ? "text-white dark:text-base-900" : "text-base-900 dark:text-white"
              }`}>
                {t(plan.nameKey)}
              </h3>
              <div className="mt-3 mb-1">
                <span className={`text-4xl font-bold font-display tracking-tight ${
                  plan.highlighted ? "text-white dark:text-base-900" : "text-base-900 dark:text-white"
                }`}>
                  $<CountUp end={plan.price} />
                </span>
                <span className={`text-sm ml-1 ${
                  plan.highlighted ? "text-white/50 dark:text-base-400" : "text-base-400"
                }`}>{t("pricing.per_month")}</span>
              </div>
              <p className={`text-sm mb-6 ${
                plan.highlighted ? "text-white/50 dark:text-base-400" : "text-base-400"
              }`}>{t(plan.descKey)}</p>

              <ul className="space-y-3 mb-8">
                {plan.featuresKeys.map((fk) => (
                  <li key={fk} className="flex items-center gap-2.5 text-sm">
                    <Check size={16} strokeWidth={2} className="text-primary" />
                    <span className={plan.highlighted ? "text-white/80 dark:text-base-600" : "text-base-600 dark:text-white/70"}>
                      {t(fk)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`btn w-full py-3 rounded-xl text-sm font-semibold ${
                  plan.highlighted
                    ? "bg-primary text-white hover:opacity-90"
                    : "border border-[rgba(10,10,15,0.12)] dark:border-white/15 text-base-900 dark:text-white hover:border-base-300 dark:hover:border-white/30"
                }`}
              >
                {t(plan.ctaKey)}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
