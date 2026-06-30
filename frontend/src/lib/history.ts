import type { HistoryEntry } from '../types'

const KEY = 'cai_history'
const MAX = 20

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export function saveRun(entry: HistoryEntry): void {
  const history = loadHistory()
  const next = [entry, ...history].slice(0, MAX)
  _persist(next)
}

function _persist(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch (e: unknown) {
    // QuotaExceededError — drop oldest entry and retry once
    if (entries.length > 1) {
      try {
        localStorage.setItem(KEY, JSON.stringify(entries.slice(0, entries.length - 1)))
      } catch {
        // give up silently
      }
    }
  }
}

export function clearHistory(): void {
  localStorage.removeItem(KEY)
}

export function truncatePrompt(prompt: string, max = 60): string {
  return prompt.length > max ? prompt.slice(0, max) + '…' : prompt
}
