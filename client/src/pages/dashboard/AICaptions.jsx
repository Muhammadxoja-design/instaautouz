import { useState } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { Sparkles, Copy, Check, Loader2, RefreshCw } from "lucide-react"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

export default function AICaptions() {
  const { t } = useTranslation()
  const [topic, setTopic] = useState("")
  const [tone, setTone] = useState("professional")
  const [captions, setCaptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [error, setError] = useState(null)

  async function handleGenerate() {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await request("POST", "/ai/generate-caption", { topic, tone })
      setCaptions(res.captions || [])
    } catch (err) {
      setError(err.message || t("common.error_occurred"))
    } finally {
      setLoading(false)
    }
  }

  function copyCaption(text, index) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const tones = [
    { value: "professional", label: t("ai.tone_professional") },
    { value: "funny", label: t("ai.tone_funny") },
    { value: "inspirational", label: t("ai.tone_inspirational") },
    { value: "promotional", label: t("ai.tone_promotional") },
  ]

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("ai.captions_title")}</h1>
        <p className="text-sm text-base-400 mt-1">{t("ai.captions_subtitle")}</p>
      </div>

      <div className="card p-6 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("ai.topic")}</label>
            <input
              type="text"
              placeholder={t("ai.topic_placeholder")}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("ai.tone")}</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              {tones.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn btn-primary mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? t("ai.generating") : t("ai.generate_captions")}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      {captions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-base-900 dark:text-white">{t("ai.results")} ({captions.length})</p>
            <button
              onClick={handleGenerate}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw size={12} />
              {t("ai.regenerate")}
            </button>
          </div>
          {captions.map((c, i) => (
            <div key={i} className="card p-4 flex items-start justify-between gap-4 group">
              <p className="text-sm text-base-900 dark:text-white leading-relaxed">{c}</p>
              <button
                onClick={() => copyCaption(c, i)}
                className="shrink-0 w-8 h-8 rounded-lg bg-base-50 dark:bg-base-800 flex items-center justify-center text-base-300 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
                title={t("common.copy")}
              >
                {copiedIndex === i ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
