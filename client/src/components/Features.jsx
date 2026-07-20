import { motion } from "framer-motion"
import { MessageCircle, Brain, Filter, BarChart3, Calendar, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

const features = [
  { icon: MessageCircle, titleKey: "features.items.0.title", descKey: "features.items.0.desc" },
  { icon: Brain, titleKey: "features.items.1.title", descKey: "features.items.1.desc" },
  { icon: Filter, titleKey: "features.items.2.title", descKey: "features.items.2.desc" },
  { icon: BarChart3, titleKey: "features.items.3.title", descKey: "features.items.3.desc" },
  { icon: Calendar, titleKey: "features.items.4.title", descKey: "features.items.4.desc" },
  { icon: Users, titleKey: "features.items.5.title", descKey: "features.items.5.desc" },
]

export default function Features() {
  const { t } = useTranslation()
  return (
    <section id="imkoniyatlar" className="section-alt py-24 px-6">
      <div className="max-w-content mx-auto">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="section-eyebrow"
        >
          {t("features.eyebrow")}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="section-title mb-12"
        >
          {t("features.title")}
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="grid md:grid-cols-3 gap-4"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.titleKey}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
              className="card p-6 hover:border-[rgba(10,10,15,0.15)] dark:hover:border-white/20 transition-colors"
            >
              <span className="text-xs font-semibold text-base-300 dark:text-white/20 font-mono mb-3 block">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <f.icon size={18} className="text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-base-900 dark:text-white mb-1.5">{t(f.titleKey)}</h3>
              <p className="text-sm text-base-400 leading-relaxed">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
