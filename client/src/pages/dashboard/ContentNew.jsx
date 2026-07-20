import { useState, useRef } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft, Image, Upload, X, Loader2, CalendarIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

export default function ContentNew() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [caption, setCaption] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [platform, setPlatform] = useState("Instagram")
  const [scheduledAt, setScheduledAt] = useState("")
  const [media, setMedia] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMedia(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  function clearMedia() {
    setMedia(null)
    setMediaPreview(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleSave() {
    if (!caption.trim() || !scheduledAt) {
      setError(t("content.fill_required"))
      return
    }
    setSaving(true)
    setError(null)
    try {
      let mediaUrls = []
      if (media) {
        setUploading(true)
        const form = new FormData()
        form.append("file", media)
        const uploadRes = await request("POST", "/integrations/core/upload", form, true)
        const uploadData = Array.isArray(uploadRes) ? uploadRes[0] || {} : uploadRes
        if (uploadData.error) throw new Error(uploadData.error?.message || "Upload failed")
        mediaUrls = [uploadData.file_url || uploadData.url || uploadData.path || ""]
        setUploading(false)
      }

      const hashtagList = hashtags.split(",").map((h) => h.trim().replace(/^#/, "")).filter(Boolean)

      await request("POST", "/content", {
        platform,
        caption: caption.trim(),
        mediaUrls,
        hashtags: hashtagList,
        scheduledAt: new Date(scheduledAt).toISOString(),
        contentType: media?.type?.startsWith("video") ? "video" : "post",
      })
      navigate("/dashboard/content")
    } catch (err) {
      setError(err.message || t("common.error_occurred"))
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/content")} className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t("common.back")}
      </button>
      <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white mb-6">{t("content.create_post")}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-5">
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</div>}

          <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("content.caption")}</label>
            <textarea
              rows={4}
              placeholder={t("content.caption_placeholder")}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
            <p className="text-xs text-base-400 mt-1 text-right">{caption.length}/2200</p>
          </div>

          <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("content.hashtags")}</label>
            <input
              type="text"
              placeholder="marketing, smm, instagram"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("content.platform")}</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              <option value="Instagram">Instagram</option>
              <option value="ig">Instagram (direct)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("content.schedule")}</label>
            <div className="relative">
              <CalendarIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-300" strokeWidth={1.5} />
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-base-600 dark:text-white/60 mb-1.5 block">{t("content.media")}</label>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />

            {mediaPreview ? (
              <div className="relative rounded-xl overflow-hidden bg-base-50 dark:bg-base-800/50">
                {media?.type?.startsWith("video") ? (
                  <video src={mediaPreview} className="w-full max-h-64 object-contain" controls />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-contain" />
                )}
                <button
                  onClick={clearMedia}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed border-[rgba(10,10,15,0.12)] dark:border-white/15 flex flex-col items-center justify-center gap-2 text-base-300 hover:text-primary hover:border-primary transition-all cursor-pointer bg-transparent"
              >
                <Upload size={20} strokeWidth={1.5} />
                <span className="text-xs">{t("content.upload_hint")}</span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-[rgba(10,10,15,0.06)] dark:border-white/5">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {(saving || uploading) && <Loader2 size={15} className="animate-spin" />}
              {uploading ? t("content.uploading") : saving ? t("common.saving") : t("content.schedule_post")}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
