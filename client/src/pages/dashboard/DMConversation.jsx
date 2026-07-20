import { useState, useEffect, useRef } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { ArrowLeft, Send, Phone, Video } from "lucide-react"
import { useParams, useNavigate } from "react-router-dom"
import { request } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

const fallbackMessages = [
  { from: "them", text: "Assalomu alaykum! Mahsulot haqida ma'lumot olsam bo'ladimi?" },
  { from: "me", text: "Va alaykum assalom! Albatta, qaysi mahsulot qiziqtiradi?" },
  { from: "them", text: "Yangi kelgan to'plam narxlari qancha?" },
]

export default function DMConversation() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userName, setUserName] = useState("Foydalanuvchi")
  const chatEnd = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const convos = await request("GET", "/dms/conversations")
        const convo = Array.isArray(convos) ? convos.find((c) => c.id === id) : null
        if (convo) setUserName(convo.name || convo.userName || "Foydalanuvchi")
      } catch {}
      try {
        const msgs = await request("GET", "/dms/conversations/" + id + "/messages")
        if (Array.isArray(msgs) && msgs.length) {
          setMessages(msgs)
        } else {
          setMessages(fallbackMessages)
        }
      } catch {
        setMessages(fallbackMessages)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const userMsg = { from: "me", text: input }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setSending(true)
    try {
      await request("POST", "/dms/send", { conversationId: Number(id), content: input })
    } catch {
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/dashboard/dms")} className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-primary mb-4 transition-colors">
        <ArrowLeft size={15} strokeWidth={1.5} /> {t('common.back')}
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {userName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-base-900 dark:text-white">{userName}</p>
            <p className="text-xs text-green-500">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 flex items-center justify-center text-base-300 hover:text-primary transition-colors">
            <Phone size={15} strokeWidth={1.5} />
          </button>
          <button className="w-9 h-9 rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 flex items-center justify-center text-base-300 hover:text-primary transition-colors">
            <Video size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="card h-[400px] flex flex-col">
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-base-400">{t('dms.loading_messages')}</div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                  m.from === "me"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-base-50 dark:bg-base-800 text-base-900 dark:text-white rounded-bl-md"
                }`}>{m.text}</div>
              </div>
            ))
          )}
          <div ref={chatEnd} />
        </div>

        <div className="p-4 border-t border-[rgba(10,10,15,0.07)] dark:border-white/10">
          <div className="flex items-center gap-2">
            <input type="text" placeholder={t('dms.type_message')} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-[rgba(10,10,15,0.12)] dark:border-white/15 bg-white dark:bg-base-800 text-base-900 dark:text-white placeholder:text-base-300 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            <button onClick={handleSend} disabled={sending || !input.trim()} className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-50" title={t('dms.send')}>
              <Send size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
