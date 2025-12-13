import { useEffect, useState } from 'react'

export const useETA = () => {
  const [sec, setSec] = useState<number | null>(null)

  useEffect(() => {
    if (!sec) return
    const t = setInterval(() => setSec(s => s && s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [sec])

  return {
    etaMin: sec ? Math.ceil(sec / 60) : null,
    setETA: (s: number) => setSec(Math.round(s))
  }
}