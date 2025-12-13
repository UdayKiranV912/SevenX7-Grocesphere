import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export const useDeliveryRealtime = (orderId: string) => {
  const [pos, setPos] = useState<[number, number] | null>(null)

  useEffect(() => {
    const ch = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (p: any) => {
          if (p.new.delivery_lat)
            setPos([p.new.delivery_lat, p.new.delivery_lng])
        })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [orderId])

  return pos
}