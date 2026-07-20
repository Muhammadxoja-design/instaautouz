import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

export default function CTA() {
  const { t } = useTranslation()
  return (
    <section id="signup" className="py-32 px-6 relative overflow-hidden bg-base-900">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(rgba(28,75,255,0.12) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-content mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-display text-white mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-lg text-white/50 max-w-md mx-auto mb-10">
            {t("cta.subtitle")}
          </p>
          <Link
            to="/register"
            className="btn btn-primary px-8 py-4 rounded-xl font-semibold text-base shadow-primary-glow-lg hover:opacity-90 active:scale-[0.98]"
          >
            {t("cta.button")}
            <ArrowRight size={18} strokeWidth={2} />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
