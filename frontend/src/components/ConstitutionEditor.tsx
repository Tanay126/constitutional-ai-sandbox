import { Plus, Trash2 } from 'lucide-react'
import type { ConstitutionPreset, Mode } from '../types'
import { cn } from '../lib/cn'

interface Props {
  principles: string[]
  onChange: (principles: string[]) => void
  presets: ConstitutionPreset[]
  mode: Mode
  onModeChange: (mode: Mode) => void
  iterations: number
  onIterationsChange: (n: number) => void
  disabled: boolean
}

const MODES: { value: Mode; label: string }[] = [
  { value: 'with_constitution', label: 'With constitution' },
  { value: 'without', label: 'Without' },
  { value: 'side_by_side', label: 'Side by side' },
]

export function ConstitutionEditor({
  principles,
  onChange,
  presets,
  mode,
  onModeChange,
  iterations,
  onIterationsChange,
  disabled,
}: Props) {
  function update(i: number, value: string) {
    const next = [...principles]
    next[i] = value
    onChange(next)
  }

  function remove(i: number) {
    onChange(principles.filter((_, idx) => idx !== i))
  }

  function add() {
    onChange([...principles, ''])
  }

  function applyPreset(id: string) {
    const preset = presets.find(p => p.id === id)
    if (preset) onChange(preset.principles)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-[10px] tracking-[0.18em] uppercase text-neutral-500 font-normal">
          Constitution
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Mode toggle */}
        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.12em] uppercase text-neutral-600">Mode</label>
          <div className="flex flex-col gap-1">
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => onModeChange(m.value)}
                disabled={disabled}
                className={cn(
                  'text-left text-xs px-3 py-1.5 rounded-sm border transition-colors',
                  mode === m.value
                    ? 'border-teal-500/50 bg-teal-950/30 text-teal-300'
                    : 'border-white/5 text-neutral-500 hover:text-neutral-300 hover:border-white/10',
                  disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Iterations slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] tracking-[0.12em] uppercase text-neutral-600">
              Iterations
            </label>
            <span className="text-xs text-teal-400 tabular-nums">{iterations}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={iterations}
            onChange={e => onIterationsChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-1 appearance-none bg-white/10 rounded-full accent-teal-500 disabled:opacity-40"
          />
          <div className="flex justify-between text-[9px] text-neutral-700">
            <span>1</span><span>5</span>
          </div>
        </div>

        {/* Preset selector */}
        {presets.length > 0 && (
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.12em] uppercase text-neutral-600">
              Presets
            </label>
            <select
              onChange={e => applyPreset(e.target.value)}
              disabled={disabled}
              defaultValue=""
              className={cn(
                'w-full text-xs bg-white/5 border border-white/10 rounded-sm px-2 py-1.5',
                'text-neutral-400 focus:outline-none focus:border-teal-500/50',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              <option value="" disabled>Apply a preset…</option>
              {presets.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Principles list */}
        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.12em] uppercase text-neutral-600">
            Principles ({principles.length})
          </label>
          <div className="space-y-2">
            {principles.map((p, i) => (
              <div key={i} className="flex gap-1.5 items-start">
                <span className="text-[9px] text-neutral-700 pt-2.5 w-4 shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <textarea
                  value={p}
                  onChange={e => update(i, e.target.value)}
                  disabled={disabled}
                  rows={3}
                  placeholder="Enter a principle…"
                  className={cn(
                    'flex-1 text-xs bg-white/5 border border-white/10 rounded-sm px-2 py-1.5',
                    'text-neutral-300 placeholder:text-neutral-700 resize-none',
                    'focus:outline-none focus:border-white/20',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'leading-relaxed'
                  )}
                />
                <button
                  onClick={() => remove(i)}
                  disabled={disabled || principles.length <= 1}
                  className="mt-1.5 p-1 text-neutral-700 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={add}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 text-[11px] text-neutral-600 hover:text-teal-400',
              'transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-1'
            )}
          >
            <Plus size={12} />
            Add principle
          </button>
        </div>
      </div>
    </div>
  )
}
