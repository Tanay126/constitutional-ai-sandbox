import type { SSEEvent, ConstitutionPreset, Conflict, Mode } from '../types'

export const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export class BackendOfflineError extends Error {
  constructor() {
    super('Backend offline — make sure the FastAPI server is running on :8000')
    this.name = 'BackendOfflineError'
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(`${BASE}${path}`, init)
    return res
  } catch {
    throw new BackendOfflineError()
  }
}

export async function fetchConfig(): Promise<{ mock_mode: boolean; version: string }> {
  const res = await apiFetch('/api/config')
  if (!res.ok) throw new Error('Failed to fetch config')
  return res.json()
}

export async function fetchPresets(): Promise<ConstitutionPreset[]> {
  const res = await apiFetch('/api/presets')
  if (!res.ok) throw new Error('Failed to fetch presets')
  return res.json()
}

export async function detectConflicts(principles: string[]): Promise<Conflict[]> {
  const res = await apiFetch('/api/detect-conflicts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ principles }),
  })
  if (!res.ok) throw new Error('Failed to detect conflicts')
  const data = await res.json()
  return data.conflicts
}

export async function* streamGenerate(
  prompt: string,
  constitution: string[],
  mode: Mode,
  iterations: number,
  helpfulnessWeight: number,
  harmlessnessWeight: number,
): AsyncGenerator<SSEEvent> {
  const res = await apiFetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt, constitution, mode, iterations,
      helpfulness_weight: helpfulnessWeight,
      harmlessness_weight: harmlessnessWeight,
    }),
  })
  if (!res.ok || !res.body) throw new Error('Stream failed')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { yield JSON.parse(line.slice(6)) as SSEEvent } catch { /* skip */ }
      }
    }
  }
}
