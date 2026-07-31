import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import DashboardLayout from "../../components/DashboardLayout"
import { User, Bell, Shield, Globe, Save, Check, Eye, EyeOff, Smartphone } from "lucide-react"
import { db } from "../../lib/api-client"

export default function Settings() {
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState("Profil")

  useEffect(() => {
    db.auth.me().then(setUser).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleUserUpdate = (updated) => {
    setUser(updated)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t('settings_page.title')}</h1>
        <p className="text-sm text-base-400 mt-1">{t('settings_page.profile_desc')}</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="card divide-y divide-[rgba(10,10,15,0.06)] dark:divide-white/5 h-fit">
          {[
            { icon: User, label: "Profil", key: "profile", desc: t('settings_page.profile_desc') },
            { icon: Bell, label: "Bildirishnomalar", key: "notifications", desc: t('settings_page.notifications_desc') },
            { icon: Shield, label: "Xavfsizlik", key: "security", desc: t('settings_page.security_desc') },
            { icon: Globe, label: "Til", key: "language", desc: t('settings_page.language_desc') },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => setActiveSection(s.label)}
              className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
                activeSection === s.label
                  ? "bg-primary-50 dark:bg-primary/10"
                  : "hover:bg-base-50 dark:hover:bg-white/[0.02]"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon size={18} className="text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-base-900 dark:text-white">{s.label}</p>
                <p className="text-xs text-base-400">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="card p-6">
          {activeSection === "Profil" && <ProfileSection user={user} onUpdate={handleUserUpdate} />}
          {activeSection === "Bildirishnomalar" && <NotificationsSection />}
          {activeSection === "Xavfsizlik" && <SecuritySection />}
          {activeSection === "Til" && <LanguageSection />}
        </div>
      </div>
    </DashboardLayout>
  )
}

function ProfileSection({ user, onUpdate }) {
  const { t } = useTranslation()
  const [name, setName] = useState(user?.name || "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (user) setName(user.name) }, [user])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const data = await db.auth.updateProfile({ name })
      if (data.client) onUpdate(data.client)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return <p className="text-sm text-base-400">{t('common.loading')}</p>

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-base-900 dark:text-white">{t('settings_page.profile')}</h3>
      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
      <div>
        <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('settings_page.name')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
      </div>
      <div>
        <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('common.email')}</label>
        <p className="text-sm text-base-900 dark:text-white px-3.5 py-2.5 bg-base-50 dark:bg-base-800/50 rounded-xl border border-transparent">{user.email}</p>
        <p className="text-xs text-base-400 mt-1">{t('settings_page.email_readonly')}</p>
      </div>
      <button onClick={handleSave} disabled={saving || !name.trim()}
        className="btn btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
        {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} strokeWidth={1.5} />}
        {saving ? t('common.saving') : saved ? t('settings_page.saved') : t('common.save')}
      </button>
    </div>
  )
}

function NotificationsSection() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem("notification_settings")
    return stored ? JSON.parse(stored) : { push: true, email: true, weeklyDigest: false }
  })
  const [saved, setSaved] = useState(false)

  const toggle = (key) => {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    localStorage.setItem("notification_settings", JSON.stringify(next))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const items = [
    { key: "push", label: t('settings_page.browser_notif'), desc: "" },
    { key: "email", label: t('settings_page.email_notif'), desc: "" },
    { key: "weeklyDigest", label: t('settings_page.notifications'), desc: "" },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-base-900 dark:text-white">{t('settings_page.notifications')}</h3>
        {saved && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={12} /> {t('settings_page.saved')}</span>}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-[rgba(10,10,15,0.08)] dark:border-white/10 cursor-pointer hover:bg-base-50 dark:hover:bg-white/[0.02] transition-colors">
            <div>
              <p className="text-sm font-medium text-base-900 dark:text-white">{item.label}</p>
              <p className="text-xs text-base-400">{item.desc}</p>
            </div>
            <div
              onClick={() => toggle(item.key)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${settings[item.key] ? "bg-primary" : "bg-base-200 dark:bg-base-700"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${settings[item.key] ? "right-0.5" : "left-0.5"}`} />
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

function SecuritySection() {
  const { t } = useTranslation()
  const [step, setStep] = useState("form")
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [telegramUsername, setTelegramUsername] = useState(null)
  const [tfaLoading, setTfaLoading] = useState(true)
  useEffect(() => {
    db.auth.authStatus().then((data) => {
      setTwoFactorEnabled(data.twoFactorEnabled)
      setTelegramLinked(data.telegramLinked)
      setTelegramUsername(data.telegramUsername)
    }).catch(() => {}).finally(() => setTfaLoading(false))
  }, [])

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) { setError(t('settings_page.new_password') + " kamida 6 belgidan iborat bo'lishi kerak"); return }
    if (newPassword !== confirmPassword) { setError(t('auth.confirm_password') + " bir-biriga mos kelmadi"); return }

    setSaving(true)
    try {
      await db.auth.changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-base-900 dark:text-white">{t('settings_page.security')}</h3>
      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-3 py-2 rounded-lg">{t('settings_page.saved')}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('settings_page.current_password')}</label>
          <div className="relative">
            <input type={show.current ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-10" />
            <button type="button" onClick={() => setShow({ ...show, current: !show.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-300 dark:text-white/30 hover:text-base-500">
              {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('settings_page.new_password')}</label>
          <div className="relative">
            <input type={show.new ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-10" />
            <button type="button" onClick={() => setShow({ ...show, new: !show.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-300 dark:text-white/30 hover:text-base-500">
              {show.new ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t('auth.confirm_password')}</label>
          <div className="relative">
            <input type={show.confirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-10" />
            <button type="button" onClick={() => setShow({ ...show, confirm: !show.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-300 dark:text-white/30 hover:text-base-500">
              {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="btn btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield size={16} strokeWidth={1.5} />}
          {saving ? t('common.saving') : t('settings_page.change_password')}
        </button>
      </form>

      <hr className="border-[rgba(10,10,15,0.08)] dark:border-white/10 my-6" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-base-900 dark:text-white">{t('settings_page.two_factor')}</h4>
            <p className="text-xs text-base-400 mt-0.5">
              {twoFactorEnabled
                ? t('settings_page.two_factor_on')
                : t('settings_page.two_factor_off')}
            </p>
          </div>
          <div>
            {tfaLoading ? (
              <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" />
            ) : telegramLinked ? (
              <div onClick={async () => {
                const next = !twoFactorEnabled
                try {
                  await db.auth.toggle2FA(next)
                  setTwoFactorEnabled(next)
                } catch (err) {
                  setError(err.message)
                }
              }}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${twoFactorEnabled ? "bg-primary" : "bg-base-200 dark:bg-base-700"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${twoFactorEnabled ? "right-0.5" : "left-0.5"}`} />
              </div>
            ) : (
              <p className="text-xs text-base-400 flex items-center gap-1">
                <Smartphone size={12} />
                {t('settings_page.link_telegram_first')}
              </p>
            )}
          </div>
        </div>
        {telegramUsername && (
          <p className="text-xs text-base-400 flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            @{telegramUsername}
          </p>
        )}
      </div>
    </div>
  )
}

function LanguageSection() {
  const { t, i18n } = useTranslation()
  const [lang, setLang] = useState(i18n.language || "uz")
  const [saved, setSaved] = useState(false)

  const languages = [
    { code: "uz", label: "O'zbek", flag: "🇺🇿" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ]

  const handleChange = (code) => {
    setLang(code)
    i18n.changeLanguage(code)
    localStorage.setItem("app_language", code)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-base-900 dark:text-white">{t('settings_page.language')}</h3>
        {saved && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={12} /> {t('settings_page.saved')}</span>}
      </div>
      <p className="text-sm text-base-400">{t('settings_page.language_desc')}</p>
      <div className="space-y-2 max-w-sm">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => handleChange(l.code)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
              lang === l.code
                ? "border-primary bg-primary-50 dark:bg-primary/10"
                : "border-[rgba(10,10,15,0.08)] dark:border-white/10 hover:bg-base-50 dark:hover:bg-white/[0.02]"
            }`}
          >
            <span className="text-lg">{l.flag}</span>
            <span className={`text-sm font-medium ${lang === l.code ? "text-primary" : "text-base-900 dark:text-white"}`}>
              {l.label}
            </span>
            {lang === l.code && <Check size={14} className="text-primary ml-auto" />}
          </button>
        ))}
      </div>
    </div>
  )
}
