import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

export default function AISettings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState({ provider: "OpenAI", model: "GPT-4o", apiKey: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    request("GET", "/ai/settings")
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await request("PUT", "/ai/settings", settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError(t('common.save_error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t('ai.settings_title')}</h1>
        <p className="text-sm text-base-400 mt-1">{t('ai.settings_subtitle')}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      <div className="card p-6 space-y-5">
        <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('ai.provider')}</label>
          <select
            value={settings.provider}
            onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option>OpenAI</option>
            <option>Claude</option>
            <option>Gemini</option>
          </select>
        </div>

        <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('ai.model')}</label>
          <select
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option>GPT-4o</option>
            <option>GPT-4o-mini</option>
            <option>Claude 3.5 Sonnet</option>
          </select>
        </div>

        <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('ai.api_key')}</label>
          <input
            type="password"
            placeholder="sk-..."
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">
            {saving ? t('common.saving') : t('common.save')}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">{t('common.saved')} ✓</span>}
        </div>
      </div>
    </DashboardLayout>
  )
}
