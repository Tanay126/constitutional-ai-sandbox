// Shown in the center panel before the first run.
// Pure CSS animation — no external libraries.

const nodes = [
  { label: 'DRAFT',    cls: 'loop-n0', color: 'text-neutral-400 border-neutral-700' },
  { label: 'CRITIQUE', cls: 'loop-n1', color: 'text-amber-500/80 border-amber-500/40' },
  { label: 'REVISION', cls: 'loop-n2', color: 'text-teal-500/80 border-teal-500/40' },
  { label: 'FINAL',    cls: 'loop-n3', color: 'text-purple-400/80 border-purple-500/40' },
]

export function HeroEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full select-none px-8 gap-10">
      {/* Large faded heading */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-semibold text-white/8 tracking-tight font-sans leading-none">
          Constitutional AI
        </h1>
        <p className="text-sm text-neutral-600 font-sans">
          Watch Claude critique and revise itself in real time
        </p>
      </div>

      {/* Animated loop diagram */}
      <div className="flex items-center gap-0">
        {nodes.map((node, i) => (
          <div key={node.label} className="flex items-center">
            {/* Node */}
            <div className={`loop-node ${node.cls} flex flex-col items-center gap-1.5`}>
              <div className={`border rounded-sm px-3 py-1.5 text-[10px] font-mono font-bold tracking-[0.12em] ${node.color}`}>
                {node.label}
              </div>
            </div>

            {/* Arrow between nodes */}
            {i < nodes.length - 1 && (
              <div className={`loop-arrow loop-a${i} text-neutral-700 text-sm px-1.5`}>
                →
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loop-back arrow */}
      <div className="flex flex-col items-center gap-0 -mt-6 opacity-20">
        <div className="text-[9px] text-neutral-600 font-sans tracking-widest uppercase">
          repeats × iterations
        </div>
      </div>

      {/* CTA hint */}
      <p className="text-[11px] text-neutral-700 font-sans text-center max-w-xs leading-relaxed">
        Set a constitution in the left panel, enter a prompt, and press{' '}
        <kbd className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 font-mono text-neutral-600">
          ⌘ Enter
        </kbd>{' '}
        to run.
      </p>
    </div>
  )
}
