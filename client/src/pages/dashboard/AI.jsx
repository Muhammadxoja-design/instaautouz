import { useState, useEffect, useRef } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { Send, Loader } from "lucide-react"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

export default function AI() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([{ role: "bot", text: t('ai.welcome') }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const chatEnd = useRef(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: "user", text: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)
    try {
      const res = await request("POST", "/ai/chat", { message: input })
      setMessages(prev => [...prev, { role: "bot", text: res.reply }])
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: t('ai.error') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t('ai.title')}</h1>
        <p className="text-sm text-base-400 mt-1">{t('ai.subtitle')}</p>
      </div>

      <div className="card h-[500px] flex flex-col">
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                m.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-base-50 dark:bg-base-800 text-base-900 dark:text-white rounded-bl-md"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        <div className="p-4 border-t border-[rgba(10,10,15,0.07)] dark:border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('ai.type_message')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              onClick={handleSend}
              className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition-all"
              title={t('common.send')}
            >
              {loading ? <Loader size={15} strokeWidth={2} className="animate-spin" /> : <Send size={15} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
