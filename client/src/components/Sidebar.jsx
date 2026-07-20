import { NavLink, useNavigate } from "react-router-dom"
import {
  Instagram, LayoutDashboard, BarChart3, MessageCircle, Zap, CreditCard, Bot,
  Settings, Menu, X, LogOut, FileText, Calendar, DollarSign
} from "lucide-react"
import ThemeToggle from "./ThemeToggle"
import { useState } from "react"
import { useAuth } from "@/lib/AuthContext"
import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"

const mainLinks = (t) => [
  { to: "/dashboard", icon: LayoutDashboard, label: t('sidebar.dashboard') },
  { to: "/dashboard/analytics", icon: BarChart3, label: t('sidebar.analytics') },
]

const appLinks = (t) => [
  { to: "/dashboard/ig-accounts", icon: Instagram, label: t('sidebar.ig_accounts') },
  { to: "/dashboard/automation", icon: Zap, label: t('sidebar.automation_rules') },
  { to: "/dashboard/templates", icon: FileText, label: t('sidebar.templates') },
  { to: "/dashboard/content", icon: Calendar, label: t('sidebar.content') },
  { to: "/dashboard/dms", icon: MessageCircle, label: t('sidebar.dms') },
  { to: "/dashboard/payments", icon: DollarSign, label: t('sidebar.payments') },
  { to: "/dashboard/subscriptions", icon: CreditCard, label: t('sidebar.subscriptions') },
  { to: "/dashboard/ai", icon: Bot, label: t('sidebar.ai'), children: [
    { to: "/dashboard/ai", icon: Bot, label: t('sidebar.ai_chat') },
    { to: "/dashboard/ai/captions", icon: Bot, label: t('sidebar.ai_captions') },
    { to: "/dashboard/ai/hashtags", icon: Bot, label: t('sidebar.ai_hashtags') },
    { to: "/dashboard/ai/knowledge", icon: Bot, label: t('sidebar.ai_knowledge') },
    { to: "/dashboard/ai/settings", icon: Bot, label: t('sidebar.ai_settings') },
  ] },
  { to: "/dashboard/platforms", icon: Instagram, label: t('sidebar.platforms') },
  { to: "/dashboard/telegram", icon: MessageCircle, label: t('sidebar.telegram') },
  { to: "/dashboard/settings", icon: Settings, label: t('sidebar.settings') },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState({})
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-white dark:bg-base-800 border border-[rgba(10,10,15,0.08)] dark:border-white/10 flex items-center justify-center text-base-400"
      >
        <Menu size={18} />
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-white dark:bg-base-900 border-r border-[rgba(10,10,15,0.07)] dark:border-white/10 flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-[rgba(10,10,15,0.07)] dark:border-white/10">
          <a href="/" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Instagram size={15} className="text-white" strokeWidth={2} />
            </span>
            <span className="font-semibold text-sm tracking-tight font-display text-base-900 dark:text-white">
              {t('common.app_name')}
            </span>
          </a>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button onClick={() => setOpen(false)} className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-base-400 hover:text-base-900 dark:hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold tracking-wider text-base-300 dark:text-white/30 uppercase mb-2">{t('sidebar.main')}</p>
          {mainLinks(t).map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-primary text-white" : "text-base-400 hover:text-base-900 dark:hover:text-white hover:bg-base-50 dark:hover:bg-base-800"
                }`
              }
            >
              <l.icon size={17} strokeWidth={1.5} /> {l.label}
            </NavLink>
          ))}

          <p className="px-3 text-xs font-semibold tracking-wider text-base-300 dark:text-white/30 uppercase mt-5 mb-2">{t('sidebar.app')}</p>
          {appLinks(t).map((l) => (
            l.children ? (
              <div key={l.to}>
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [l.to]: !prev[l.to] }))}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium text-base-400 hover:text-base-900 dark:hover:text-white hover:bg-base-50 dark:hover:bg-base-800 transition-all"
                >
                  <span className="flex items-center gap-3">
                    <l.icon size={17} strokeWidth={1.5} /> {l.label}
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${expanded[l.to] ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
                {expanded[l.to] && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l border-[rgba(10,10,15,0.08)] dark:border-white/10 pl-2">
                    {l.children.map((child) => (
                      <NavLink key={child.to} to={child.to} onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive ? "text-primary font-medium bg-primary/5" : "text-base-400 hover:text-base-900 dark:hover:text-white"
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive ? "bg-primary text-white" : "text-base-400 hover:text-base-900 dark:hover:text-white hover:bg-base-50 dark:hover:bg-base-800"
                  }`
                }
              >
                <l.icon size={17} strokeWidth={1.5} /> {l.label}
              </NavLink>
            )
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[rgba(10,10,15,0.07)] dark:border-white/10">
          <button
            onClick={() => { logout() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-base-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 w-full transition-all"
          >
            <LogOut size={17} strokeWidth={1.5} />
            {t('sidebar.logout')}
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  )
}
