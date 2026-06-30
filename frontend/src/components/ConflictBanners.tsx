import type { Conflict } from '../types'
import { AlertTriangle } from 'lucide-react'

interface Props {
  conflicts: Conflict[]
}

export function ConflictBanners({ conflicts }: Props) {
  if (conflicts.length === 0) return null

  return (
    <div className="space-y-2 px-4 pt-3">
      {conflicts.map((c, i) => (
        <div
          key={i}
          className="card-appear border border-red-500/30 rounded-sm bg-red-950/15 px-3 py-2.5 text-[11px] leading-relaxed"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
            <div className="space-y-1 text-neutral-400">
              <div>
                <span className="text-red-400/80">Tension detected: </span>
                <span className="text-red-300/70 underline decoration-red-500/50 underline-offset-2 decoration-wavy">
                  "{c.principle_a.slice(0, 50)}{c.principle_a.length > 50 ? '…' : ''}"
                </span>
                <span className="text-neutral-600"> vs </span>
                <span className="text-red-300/70 underline decoration-red-500/50 underline-offset-2 decoration-wavy">
                  "{c.principle_b.slice(0, 50)}{c.principle_b.length > 50 ? '…' : ''}"
                </span>
              </div>
              <div className="text-neutral-600">{c.explanation}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
