import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Settings, Save, CheckCircle2, RotateCcw, Globe, Cpu, UserPlus, Sparkles } from "lucide-react"
import { request } from "../../lib/api-client"

export default function SettingsAdmin() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState({ siteName: "InstaAutoUZ", defaultModel: "GPT-4o", allowRegistration: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    request("GET", "/admin/settings")
      .then((data) => {
        if (data && data.settings) setSettings(data.settings)
        else if (data) setSettings(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    setSaving(true)
    setError(null)
    request("PUT", "/admin/settings", { settings })
      .then(() => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
      .catch((err) => {
        setError(err.message || t('common.save_error'))
      })
      .finally(() => setSaving(false))
  }

  const resetForm = () => {
    setSettings({ siteName: "InstaAutoUZ", defaultModel: "GPT-4o", allowRegistration: true })
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.06)_0%,_transparent_70%)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 border border-purple-400/20">
            <Settings size={10} /> Settings
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
          {t('admin.system_title')}
        </h1>
        <p className="text-sm text-white/40 mb-8">{t('admin.system_desc')}</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin shadow-lg shadow-purple-500/20" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-[#16162a] to-[#1a1a30] rounded-2xl p-6 border border-white/5 shadow-lg">
              <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2 pb-4 border-b border-white/5">
                <Globe size={14} className="text-blue-400" />
                {t('admin.general_settings')}
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                    <Globe size={11} /> {t('admin.system_name')}
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                    <Cpu size={11} /> {t('admin.default_ai_model')}
                  </label>
                  <select
                    value={settings.defaultModel}
                    onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
                  >
                    <option>GPT-4o</option>
                    <option>Claude 3.5 Sonnet</option>
                    <option>Gemini Pro</option>
                    <option>DeepSeek V3</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#16162a] to-[#1a1a30] rounded-2xl p-6 border border-white/5 shadow-lg">
              <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2 pb-4 border-b border-white/5">
                <UserPlus size={14} className="text-emerald-400" />
                {t('admin.registration')}
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{t('admin.allow_registration')}</p>
                  <p className="text-xs text-white/40 mt-0.5">{t('admin.registration_desc')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowRegistration}
                    onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
                </label>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#16162a] to-[#1a1a30] rounded-2xl p-6 border border-white/5 shadow-lg">
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-purple-400/10"
                >
                  {saving ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> {t('common.saving')}</>
                  ) : saved ? (
                    <><CheckCircle2 size={15} /> {t('common.saved')}</>
                  ) : (
                    <><Save size={15} /> {t('common.save')}</>
                  )}
                </button>
                {!saved && (
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <RotateCcw size={13} /> {t('common.reset')}
                  </button>
                )}
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 size={13} /> {t('settings_page.saved')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
