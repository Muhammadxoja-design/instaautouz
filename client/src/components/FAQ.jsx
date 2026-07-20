import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

const faqs = [
  {
    qKey: "faq.items.0.q",
    aKey: "faq.items.0.a",
  },
  {
    qKey: "faq.items.1.q",
    aKey: "faq.items.1.a",
  },
  {
    qKey: "faq.items.2.q",
    aKey: "faq.items.2.a",
  },
  {
    qKey: "faq.items.3.q",
    aKey: "faq.items.3.a",
  },
  {
    qKey: "faq.items.4.q",
    aKey: "faq.items.4.a",
  },
]

export default function FAQ() {
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="py-24 px-6 bg-white dark:bg-base-900">
      <div className="max-w-content mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <span className="section-eyebrow">FAQ</span>
          <h2 className="section-title">{t("faq.title")}</h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="max-w-2xl mx-auto space-y-2"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } }}
              className="border border-[rgba(10,10,15,0.08)] dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-base-800"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-base-900 dark:text-white hover:bg-base-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                {t(faq.qKey)}
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  className={`text-base-300 dark:text-white/30 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-base-400 leading-relaxed">{t(faq.aKey)}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
