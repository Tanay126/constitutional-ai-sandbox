import { useState } from 'react'
import { GitFork, Keyboard, X } from 'lucide-react'
import { cn } from '../lib/cn'

interface Props {
  isMockMode: boolean
}

const SHORTCUTS = [
  { keys: '⌘ Enter', label: 'Run generation' },
  { keys: '⌘ K',     label: 'Clear trace' },
  { keys: '⌘ H',     label: 'Toggle history drawer' },
]

export function Navbar({ isMockMode }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <nav className="h-11 shrink-0 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center px-5 gap-4 z-10">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5 font-mono">
          <span className="text-[13px] font-semibold text-white tracking-tight select-none">
            CAI Sandbox
          </span>
          <span className="pulse-dot" aria-hidden="true" />
        </div>

        <div className="flex-1" />

        {/* Mock mode badge */}
        {isMockMode && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-400 bg-amber-950/30 tracking-wide">
            Mock Mode
          </span>
        )}

        {/* GitHub link */}
        <a
          href="https://github.com/Tanay126/constitutional-ai-sandbox"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-600 hover:text-neutral-300 transition-colors"
          title="View on GitHub"
        >
          <GitFork size={15} />
        </a>

        {/* Keyboard shortcuts trigger */}
        <button
          onClick={() => setShowModal(true)}
          className="text-neutral-600 hover:text-neutral-300 transition-colors"
          title="Keyboard shortcuts"
        >
          <Keyboard size={15} />
        </button>
      </nav>

      {/* Shortcuts modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#111] border border-white/10 rounded-sm p-6 w-72 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs tracking-[0.15em] uppercase text-neutral-500 font-sans">
                Keyboard shortcuts
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {SHORTCUTS.map(s => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400 font-sans">{s.label}</span>
                  <kbd className={cn(
                    'text-[11px] font-mono px-2 py-0.5 rounded-sm',
                    'bg-white/5 border border-white/10 text-neutral-500'
                  )}>
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
