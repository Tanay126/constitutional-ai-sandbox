import { ChevronDown, ChevronRight, Clock, Trash2 } from 'lucide-react'
import type { HistoryEntry } from '../types'
import { truncatePrompt } from '../lib/history'
import { cn } from '../lib/cn'

interface Props {
  open: boolean
  onToggle: () => void
  history: HistoryEntry[]
  onReplay: (entry: HistoryEntry) => void
  onClear: () => void
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

const modeBadge: Record<string, string> = {
  with_constitution: 'CAI',
  without: 'bare',
  side_by_side: 'side×side',
}

export function RunHistory({ open, onToggle, history, onReplay, onClear }: Props) {
  return (
    <div className="border-t border-white/5 shrink-0">
      {/* Toggle header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        {open ? <ChevronDown size={11} className="text-neutral-600" /> : <ChevronRight size={11} className="text-neutral-600" />}
        <Clock size={11} className="text-neutral-600" />
        <span className="text-[10px] tracking-[0.12em] uppercase text-neutral-600">
          History
        </span>
        {history.length > 0 && (
          <span className="ml-auto text-[10px] text-neutral-700 tabular-nums">{history.length}</span>
        )}
      </button>

      {open && (
        <div className="pb-3">
          {history.length === 0 ? (
            <p className="px-4 text-[11px] text-neutral-700">No runs yet.</p>
          ) : (
            <>
              <div className="max-h-48 overflow-y-auto">
                {history.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => onReplay(entry)}
                    className="w-full text-left px-4 py-2 hover:bg-white/[0.03] transition-colors group border-b border-white/[0.03] last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-sm border shrink-0',
                        entry.mode === 'with_constitution'
                          ? 'border-teal-500/30 text-teal-600'
                          : 'border-white/10 text-neutral-600'
                      )}>
                        {modeBadge[entry.mode]}
                      </span>
                      <span className="text-[9px] text-neutral-700 shrink-0">{relativeTime(entry.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 group-hover:text-neutral-300 transition-colors font-mono">
                      {truncatePrompt(entry.prompt)}
                    </p>
                    <p className="text-[10px] text-neutral-700 mt-0.5">
                      {entry.iterations} iter · {entry.constitution.length} principle{entry.constitution.length !== 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
              <button
                onClick={onClear}
                className="flex items-center gap-1.5 text-[10px] text-neutral-700 hover:text-red-400 transition-colors px-4 pt-2"
              >
                <Trash2 size={10} />
                Clear history
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
