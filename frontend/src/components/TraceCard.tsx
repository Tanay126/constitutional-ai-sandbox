import type { SSEEvent } from '../types'
import { DiffView } from './DiffView'
import { cn } from '../lib/cn'

interface Props {
  event: SSEEvent
  previousContent?: string
}

const stepConfig = {
  draft: {
    border: 'border-white/30',
    labelColor: 'text-white',
    bg: 'bg-white/[0.03]',
    label: 'DRAFT',
  },
  critique: {
    border: 'border-amber-500/60',
    labelColor: 'text-amber-400',
    bg: 'bg-amber-950/20',
    label: 'CRITIQUE',
  },
  revision: {
    border: 'border-teal-500/60',
    labelColor: 'text-teal-400',
    bg: 'bg-teal-950/20',
    label: 'REVISION',
  },
  final: {
    border: 'border-purple-500/60',
    labelColor: 'text-purple-400',
    bg: 'bg-purple-950/20',
    label: 'FINAL OUTPUT',
  },
  error: {
    border: 'border-red-500/60',
    labelColor: 'text-red-400',
    bg: 'bg-red-950/20',
    label: 'ERROR',
  },
  done: null,
}

export function TraceCard({ event, previousContent }: Props) {
  const config = stepConfig[event.step]
  if (!config) return null

  const label = event.step === 'critique'
    ? `CRITIQUE · Principle ${(event.principle_index ?? 0) + 1}`
    : event.step === 'revision'
    ? `REVISION · Iter ${event.iteration ?? 1}`
    : config.label

  return (
    <div className={cn('card-appear border rounded-sm p-4 space-y-3', config.border, config.bg)}>
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={cn('text-[10px] font-bold tracking-[0.15em] uppercase', config.labelColor)}>
          {label}
        </span>
        {event.principle && (
          <span className="text-[10px] px-2 py-0.5 rounded-sm border border-amber-500/40 text-amber-400/80 bg-amber-950/30 truncate max-w-xs">
            {event.principle}
          </span>
        )}
        {event.iteration !== null && event.step !== 'done' && event.step !== 'draft' && (
          <span className="text-[10px] text-neutral-600 ml-auto">iter {event.iteration}</span>
        )}
      </div>

      {/* Content */}
      <div className="text-[13px] leading-relaxed text-neutral-300 whitespace-pre-wrap break-words">
        {event.step === 'revision' && previousContent ? (
          <DiffView before={previousContent} after={event.content} />
        ) : (
          event.content
        )}
      </div>
    </div>
  )
}
