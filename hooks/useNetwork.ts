import { useEffect, useState } from 'react'

export const useNetwork = () => {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    window.addEventListener('online', () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
  }, [])

  return online
}