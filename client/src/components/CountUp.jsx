import { animate, useInView } from "framer-motion"
import { useEffect, useRef, useState } from "react"

export default function CountUp({ end, suffix = "", decimals = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, end, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setCount(v),
    })
    return () => controls.stop()
  }, [inView, end])

  const display = end >= 1_000_000
    ? (count / 1_000_000).toFixed(0)
    : count.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })

  const displaySuffix = end >= 1_000_000 ? "M+" : suffix

  return <span ref={ref}>{display}{displaySuffix}</span>
}
