import { BrowserRouter, Routes, Route } from "react-router-dom"
import Landing from "./pages/Landing"

import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import VerifyOTP from "./pages/auth/VerifyOTP"
import Verify2FA from "./pages/auth/Verify2FA"
import ForgotPassword from "./pages/auth/ForgotPassword"
import ResetPassword from "./pages/auth/ResetPassword"
import OAuthCallback from "./pages/OAuthCallback"
import NotFound from "./pages/NotFound"

import ErrorBoundary from "./components/ErrorBoundary"
import ProtectedRoute from "./components/ProtectedRoute"
import Dashboard from "./pages/dashboard/Dashboard"
import Analytics from "./pages/dashboard/Analytics"
import AnalyticsInstagram from "./pages/dashboard/AnalyticsInstagram"
import AnalyticsAI from "./pages/dashboard/AnalyticsAI"
import AnalyticsDMs from "./pages/dashboard/AnalyticsDMs"
import IGAccounts from "./pages/dashboard/IGAccounts"
import IGConnect from "./pages/dashboard/IGConnect"
import AutomationRules from "./pages/dashboard/AutomationRules"
import AutomationNew from "./pages/dashboard/AutomationNew"
import Subscriptions from "./pages/dashboard/Subscriptions"
import Payments from "./pages/dashboard/Payments"
import PaymentDetail from "./pages/dashboard/PaymentDetail"
import PaymentCallback from "./pages/dashboard/PaymentCallback"
import DMs from "./pages/dashboard/DMs"
import DMConversation from "./pages/dashboard/DMConversation"
import Templates from "./pages/dashboard/Templates"
import TemplateNew from "./pages/dashboard/TemplateNew"
import Content from "./pages/dashboard/Content"
import ContentNew from "./pages/dashboard/ContentNew"
import AI from "./pages/dashboard/AI"
import AICaptions from "./pages/dashboard/AICaptions"
import AIHashtags from "./pages/dashboard/AIHashtags"
import AIKnowledge from "./pages/dashboard/AIKnowledge"
import AISettings from "./pages/dashboard/AISettings"
import Platforms from "./pages/dashboard/Platforms"
import Telegram from "./pages/dashboard/Telegram"
import Settings from "./pages/dashboard/Settings"

import AdminDashboard from "./pages/admin/AdminDashboard"
import Clients from "./pages/admin/Clients"
import SettingsAdmin from "./pages/admin/SettingsAdmin"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ErrorBoundary><Landing /></ErrorBoundary>} />

        <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
        <Route path="/register" element={<ErrorBoundary><Register /></ErrorBoundary>} />
        <Route path="/verify-otp" element={<ErrorBoundary><VerifyOTP /></ErrorBoundary>} />
        <Route path="/verify-2fa" element={<ErrorBoundary><Verify2FA /></ErrorBoundary>} />
        <Route path="/forgot-password" element={<ErrorBoundary><ForgotPassword /></ErrorBoundary>} />
        <Route path="/reset-password" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
        <Route path="/auth/callback" element={<ErrorBoundary><OAuthCallback /></ErrorBoundary>} />
        <Route path="/auth/facebook/callback" element={<ErrorBoundary><OAuthCallback /></ErrorBoundary>} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/dashboard/analytics/instagram" element={<ProtectedRoute><AnalyticsInstagram /></ProtectedRoute>} />
        <Route path="/dashboard/analytics/ai" element={<ProtectedRoute><AnalyticsAI /></ProtectedRoute>} />
        <Route path="/dashboard/analytics/dms" element={<ProtectedRoute><AnalyticsDMs /></ProtectedRoute>} />
        <Route path="/dashboard/ig-accounts" element={<ProtectedRoute><IGAccounts /></ProtectedRoute>} />
        <Route path="/dashboard/ig-accounts/connect" element={<ProtectedRoute><IGConnect /></ProtectedRoute>} />
        <Route path="/dashboard/automation" element={<ProtectedRoute><AutomationRules /></ProtectedRoute>} />
        <Route path="/dashboard/automation/new" element={<ProtectedRoute><AutomationNew /></ProtectedRoute>} />
        <Route path="/dashboard/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
        <Route path="/dashboard/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/dashboard/payments/:id" element={<ProtectedRoute><PaymentDetail /></ProtectedRoute>} />
        <Route path="/dashboard/payments/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
        <Route path="/dashboard/dms" element={<ProtectedRoute><DMs /></ProtectedRoute>} />
        <Route path="/dashboard/dms/:id" element={<ProtectedRoute><DMConversation /></ProtectedRoute>} />
        <Route path="/dashboard/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
        <Route path="/dashboard/templates/new" element={<ProtectedRoute><TemplateNew /></ProtectedRoute>} />
        <Route path="/dashboard/content" element={<ProtectedRoute><Content /></ProtectedRoute>} />
        <Route path="/dashboard/content/new" element={<ProtectedRoute><ContentNew /></ProtectedRoute>} />
        <Route path="/dashboard/ai" element={<ProtectedRoute><AI /></ProtectedRoute>} />
        <Route path="/dashboard/ai/captions" element={<ProtectedRoute><AICaptions /></ProtectedRoute>} />
        <Route path="/dashboard/ai/hashtags" element={<ProtectedRoute><AIHashtags /></ProtectedRoute>} />
        <Route path="/dashboard/ai/knowledge" element={<ProtectedRoute><AIKnowledge /></ProtectedRoute>} />
        <Route path="/dashboard/ai/settings" element={<ProtectedRoute><AISettings /></ProtectedRoute>} />
        <Route path="/dashboard/platforms" element={<ProtectedRoute><Platforms /></ProtectedRoute>} />
        <Route path="/dashboard/telegram" element={<ProtectedRoute><Telegram /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><SettingsAdmin /></ProtectedRoute>} />

        <Route path="/404" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
        <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
      </Routes>
    </BrowserRouter>
  )
}
