import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Search, Users, Mail, MoreHorizontal, UserCheck, UserX, Filter, Crown, Star } from "lucide-react"
import { request } from "../../lib/api-client"

const fallbackClients = [
  { id: 1, name: "Aziza Karimova", email: "aziza@mail.com", plan: "Pro", status: "Faol" },
  { id: 2, name: "Jahongir Aliyev", email: "jahon@mail.com", plan: "Bepul", status: "Faol" },
  { id: 3, name: "Madina Rahimova", email: "madina@mail.com", plan: "Biznes", status: "Bloklangan" },
]

const planConfig = {
  "Pro": { gradient: "from-blue-500 to-indigo-600", accent: "text-blue-400", bg: "bg-blue-500/10", icon: "⭐" },
  "Biznes": { gradient: "from-amber-500 to-orange-500", accent: "text-amber-400", bg: "bg-amber-500/10", icon: "👑" },
  "Bepul": { gradient: "from-gray-500 to-slate-600", accent: "text-gray-400", bg: "bg-gray-500/10", icon: "🔹" },
}

export default function Clients() {
  const { t } = useTranslation()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState("")
  const [filterPlan, setFilterPlan] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request("GET", "/admin/clients")
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients(fallbackClients))
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients.filter((c) => {
    const matchSearch = (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
    const matchPlan = filterPlan === "all" || (c.plan || "").toLowerCase() === filterPlan.toLowerCase()
    return matchSearch && matchPlan
  })

  return (
    <div className="min-h-screen bg-[#0a0a12] bg-[radial-gradient(ellipse_at_top,_rgba(236,72,153,0.06)_0%,_transparent_70%)]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/20 border border-pink-400/20">
            <Users size={10} /> Users
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
          {t('admin.clients')}
        </h1>
        <p className="text-sm text-white/40 mb-8">{t('admin.all_users')}</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" strokeWidth={1.5} />
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl bg-[#16162a] border border-white/5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm rounded-xl bg-[#16162a] border border-white/5 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all shadow-sm appearance-none"
            >
              <option value="all">{t('admin.all_plans')}</option>
              <option value="Pro">⭐ Pro</option>
              <option value="Biznes">👑 Biznes</option>
              <option value="Bepul">🔹 Bepul</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && !loading && (
            <div className="text-center py-16 bg-[#16162a] rounded-2xl border border-white/5">
              <Users size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">{t('common.no_results')}</p>
            </div>
          )}

          {filtered.map((c) => {
            const plan = planConfig[c.plan] || planConfig["Bepul"]
            return (
              <div key={c.id ?? c.email} className="group bg-[#16162a] hover:bg-[#1a1a34] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                        {(c.name || "?")[0]}
                      </div>
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${plan.bg} flex items-center justify-center text-[8px] border border-white/10`}>
                        {plan.icon}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-white/40">
                          <Mail size={10} /> {c.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r ${plan.gradient} text-white shadow-md`}>
                      {plan.icon} {c.plan}
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      c.status === "Faol"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {c.status === "Faol" ? <UserCheck size={10} /> : <UserX size={10} />}
                      {c.status === "Faol" ? t('common.active') : t('admin.blocked')}
                    </span>
                    <button className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/70 transition-all">
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-white/30">
            {t('admin.total')}: <span className="font-semibold text-white">{filtered.length}</span> {t('admin.clients').toLowerCase()}
          </p>
        </div>
      </div>
    </div>
  )
}
