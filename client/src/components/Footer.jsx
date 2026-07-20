import { Instagram } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="py-16 px-6 border-t border-[rgba(10,10,15,0.07)] dark:border-white/10 bg-white dark:bg-base-900">
      <div className="max-w-content mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Instagram size={16} className="text-white" strokeWidth={2} />
              </span>
              <span className="font-semibold text-sm tracking-tight font-display text-base-900 dark:text-white">
{t("common.app_name")}
              </span>
            </a>
            <p className="text-sm text-base-400 max-w-xs leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-base-400 uppercase mb-4">{t("footer.product")}</h4>
            <ul className="space-y-3">
              {["features_footer", "pricing_footer", "faq_footer"].map((key) => (
                <li key={key}>
                  <a href={`#${key === "features_footer" ? "imkoniyatlar" : key === "pricing_footer" ? "narxlar" : "faq"}`} className="text-sm text-base-500 dark:text-white/50 hover:text-primary transition-colors">
                    {t(`footer.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-base-400 uppercase mb-4 dark:text-white/50">{t("footer.company")}</h4>
            <ul className="space-y-3">
              {["about", "contact", "support"].map((key) => (
                <li key={key}>
                  <a href="#" className="text-sm text-base-500 dark:text-white/50 hover:text-primary transition-colors">
                    {t(`footer.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[rgba(10,10,15,0.07)] dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-base-400">&copy; 2025 {t("common.app_name")}. {t("footer.rights")}</p>
          <div className="flex items-center gap-4 text-xs text-base-400">
            <a href="#" className="hover:text-primary transition-colors">{t('common.privacy')}</a>
            <span className="text-base-200 dark:text-white/20">&middot;</span>
            <a href="#" className="hover:text-primary transition-colors">{t('common.terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
