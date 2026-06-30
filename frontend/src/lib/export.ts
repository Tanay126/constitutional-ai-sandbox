import type { SSEEvent, RunStats, Conflict } from '../types'
import { wordDiff } from './diff'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderDiff(before: string, after: string): string {
  const spans = wordDiff(before, after)
  return spans
    .map(s => {
      if (s.type === 'delete') return `<span class="del">${esc(s.text)}</span>`
      if (s.type === 'insert') return `<span class="ins">${esc(s.text)}</span>`
      return esc(s.text)
    })
    .join('')
}

function renderCard(event: SSEEvent, previousContent: string | undefined): string {
  const labelMap: Record<string, string> = {
    draft: 'DRAFT',
    critique: `CRITIQUE · Principle ${(event.principle_index ?? 0) + 1}`,
    revision: `REVISION · Iter ${event.iteration ?? 1}`,
    final: 'FINAL OUTPUT',
    error: 'ERROR',
  }
  const colorMap: Record<string, { border: string; label: string; bg: string }> = {
    draft:    { border: '#444', label: '#e5e5e5', bg: 'rgba(255,255,255,0.03)' },
    critique: { border: '#f97316', label: '#fb923c', bg: 'rgba(249,115,22,0.06)' },
    revision: { border: '#14b8a6', label: '#2dd4bf', bg: 'rgba(20,184,166,0.06)' },
    final:    { border: '#a855f7', label: '#c084fc', bg: 'rgba(168,85,247,0.06)' },
    error:    { border: '#ef4444', label: '#f87171', bg: 'rgba(239,68,68,0.06)' },
  }
  const cfg = colorMap[event.step] ?? colorMap.draft
  const label = labelMap[event.step] ?? event.step.toUpperCase()

  const principleTag = event.principle
    ? `<span class="pill">${esc(event.principle.slice(0, 80))}${event.principle.length > 80 ? '…' : ''}</span>`
    : ''

  let body: string
  if (event.step === 'revision' && previousContent != null) {
    body = `<div class="content diff">${renderDiff(previousContent, event.content)}</div>`
  } else {
    body = `<div class="content">${esc(event.content).replace(/\n/g, '<br>')}</div>`
  }

  return `
<div class="card" style="border-color:${cfg.border};background:${cfg.bg}">
  <div class="card-header">
    <span class="card-label" style="color:${cfg.label}">${label}</span>
    ${principleTag}
  </div>
  ${body}
</div>`
}

export function generateExportHTML(params: {
  prompt: string
  constitution: string[]
  events: SSEEvent[]
  stats: RunStats | null
  conflicts: Conflict[]
  timestamp?: number
}): string {
  const { prompt, constitution, events, stats, conflicts, timestamp = Date.now() } = params
  const date = new Date(timestamp).toLocaleString()

  const displayEvents = events.filter(e => e.step !== 'done')
  let lastDraft = ''
  const prevByKey: Record<string, string> = {}

  const cards = displayEvents.map(ev => {
    let prev: string | undefined
    if (ev.step === 'revision') {
      const key = `${ev.iteration}-${ev.principle_index}`
      prev = prevByKey[key] ?? lastDraft
      prevByKey[key] = ev.content
      lastDraft = ev.content
    } else if (ev.step === 'draft') {
      lastDraft = ev.content
    }
    return renderCard(ev, prev)
  }).join('\n')

  const constitutionHtml = constitution
    .map((p, i) => `<li><span class="pnum">${i + 1}</span>${esc(p)}</li>`)
    .join('\n')

  const conflictsHtml = conflicts.length
    ? `<section class="conflicts">
  <h3>⚠ Principle Conflicts Detected</h3>
  ${conflicts.map(c => `
  <div class="conflict-card">
    <div class="conflict-pair">
      <span class="conflict-a">"${esc(c.principle_a.slice(0, 80))}${c.principle_a.length > 80 ? '…' : ''}"</span>
      <span class="vs">vs</span>
      <span class="conflict-b">"${esc(c.principle_b.slice(0, 80))}${c.principle_b.length > 80 ? '…' : ''}"</span>
    </div>
    <p class="conflict-exp">${esc(c.explanation)}</p>
  </div>`).join('\n')}
</section>`
    : ''

  const statsHtml = stats
    ? `<div class="stats-row">
    <span>${stats.critiques} critique${stats.critiques !== 1 ? 's' : ''}</span>
    <span>${stats.revisions} revision${stats.revisions !== 1 ? 's' : ''}</span>
    <span>${stats.iterationsCompleted} iteration${stats.iterationsCompleted !== 1 ? 's' : ''}</span>
    <span>~${stats.wordsChanged} words changed</span>
  </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CAI Trace — ${esc(prompt.slice(0, 60))}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e5e5e5;font-family:'JetBrains Mono','Fira Code',ui-monospace,monospace;font-size:13px;line-height:1.6;padding:32px}
a{color:#2dd4bf}
h1{font-size:18px;font-weight:500;color:#fff;margin-bottom:4px;letter-spacing:-0.3px}
h2{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#555;font-weight:400;margin:28px 0 12px}
h3{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ef4444;font-weight:400;margin-bottom:12px}
.meta{font-size:11px;color:#555;margin-bottom:32px}
.prompt-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:2px;padding:12px 14px;margin-bottom:8px;font-size:14px;color:#e5e5e5;white-space:pre-wrap}
.constitution ol{list-style:none;display:flex;flex-direction:column;gap:6px}
.constitution li{display:flex;gap:10px;font-size:11px;color:#888;padding:6px 10px;background:rgba(255,255,255,.03);border-radius:2px;border:1px solid rgba(255,255,255,.06)}
.pnum{color:#555;min-width:16px;text-align:right;flex-shrink:0}
.stats-row{display:flex;gap:24px;flex-wrap:wrap;font-size:11px;color:#666;padding:10px 0;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);margin:16px 0}
.card{border:1px solid;border-radius:2px;padding:16px;margin-bottom:12px}
.card-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.card-label{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase}
.pill{font-size:10px;padding:2px 8px;border-radius:2px;border:1px solid rgba(249,115,22,.4);color:rgba(251,146,60,.8);background:rgba(67,20,7,.3);max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.content{font-size:13px;color:#ccc;white-space:pre-wrap;word-break:break-word}
.content.diff{white-space:pre-wrap}
.del{color:#ef4444;text-decoration:line-through;background:rgba(239,68,68,.1);border-radius:2px;padding:0 2px}
.ins{color:#2dd4bf;text-decoration:underline;text-underline-offset:2px;background:rgba(45,212,191,.1);border-radius:2px;padding:0 2px}
.conflicts{margin-bottom:24px}
.conflict-card{border:1px solid rgba(239,68,68,.25);border-radius:2px;background:rgba(127,29,29,.1);padding:12px;margin-bottom:8px}
.conflict-pair{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;font-size:11px}
.conflict-a,.conflict-b{color:rgba(252,165,165,.8);text-decoration:underline wavy rgba(239,68,68,.5);text-underline-offset:3px}
.vs{color:#555}
.conflict-exp{font-size:11px;color:#777;line-height:1.6}
.trace{margin-top:8px}
footer{margin-top:40px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06);font-size:10px;color:#444;letter-spacing:.05em}
footer a{color:#555}
@media(max-width:700px){body{padding:16px}}
</style>
</head>
<body>
<h1>Constitutional AI Trace</h1>
<p class="meta">Generated ${date}</p>

<div class="prompt-box">${esc(prompt)}</div>

${statsHtml}

${conflictsHtml}

<h2>Constitution (${constitution.length} principle${constitution.length !== 1 ? 's' : ''})</h2>
<div class="constitution"><ol>${constitutionHtml}</ol></div>

<h2>Trace</h2>
<div class="trace">
${cards}
</div>

<footer>
  Built with <a href="https://github.com/tanay126/constitutional-ai-sandbox">Constitutional AI Sandbox</a>
  &mdash; Bai et al. 2022, <a href="https://arxiv.org/abs/2212.08073">arxiv.org/abs/2212.08073</a>
</footer>
</body>
</html>`
}

export function downloadHTML(html: string, filename = 'cai-trace.html'): void {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
