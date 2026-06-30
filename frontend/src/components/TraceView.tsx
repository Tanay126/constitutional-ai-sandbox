import { useEffect, useRef } from 'react'
import type { SSEEvent, RunStats } from '../types'
import { TraceCard } from './TraceCard'
import { HeroEmptyState } from './HeroEmptyState'

interface Props {
  events: SSEEvent[]
  isStreaming: boolean
  stats: RunStats | null
  label?: string
  showHero?: boolean
}

export function TraceView({ events, isStreaming, stats, label, showHero = false }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [events.length])

  const displayEvents = events.filter(e => e.step !== 'done')
  const activeIndex = isStreaming ? displayEvents.length - 1 : -1

  let lastDraftContent = ''
  const prevContentByKey: Record<string, string> = {}

  // Hero: only in the primary (non-labeled) panel, before any run
  if (showHero && displayEvents.length === 0 && !isStreaming) {
    return <HeroEmptyState />
  }

  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
      {label && (
        <div className="text-[10px] tracking-[0.15em] uppercase text-neutral-600 pb-1 border-b border-white/5 shrink-0 font-sans">
          {label}
        </div>
      )}

      {displayEvents.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full text-neutral-700 text-sm font-sans">
          Run a prompt to see the trace
        </div>
      )}

      {isStreaming && displayEvents.length === 0 && (
        <div className="flex items-center gap-2 text-neutral-600 text-xs font-sans">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Waiting for first event…
        </div>
      )}

      {displayEvents.map((event, i) => {
        let previousContent: string | undefined
        if (event.step === 'revision') {
          const key = `${event.iteration}-${event.principle_index}`
          previousContent = prevContentByKey[key] ?? lastDraftContent
          prevContentByKey[key] = event.content
          lastDraftContent = event.content
        } else if (event.step === 'draft') {
          lastDraftContent = event.content
        }

        return (
          <TraceCard
            key={i}
            event={event}
            previousContent={previousContent}
            isActive={i === activeIndex}
          />
        )
      })}

      {isStreaming && displayEvents.length > 0 && (
        <div className="flex items-center gap-2 text-neutral-600 text-xs shrink-0 font-sans">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Streaming…
        </div>
      )}

      {stats && !isStreaming && (
        <div className="card-appear border border-white/10 rounded-sm p-3 bg-white/[0.02] text-[11px] text-neutral-500 flex gap-4 flex-wrap shrink-0 font-sans">
          <span>{stats.critiques} critique{stats.critiques !== 1 ? 's' : ''} applied</span>
          <span>{stats.revisions} revision{stats.revisions !== 1 ? 's' : ''}</span>
          <span>~{stats.wordsChanged} words changed</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
