import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function CaiInfoPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-white/5 shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        {open
          ? <ChevronDown size={11} className="text-neutral-600 shrink-0" />
          : <ChevronRight size={11} className="text-neutral-600 shrink-0" />}
        <span className="text-[10px] tracking-[0.12em] uppercase text-neutral-600 font-sans">
          What is Constitutional AI?
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
            Constitutional AI (Bai et al. 2022) is a training method where an AI model
            critiques and revises its own outputs according to a set of principles — a
            "constitution" — without needing human labels for harmlessness.
          </p>
          <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
            Each iteration: the model generates a draft, critiques it against each
            principle, then produces a revised response. This sandbox visualises that
            loop in real time using Claude.
          </p>
          <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
            The severity sliders control how strongly helpfulness vs. harmlessness are
            weighted during critique — affecting how strict or permissive the revision
            guidance is.
          </p>
          <a
            href="https://arxiv.org/abs/2212.08073"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[10px] text-teal-600 hover:text-teal-400 underline underline-offset-2 transition-colors font-sans"
          >
            Bai et al. 2022 — arxiv.org/abs/2212.08073
          </a>
        </div>
      )}
    </div>
  )
}
