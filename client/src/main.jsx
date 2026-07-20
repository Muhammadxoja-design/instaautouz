import { useEffect } from "react"
import React from "react"
import ReactDOM from "react-dom/client"
import { ThemeProvider } from "next-themes"
import { Toaster, toast } from "sonner"
import { AuthProvider } from "@/lib/AuthContext"
import { setToast } from "@/lib/api-client"
import App from "@/App.jsx"
import "@/index.css"
import "@/i18n"

function ToastInit() {
  useEffect(() => {
    setToast((msg, type) => {
      if (type === 'error') toast.error(msg);
      else if (type === 'success') toast.success(msg);
      else toast(msg);
    });
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <AuthProvider>
      <ToastInit />
      <App />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </AuthProvider>
  </ThemeProvider>,
)
