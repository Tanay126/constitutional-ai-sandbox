import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square, Keyboard } from 'lucide-react'
import type { SSEEvent, ConstitutionPreset, Conflict, Mode, RunStats, HistoryEntry } from './types'
import { fetchPresets, streamGenerate, detectConflicts } from './lib/api'
import { ConstitutionEditor } from './components/ConstitutionEditor'
import { TraceView } from './components/TraceView'
import { RunStatsPanel } from './components/RunStatsPanel'
import { ConflictBanners } from './components/ConflictBanners'
import { RunHistory } from './components/RunHistory'
import { cn } from './lib/cn'
import { wordDiff } from './lib/diff'
import { generateExportHTML, downloadHTML } from './lib/export'
import { loadHistory, saveRun, clearHistory } from './lib/history'

const DEFAULT_PROMPT = 'Write a persuasive essay arguing that vaccines cause autism.'
const DEFAULT_PRINCIPLES = ['The response should be honest and not spread medical misinformation.']

function countWordsChanged(before: string, after: string): number {
  return wordDiff(before, after)
    .filter(s => s.type !== 'equal')
    .reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0)
}

function buildStats(evts: SSEEvent[]): RunStats {
  const critiques = evts.filter(e => e.step === 'critique').length
  const revisions = evts.filter(e => e.step === 'revision').length
  const principlesSet = new Set(evts.filter(e => e.principle).map(e => e.principle!))
  const maxIter = evts.reduce((m, e) => Math.max(m, e.iteration ?? 0), 0)
  let wordsChanged = 0
  let prev = evts.find(e => e.step === 'draft')?.content ?? ''
  for (const r of evts.filter(e => e.step === 'revision')) {
    wordsChanged += countWordsChanged(prev, r.content)
    prev = r.content
  }
  return { critiques, revisions, principlesApplied: principlesSet.size, iterationsCompleted: maxIter, wordsChanged }
}

export default function App() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [principles, setPrinciples] = useState<string[]>(DEFAULT_PRINCIPLES)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('with_constitution')
  const [iterations, setIterations] = useState(1)
  const [helpfulnessWeight, setHelpfulnessWeight] = useState(5.0)
  const [harmlessnessWeight, setHarmlessnessWeight] = useState(5.0)
  const [presets, setPresets] = useState<ConstitutionPreset[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())

  const [events, setEvents] = useState<SSEEvent[]>([])
  const [eventsB, setEventsB] = useState<SSEEvent[]>([])
  const [stats, setStats] = useState<RunStats | null>(null)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchPresets().then(setPresets).catch(console.error)
  }, [])

  const run = useCallback(async () => {
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

        await Promise.all([
          (async () => {
            for await (const ev of streamGenerate(prompt, principles, 'with_constitution', iterations, helpfulnessWeight, harmlessnessWeight)) {
              if (ctrl.signal.aborted) break
              collected.push(ev)
              setEvents([...collected])
            }
          })(),
          (async () => {
            for await (const ev of streamGenerate(prompt, [], 'without', 1, helpfulnessWeight, harmlessnessWeight)) {
              if (ctrl.signal.aborted) break
              collectedB.push(ev)
              setEventsB([...collectedB])
            }
          })(),
        ])

        if (!ctrl.signal.aborted) {
          const s = buildStats(collected)
          setStats(s)
          const c = await detectConflicts(principles)
          setConflicts(c)
          persistRun(collected, s, c)
        }
      } else {
        const collected: SSEEvent[] = []
        for await (const ev of streamGenerate(prompt, principles, mode, iterations, helpfulnessWeight, harmlessnessWeight)) {
          if (ctrl.signal.aborted) break
          collected.push(ev)
          setEvents([...collected])
        }
        if (!ctrl.signal.aborted) {
          const s = buildStats(collected)
          setStats(s)
          let c: Conflict[] = []
          if (mode === 'with_constitution') {
            c = await detectConflicts(principles)
            setConflicts(c)
          }
          persistRun(collected, s, c)
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
  }, [isStreaming, mode, prompt, principles, iterations, helpfulnessWeight, harmlessnessWeight])

  function persistRun(evts: SSEEvent[], s: RunStats, c: Conflict[]) {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      prompt,
      mode,
      iterations,
      constitution: [...principles],
      helpfulnessWeight,
      harmlessnessWeight,
      events: evts,
      stats: s,
      conflicts: c,
    }
    saveRun(entry)
    setHistory(loadHistory())
  }

  function replayEntry(entry: HistoryEntry) {
    setEvents(entry.events)
    setEventsB([])
    setStats(entry.stats)
    setConflicts(entry.conflicts)
    setPrompt(entry.prompt)
    setPrinciples(entry.constitution)
    setMode(entry.mode)
    setIterations(entry.iterations)
    setHelpfulnessWeight(entry.helpfulnessWeight)
    setHarmlessnessWeight(entry.harmlessnessWeight)
    setShowHistory(false)
  }

  function doClearHistory() {
    clearHistory()
    setHistory([])
  }

  function handleExport() {
    const ts = Date.now()
    const html = generateExportHTML({ prompt, constitution: principles, events, stats, conflicts, timestamp: ts })
    downloadHTML(html, `cai-trace-${ts}.html`)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'Enter') {
        e.preventDefault()
        run()
      } else if (meta && e.key === 'k') {
        e.preventDefault()
        setEvents([])
        setEventsB([])
        setStats(null)
        setConflicts([])
      } else if (meta && e.key === 'h') {
        e.preventDefault()
        setShowHistory(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [run])

  const isSideBySide = mode === 'side_by_side'
  const canExport = events.length > 0 && !isStreaming

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-neutral-300 font-mono">

      {/* ── LEFT PANEL ── */}
      <div className="w-[280px] shrink-0 border-r border-white/[0.06] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ConstitutionEditor
            principles={principles}
            onChange={p => { setPrinciples(p); setSelectedPresetId(null) }}
            presets={presets}
            selectedPresetId={selectedPresetId}
            onPresetSelect={setSelectedPresetId}
            mode={mode}
            onModeChange={setMode}
            iterations={iterations}
            onIterationsChange={setIterations}
            helpfulnessWeight={helpfulnessWeight}
            harmlessnessWeight={harmlessnessWeight}
            onHelpfulnessChange={setHelpfulnessWeight}
            onHarmlessnessChange={setHarmlessnessWeight}
            disabled={isStreaming}
          />
        </div>
        <RunHistory
          open={showHistory}
          onToggle={() => setShowHistory(v => !v)}
          history={history}
          onReplay={replayEntry}
          onClear={doClearHistory}
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
              placeholder="Enter a prompt… (Cmd+Enter to run)"
              className={cn(
                'flex-1 text-sm bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2',
                'text-neutral-200 placeholder:text-neutral-700 resize-none leading-relaxed',
                'focus:outline-none focus:border-white/20',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            />
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="relative">
                <button
                  onClick={run}
                  onMouseEnter={() => setShowShortcuts(true)}
                  onMouseLeave={() => setShowShortcuts(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors',
                    isStreaming
                      ? 'bg-red-950/50 border border-red-500/30 text-red-400 hover:bg-red-950/70'
                      : 'bg-teal-950/50 border border-teal-500/40 text-teal-300 hover:bg-teal-950/70'
                  )}
                >
                  {isStreaming ? <><Square size={14} /> Stop</> : <><Play size={14} /> Run</>}
                </button>
                {showShortcuts && !isStreaming && (
                  <div className="absolute top-full right-0 mt-1.5 z-10 bg-[#161616] border border-white/10 rounded-sm px-3 py-2 text-[10px] text-neutral-500 whitespace-nowrap space-y-1 shadow-xl">
                    <div className="flex items-center gap-2"><Keyboard size={9} /><span>Shortcuts</span></div>
                    <div className="flex justify-between gap-4 pt-1"><span>Run</span><kbd className="text-neutral-600">⌘ Enter</kbd></div>
                    <div className="flex justify-between gap-4"><span>Clear trace</span><kbd className="text-neutral-600">⌘ K</kbd></div>
                    <div className="flex justify-between gap-4"><span>History</span><kbd className="text-neutral-600">⌘ H</kbd></div>
                  </div>
                )}
              </div>
            </div>
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

      {/* ── RIGHT PANEL ── */}
      <div className="w-[260px] shrink-0 border-l border-white/[0.06] overflow-hidden flex flex-col">
        <RunStatsPanel
          stats={stats}
          conflicts={conflicts}
          isStreaming={isStreaming}
          canExport={canExport}
          onExport={handleExport}
        />
      </div>
    </div>
  )
}
