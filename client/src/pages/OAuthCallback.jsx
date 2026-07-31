import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Loader } from "lucide-react"
import { db } from "../lib/api-client"

export default function OAuthCallback() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = searchParams.get("token")
    const redirectTo = searchParams.get("redirect_to") || "/dashboard"
    if (token) {
      db.auth.setToken(token)
      navigate(redirectTo, { replace: true })
    } else {
      setError(t('oauth.code_not_found'))
      setTimeout(() => navigate("/login", { replace: true }), 2000)
    }
  }, [])  

  return (
    <div className="min-h-screen bg-white dark:bg-base-900 flex items-center justify-center px-4">
      <div className="text-center">
        <span className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Loader size={24} className="text-primary" />
        </span>
        {error ? (
          <>
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <p className="text-xs text-base-400">{t('oauth.redirecting')}</p>
          </>
        ) : (
          <>
            <Loader size={20} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-base-400">{t('oauth.verifying')}</p>
          </>
        )}
      </div>
    </div>
  )
}
