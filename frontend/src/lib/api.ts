import type { SSEEvent, ConstitutionPreset, Conflict, Mode } from '../types'

const BASE = 'http://localhost:8000'

export async function fetchPresets(): Promise<ConstitutionPreset[]> {
  const res = await fetch(`${BASE}/api/presets`)
  if (!res.ok) throw new Error('Failed to fetch presets')
  return res.json()
}

export async function detectConflicts(principles: string[]): Promise<Conflict[]> {
  const res = await fetch(`${BASE}/api/detect-conflicts`, {
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
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, constitution, mode, iterations }),
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
        try {
          yield JSON.parse(line.slice(6)) as SSEEvent
        } catch {
          // malformed line — skip
        }
      }
    }
  }
}
