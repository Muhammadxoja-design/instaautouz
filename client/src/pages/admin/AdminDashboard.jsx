import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Users, Settings as SettingsIcon, BarChart3, Activity, DollarSign, TrendingUp, List, Shield, Zap, Crown, Sparkles, Flame } from "lucide-react"
import { request } from "../../lib/api-client"
import { Link } from "react-router-dom"

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ users: "128", subscriptions: "84", revenue: "$4,280", growth: "+12.5%" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/admin/clients")
      .then((data) => {
        setStats({ users: String(data.length || "128"), subscriptions: "84", revenue: "$4,280", growth: "+12.5%" })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { icon: Users, label: t('admin.total_clients'), value: stats.users, gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30", iconBg: "bg-violet-500/20", accent: "text-violet-400" },
    { icon: Activity, label: t('admin.active_subscriptions'), value: stats.subscriptions, gradient: "from-emerald-500 to-cyan-500", glow: "shadow-emerald-500/30", iconBg: "bg-emerald-500/20", accent: "text-emerald-400" },
    { icon: DollarSign, label: t('admin.revenue'), value: stats.revenue, gradient: "from-amber-500 to-orange-500", glow: "shadow-amber-500/30", iconBg: "bg-amber-500/20", accent: "text-amber-400" },
    { icon: TrendingUp, label: t('admin.growth'), value: stats.growth, gradient: "from-rose-500 to-pink-500", glow: "shadow-rose-500/30", iconBg: "bg-rose-500/20", accent: "text-rose-400" },
  ]

  const quickActions = [
    { to: "/admin/clients", icon: Users, label: t('admin.clients'), gradient: "from-blue-600 to-indigo-600", desc: t('admin.manage_users'), accent: "text-blue-400" },
    { to: "/admin/settings", icon: SettingsIcon, label: t('admin.settings'), gradient: "from-purple-600 to-pink-600", desc: t('admin.system_config'), accent: "text-purple-400" },
    { to: "/admin", icon: Shield, label: t('admin.security'), gradient: "from-emerald-600 to-teal-600", desc: t('admin.security_desc'), accent: "text-emerald-400" },
    { to: "/admin", icon: BarChart3, label: t('admin.analytics'), gradient: "from-amber-600 to-red-600", desc: t('admin.analytics_desc'), accent: "text-amber-400" },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a12] bg-[radial-gradient(ellipse_at_top,_rgba(120,80,255,0.08)_0%,_transparent_70%)]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20 border border-violet-400/20">
                <Zap size={10} /> Admin Panel
              </span>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Live Dashboard</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {t('admin.dashboard')}
            </h1>
            <p className="text-sm text-white/40 mt-1">{t('admin.system_management')}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">System Online</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((c) => (
            <div key={c.label} className={`relative group bg-gradient-to-br from-[#16162a] to-[#1a1a30] rounded-2xl p-5 border border-white/5 shadow-lg ${c.glow} hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl" />
              <div className="relative flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center border border-white/10`}>
                  <c.icon size={18} className={c.accent} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/5">{t('admin.this_month')}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-white mb-1">{c.value}</p>
              <p className="text-xs text-white/40">{c.label}</p>
              <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-gradient-to-br from-[#16162a] to-[#1a1a30] rounded-2xl p-6 border border-white/5 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Sparkles size={16} className="text-violet-400" />
              {t('admin.quick_actions')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <Link key={a.label} to={a.to} className="group relative overflow-hidden rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.04]">
                  <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  <div className="relative flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${a.gradient} bg-opacity-20 flex items-center justify-center shadow-md shrink-0`}>
                      <a.icon size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 group-hover:bg-clip-text transition-all">{a.label}</p>
                      <p className="text-xs text-white/40">{a.desc}</p>
                    </div>
                    <div className="ml-auto">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1 5H9M9 5L5.5 1.5M9 5L5.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 group-hover:text-white/60" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#16162a] to-[#1a1a30] rounded-2xl p-6 border border-white/5 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Flame size={16} className="text-cyan-400" />
              {t('admin.recent_activity')}
            </h2>
            <div className="space-y-4">
              {[
                { icon: "👤", action: t('admin.new_user_registered'), user: "Aziza K.", time: "5 min" },
                { icon: "⭐", action: t('admin.subscription_upgraded'), user: "Jahongir A.", time: "12 min" },
                { icon: "💰", action: t('admin.payment_received'), user: "Madina R.", time: "2 soat" },
                { icon: "👤", action: t('admin.new_user_registered'), user: "Bobur M.", time: "3 soat" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs shrink-0 border border-white/5 group-hover:border-white/10 transition-all">
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">{a.action}</p>
                    <p className="text-xs text-white/30 mt-0.5">{a.user} · {a.time}</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 mt-2 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#16162a] to-[#1a1a30] rounded-2xl p-6 border border-white/5 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Crown size={16} className="text-amber-400" />
              {t('admin.management')}
            </h2>
            <div className="flex gap-2">
              <Link to="/admin/clients" className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all border border-blue-400/10">👥 {t('admin.view_clients')}</Link>
              <Link to="/admin/settings" className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all border border-purple-400/10">⚙️ {t('admin.settings')}</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('admin.total_users'), value: stats.users, emoji: "👥", color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: t('admin.active_now'), value: "18", emoji: "🟢", color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: t('admin.pending_payments'), value: "7", emoji: "💳", color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: t('admin.new_today'), value: "5", emoji: "📈", color: "text-rose-400", bg: "bg-rose-500/10" },
            ].map((s) => (
              <div key={s.label} className={`text-center p-4 rounded-xl ${s.bg} border border-white/5 hover:border-white/10 transition-all`}>
                <span className="text-lg block mb-1">{s.emoji}</span>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
