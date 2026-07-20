import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Instagram, Home } from "lucide-react"

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-white dark:bg-base-900 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <span className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Instagram size={24} className="text-primary" strokeWidth={1.5} />
        </span>
        <h1 className="text-4xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-2">404</h1>
        <p className="text-sm text-base-400 mb-6">{t('not_found.title')}</p>
        <Link to="/" className="btn btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">
          <Home size={16} strokeWidth={2} /> {t('not_found.home')}
        </Link>
      </div>
    </div>
  )
}
