import { Download } from 'lucide-react'
import type { RunStats, Conflict } from '../types'
import { cn } from '../lib/cn'

interface Props {
  stats: RunStats | null
  conflicts: Conflict[]
  isStreaming: boolean
}

export function RunStatsPanel({ stats, conflicts, isStreaming }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-[10px] tracking-[0.18em] uppercase text-neutral-500 font-normal">
          Run stats
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Live stats */}
        <div className="space-y-2">
          {[
            { label: 'Iterations', value: stats?.iterationsCompleted ?? '—' },
            { label: 'Principles applied', value: stats?.principlesApplied ?? '—' },
            { label: 'Critiques', value: stats?.critiques ?? '—' },
            { label: 'Revisions', value: stats?.revisions ?? '—' },
            { label: 'Words changed', value: stats?.wordsChanged ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-baseline">
              <span className="text-[11px] text-neutral-600">{label}</span>
              <span className={cn(
                'text-xs tabular-nums',
                isStreaming && value !== '—' ? 'text-teal-400' : 'text-neutral-400'
              )}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Conflict flags */}
        {conflicts.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] tracking-[0.12em] uppercase text-red-500/70">
              Conflicts ({conflicts.length})
            </div>
            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div key={i} className="border border-red-500/20 rounded-sm p-2.5 bg-red-950/10 space-y-1.5">
                  <div className="text-[10px] text-red-400/90 leading-relaxed">
                    <span className="text-red-500/60">A: </span>
                    {c.principle_a.length > 60 ? c.principle_a.slice(0, 60) + '…' : c.principle_a}
                  </div>
                  <div className="text-[10px] text-red-400/90 leading-relaxed">
                    <span className="text-red-500/60">B: </span>
                    {c.principle_b.length > 60 ? c.principle_b.slice(0, 60) + '…' : c.principle_b}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!stats && !isStreaming && conflicts.length === 0 && (
          <div className="text-[11px] text-neutral-700 leading-relaxed">
            Stats appear here after a run completes.
          </div>
        )}
      </div>

      {/* Export button */}
      <div className="px-4 py-3 border-t border-white/5">
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 text-xs text-neutral-700
            border border-white/5 rounded-sm py-2 cursor-not-allowed"
          title="Export (coming soon)"
        >
          <Download size={12} />
          Export trace
        </button>
      </div>
    </div>
  )
}
