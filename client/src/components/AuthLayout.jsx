import { useTranslation } from "react-i18next"
import { Instagram } from "lucide-react"
import ErrorBoundary from "./ErrorBoundary"

export default function AuthLayout({ children, title, subtitle }) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-white dark:bg-base-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Instagram size={18} className="text-white" strokeWidth={2} />
          </span>
          <span className="font-semibold text-base tracking-tight font-display text-base-900 dark:text-white">
            {t('common.app_name')}
          </span>
        </a>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-1.5">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-base-400">{subtitle}</p>
          )}
        </div>

        <div className="card p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
