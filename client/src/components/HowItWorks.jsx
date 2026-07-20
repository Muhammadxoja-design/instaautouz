import { motion } from "framer-motion"
import { Link2, Settings, LineChart } from "lucide-react"
import { useTranslation } from "react-i18next"

const steps = [
  { icon: Link2, titleKey: "how_it_works.steps.0.title", descKey: "how_it_works.steps.0.desc" },
  { icon: Settings, titleKey: "how_it_works.steps.1.title", descKey: "how_it_works.steps.1.desc" },
  { icon: LineChart, titleKey: "how_it_works.steps.2.title", descKey: "how_it_works.steps.2.desc" },
]

export default function HowItWorks() {
  const { t } = useTranslation()
  return (
    <section className="py-24 px-6 bg-white dark:bg-base-900">
      <div className="max-w-content mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="section-title">{t("how_it_works.title")}</h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid md:grid-cols-3 gap-8"
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.titleKey}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <s.icon size={24} className="text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-semibold text-primary font-mono mb-2 block">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-base font-semibold text-base-900 dark:text-white mb-1.5">{t(s.titleKey)}</h3>
              <p className="text-sm text-base-400 max-w-xs mx-auto">{t(s.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
