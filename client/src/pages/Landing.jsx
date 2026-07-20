import { Navigate } from "react-router-dom"
import { useAuth } from "@/lib/AuthContext"
import Navbar from "../components/Navbar"
import Hero from "../components/Hero"
import Stats from "../components/Stats"
import Features from "../components/Features"
import HowItWorks from "../components/HowItWorks"
import Pricing from "../components/Pricing"
import FAQ from "../components/FAQ"
import CTA from "../components/CTA"
import Footer from "../components/Footer"

export default function Landing() {
  const { isAuthenticated, authChecked } = useAuth()

  if (authChecked && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </>
  )
}
