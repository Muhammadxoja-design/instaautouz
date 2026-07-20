import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { Plus, BookOpen, Trash2 } from "lucide-react"
import { request, db } from "../../lib/api-client"
import { useTranslation } from "react-i18next"

const fallbackItems = [
  { id: 1, text: "Mahsulotlarimiz O'zbekiston bo'ylab yetkazib beriladi", useCount: 24 },
  { id: 2, text: "To'lov turlari: Payme, Click, Uzum, Naqd", useCount: 18 },
  { id: 3, text: "Ish vaqti: Dushanba-Shanba 9:00-20:00", useCount: 15 },
]

export default function AIKnowledge() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    try {
      const data = await request("GET", "/ai/knowledge")
      setItems(Array.isArray(data) ? data : data.items || data.entries || data.knowledge || data || [])
    } catch {
      setItems(fallbackItems)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleDelete = async (id) => {
    try {
      await request("DELETE", "/ai/knowledge/" + id)
      fetchItems()
    } catch {
      alert(t('ai.delete_error'))
    }
  }

  const handleAdd = async () => {
    const newText = prompt(t('ai.add_prompt'))
    if (!newText?.trim()) return
    try {
      await request("POST", "/ai/knowledge", { text: newText })
      fetchItems()
    } catch {
      alert(t('ai.add_error'))
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-base-900 dark:text-white">{t('ai.knowledge_title')}</h1>
          <p className="text-sm text-base-400 mt-1">{t('ai.knowledge_subtitle')}</p>
        </div>
        <button onClick={handleAdd} className="btn btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16} strokeWidth={2} />
          {t('ai.add_knowledge')}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen size={15} className="text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-base-900 dark:text-white">{item.text}</p>
              <span className="text-xs text-base-400 mt-1 block">{t('ai.used_times', { count: item.useCount })}</span>
            </div>
            <button onClick={() => handleDelete(item.id)} className="text-base-300 hover:text-red-500 transition-colors shrink-0">
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
