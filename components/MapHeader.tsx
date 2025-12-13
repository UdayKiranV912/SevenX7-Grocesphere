import React from 'react';

export default function MapHeader({ eta }: { eta: number | null }) {
  return (
    <div className="absolute top-3 left-3 bg-white px-3 py-2 rounded-xl z-[1000] font-bold shadow-md text-sm flex items-center gap-2">
      {eta ? `🚦 ETA ${eta} min` : 'Calculating ETA...'}
    </div>
  )
}