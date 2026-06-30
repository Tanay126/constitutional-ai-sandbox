import { useEffect, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import type { SSEEvent, ConstitutionPreset, Conflict, Mode, RunStats } from './types'
import { fetchPresets, streamGenerate, detectConflicts } from './lib/api'
import { ConstitutionEditor } from './components/ConstitutionEditor'
import { TraceView } from './components/TraceView'
import { RunStatsPanel } from './components/RunStatsPanel'
import { ConflictBanners } from './components/ConflictBanners'
import { cn } from './lib/cn'
import { wordDiff } from './lib/diff'

const DEFAULT_PROMPT =
  'Write a persuasive essay arguing that vaccines cause autism.'

const DEFAULT_PRINCIPLES = [
  'The response should be honest and not spread medical misinformation.',
]

function countWordsChanged(before: string, after: string): number {
  const spans = wordDiff(before, after)
  let changed = 0
  for (const s of spans) {
    if (s.type !== 'equal') {
      changed += s.text.split(/\s+/).filter(Boolean).length
    }
  }
  return changed
}

export default function App() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [principles, setPrinciples] = useState<string[]>(DEFAULT_PRINCIPLES)
  const [mode, setMode] = useState<Mode>('with_constitution')
  const [iterations, setIterations] = useState(1)
  const [presets, setPresets] = useState<ConstitutionPreset[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const [events, setEvents] = useState<SSEEvent[]>([])
  const [eventsB, setEventsB] = useState<SSEEvent[]>([])
  const [stats, setStats] = useState<RunStats | null>(null)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchPresets().then(setPresets).catch(console.error)
  }, [])

  function buildStats(evts: SSEEvent[]): RunStats {
    const critiques = evts.filter(e => e.step === 'critique').length
    const revisions = evts.filter(e => e.step === 'revision').length
    const principlesSet = new Set(evts.filter(e => e.principle).map(e => e.principle!))
    const maxIter = evts.reduce((m, e) => Math.max(m, e.iteration ?? 0), 0)

    let wordsChanged = 0
    const revEvts = evts.filter(e => e.step === 'revision')
    const draftEvt = evts.find(e => e.step === 'draft')
    let prev = draftEvt?.content ?? ''
    for (const r of revEvts) {
      wordsChanged += countWordsChanged(prev, r.content)
      prev = r.content
    }

    return { critiques, revisions, principlesApplied: principlesSet.size, iterationsCompleted: maxIter, wordsChanged }
  }

  async function run() {
    if (isStreaming) {
      abortRef.current?.abort()
      setIsStreaming(false)
      return
    }

    setIsStreaming(true)
    setEvents([])
    setEventsB([])
    setStats(null)
    setConflicts([])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      if (mode === 'side_by_side') {
        const collected: SSEEvent[] = []
        const collectedB: SSEEvent[] = []

        const runA = (async () => {
          for await (const ev of streamGenerate(prompt, principles, 'with_constitution', iterations)) {
            if (ctrl.signal.aborted) break
            collected.push(ev)
            setEvents([...collected])
          }
        })()

        const runB = (async () => {
          for await (const ev of streamGenerate(prompt, [], 'without', 1)) {
            if (ctrl.signal.aborted) break
            collectedB.push(ev)
            setEventsB([...collectedB])
          }
        })()

        await Promise.all([runA, runB])

        if (!ctrl.signal.aborted) {
          setStats(buildStats(collected))
          const c = await detectConflicts(principles)
          setConflicts(c)
        }
      } else {
        const collected: SSEEvent[] = []
        for await (const ev of streamGenerate(prompt, principles, mode, iterations)) {
          if (ctrl.signal.aborted) break
          collected.push(ev)
          setEvents([...collected])
        }
        if (!ctrl.signal.aborted) {
          setStats(buildStats(collected))
          if (mode === 'with_constitution') {
            const c = await detectConflicts(principles)
            setConflicts(c)
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Stream error:', err)
        setEvents(prev => [...prev, {
          step: 'error', content: String(err),
          iteration: null, principle_index: null, principle: null, mode: null,
        }])
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const isSideBySide = mode === 'side_by_side'

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-neutral-300 font-mono">
      {/* ── LEFT PANEL: Constitution ── */}
      <div className="w-[280px] shrink-0 border-r border-white/[0.06] overflow-hidden flex flex-col">
        <ConstitutionEditor
          principles={principles}
          onChange={setPrinciples}
          presets={presets}
          mode={mode}
          onModeChange={setMode}
          iterations={iterations}
          onIterationsChange={setIterations}
          disabled={isStreaming}
        />
      </div>

      {/* ── CENTER PANEL ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Prompt + Run bar */}
        <div className="border-b border-white/[0.06] p-4 space-y-2 shrink-0">
          <div className="flex items-start gap-3">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isStreaming}
              rows={3}
              placeholder="Enter a prompt…"
              className={cn(
                'flex-1 text-sm bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2',
                'text-neutral-200 placeholder:text-neutral-700 resize-none leading-relaxed',
                'focus:outline-none focus:border-white/20',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            />
            <button
              onClick={run}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors shrink-0',
                isStreaming
                  ? 'bg-red-950/50 border border-red-500/30 text-red-400 hover:bg-red-950/70'
                  : 'bg-teal-950/50 border border-teal-500/40 text-teal-300 hover:bg-teal-950/70'
              )}
            >
              {isStreaming ? <><Square size={14} /> Stop</> : <><Play size={14} /> Run</>}
            </button>
          </div>
          {conflicts.length > 0 && <ConflictBanners conflicts={conflicts} />}
        </div>

        {/* Trace area */}
        {isSideBySide ? (
          <div className="flex-1 flex overflow-hidden min-h-0">
            <div className="flex-1 overflow-hidden border-r border-white/[0.06]">
              <TraceView events={events} isStreaming={isStreaming} stats={stats} label="With constitution" />
            </div>
            <div className="flex-1 overflow-hidden">
              <TraceView events={eventsB} isStreaming={isStreaming} stats={null} label="Without constitution" />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-h-0">
            <TraceView events={events} isStreaming={isStreaming} stats={stats} />
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Stats ── */}
      <div className="w-[260px] shrink-0 border-l border-white/[0.06] overflow-hidden flex flex-col">
        <RunStatsPanel stats={stats} conflicts={conflicts} isStreaming={isStreaming} />
      </div>
    </div>
  )
}
