import { Instagram, LayoutDashboard, Menu, X } from "lucide-react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/AuthContext"
import ThemeToggle from "./ThemeToggle"

const scrollTo = (id) => (e) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
}

const links = [
  { labelKey: "nav.features", href: "#imkoniyatlar", id: "imkoniyatlar" },
  { labelKey: "nav.pricing", href: "#narxlar", id: "narxlar" },
  { labelKey: "nav.faq", href: "#faq", id: "faq" },
]

export default function Navbar() {
  const { t } = useTranslation()
  const { isAuthenticated, authChecked } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === "/"

  return (
    <nav className="sticky top-0 z-50 bg-white/92 dark:bg-base-900/92 backdrop-blur-xl border-b border-[rgba(10,10,15,0.07)] dark:border-white/10">
      <div className="container-content flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Instagram size={16} className="text-white" strokeWidth={2} />
          </span>
          <span className="font-semibold text-sm tracking-tight font-display text-base-900 dark:text-white">
            {t("common.app_name")}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) =>
            isLanding ? (
              <a key={l.id} href={l.href} onClick={scrollTo(l.id)} className="text-sm text-base-400 hover:text-primary transition-colors">
                {t(l.labelKey)}
              </a>
            ) : (
              <Link key={l.id} to={"/#" + l.id} className="text-sm text-base-400 hover:text-primary transition-colors">
                {t(l.labelKey)}
              </Link>
            )
          )}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {authChecked && isAuthenticated ? (
            <Link
              to="/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-all"
            >
              <LayoutDashboard size={16} strokeWidth={2} />
              {t("nav.dashboard") || "Dashboard"}
            </Link>
          ) : (
            <Link
              to="/register"
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-base-900 text-white hover:opacity-90 transition-all dark:bg-white dark:text-base-900"
            >
              {t("nav.register")}
            </Link>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-base-400 dark:text-white/60">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[rgba(10,10,15,0.07)] dark:border-white/10 bg-white dark:bg-base-900 px-6 py-4 space-y-3">
          {links.map((l) => (
            <a key={l.id} href={l.href} onClick={(e) => { setOpen(false); scrollTo(l.id)(e) }} className="block text-sm text-base-400 hover:text-primary">
              {t(l.labelKey)}
            </a>
          ))}
          {authChecked && isAuthenticated ? (
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium px-4 py-2.5 rounded-lg bg-primary text-white"
            >
              <LayoutDashboard size={16} strokeWidth={2} className="inline mr-1.5" />
              {t("nav.dashboard") || "Dashboard"}
            </Link>
          ) : (
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium px-4 py-2.5 rounded-lg bg-base-900 text-white dark:bg-white dark:text-base-900"
            >
              {t("nav.register")}
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
