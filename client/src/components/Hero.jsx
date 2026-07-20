import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import CountUp from "./CountUp"

const scrollToFeatures = (e) => {
  e.preventDefault()
  document.getElementById("imkoniyatlar")?.scrollIntoView({ behavior: "smooth" })
}

export default function Hero() {
  const { t } = useTranslation()
  return (
    <section className="relative overflow-hidden pt-24 pb-20 px-6 bg-white dark:bg-base-900">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10,10,15,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,15,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(rgba(28,75,255,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-content mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="badge-pill text-primary border-primary/25 bg-primary-50 dark:bg-primary-50/10 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            v2.0 — {t("hero.new_version")}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl font-bold tracking-tight font-display leading-[1.05] text-base-900 dark:text-white mb-6"
          style={{ letterSpacing: "-0.03em" }}
        >
          {t("hero.title_line1")}
          <br />
          <span className="text-primary">{t("hero.title_line2")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-base-400 max-w-xl mx-auto leading-relaxed mb-10"
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20"
        >
          <Link to="/register" className="btn btn-primary px-7 py-3.5 rounded-xl font-semibold text-sm">
            {t("hero.cta")}
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
          <a href="#imkoniyatlar" onClick={scrollToFeatures} className="btn btn-outline px-7 py-3.5 rounded-xl font-medium text-sm">
            {t("hero.see_features")}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-mockup bg-base-800 border border-white/10"
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]" style={{ background: "#111118" }}>
            <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#28ca41" }} />
            <span className="ml-4 text-xs font-mono text-white/30">{t("common.app_name")} — {t("hero.dashboard_label")}</span>
          </div>

          <div className="p-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: "#16161f" }}>
              <p className="text-xs text-white/40 font-sans mb-2">{t("hero.dashboard_today_comments")}</p>
              <p className="text-xl font-semibold text-white font-display">
                <CountUp end={1284} />
              </p>
              <p className="text-xs mt-1" style={{ color: "#4ade80" }}>
                +<CountUp end={12} decimals={0} />%
              </p>
            </div>
            <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: "#16161f" }}>
              <p className="text-xs text-white/40 font-sans mb-2">{t("hero.dashboard_active_accounts")}</p>
              <p className="text-xl font-semibold text-white font-display">
                <CountUp end={5} />
              </p>
              <p className="text-xs mt-1" style={{ color: "#4ade80" }}>
                <CountUp end={100} decimals={0} />%
              </p>
            </div>
            <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: "#16161f" }}>
              <p className="text-xs text-white/40 font-sans mb-2">{t("hero.dashboard_response_rate")}</p>
              <p className="text-xl font-semibold text-white font-display">
                <CountUp end={98.3} decimals={1} suffix="%" />
              </p>
              <p className="text-xs mt-1" style={{ color: "#4ade80" }}>
                +<CountUp end={2.1} decimals={1} />%
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
