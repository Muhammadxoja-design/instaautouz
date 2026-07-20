import Sidebar from "./Sidebar"

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-white dark:bg-base-900">
      <Sidebar />
      <main className="lg:ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
