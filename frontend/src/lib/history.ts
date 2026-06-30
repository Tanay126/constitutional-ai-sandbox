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
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function clearHistory(): void {
  localStorage.removeItem(KEY)
}
