import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import CountUp from "./CountUp"

const stats = [
  { end: 10000, suffix: "+", labelKey: "stats.users" },
  { end: 98.3, suffix: "%", decimals: 1, labelKey: "stats.response_rate" },
  { end: 1000000, suffix: "+", labelKey: "stats.comments" },
]

export default function Stats() {
  const { t } = useTranslation()
  return (
    <section className="py-16 px-6 bg-white dark:bg-base-900">
      <div className="max-w-content mx-auto">
        <div className="grid grid-cols-3 gap-8 md:gap-16">
          {stats.map((s, i) => (
            <motion.div
              key={s.labelKey}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold font-display tracking-tight text-base-900 dark:text-white">
                <CountUp end={s.end} suffix={s.suffix} decimals={s.decimals || 0} />
              </p>
              <p className="text-sm text-base-400 mt-1.5">{t(s.labelKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
