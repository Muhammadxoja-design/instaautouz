import { useState } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { Hash, Copy, Check, Loader2, RefreshCw } from "lucide-react"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

export default function AIHashtags() {
  const { t } = useTranslation()
  const [caption, setCaption] = useState("")
  const [count, setCount] = useState(15)
  const [hashtags, setHashtags] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerate() {
    if (!caption.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await request("POST", "/ai/generate-hashtags", { caption, count })
      setHashtags(res.hashtags || [])
    } catch (err) {
      setError(err.message || t("common.error_occurred"))
    } finally {
      setLoading(false)
    }
  }

  function copyAll() {
    navigator.clipboard.writeText(hashtags.map((h) => `#${h}`).join(" "))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyTag(tag) {
    navigator.clipboard.writeText(`#${tag}`)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t("ai.hashtags_title")}</h1>
        <p className="text-sm text-base-400 mt-1">{t("ai.hashtags_subtitle")}</p>
      </div>

      <div className="card p-6 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("ai.caption_for_hashtags")}</label>
            <textarea
              rows={3}
              placeholder={t("ai.hashtags_placeholder")}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("ai.hashtag_count")}</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              {[5, 10, 15, 20, 30].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading || !caption.trim()} className="btn btn-primary mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Hash size={15} />}
          {loading ? t("ai.generating") : t("ai.generate_hashtags")}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      {hashtags.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-base-900 dark:text-white">{t("ai.results")} ({hashtags.length})</p>
            <div className="flex items-center gap-2">
              <button onClick={handleGenerate} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <RefreshCw size={12} />
                {t("ai.regenerate")}
              </button>
              <button onClick={copyAll} className="btn px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(10,10,15,0.12)] dark:border-white/15 inline-flex items-center gap-1">
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? t("common.copied") : t("ai.copy_all")}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag, i) => (
              <button
                key={i}
                onClick={() => copyTag(tag)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/5 text-primary hover:bg-primary/10 transition-all"
                title={t("common.copy")}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
