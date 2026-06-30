export type StepType = 'draft' | 'critique' | 'revision' | 'final' | 'done' | 'error'
export type Mode = 'with_constitution' | 'without' | 'side_by_side'

export interface SSEEvent {
  step: StepType
  content: string
  iteration: number | null
  principle_index: number | null
  principle: string | null
  mode: string | null
}

export interface ConstitutionPreset {
  id: string
  name: string
  description: string
  principles: string[]
}

export interface Conflict {
  principle_a: string
  principle_b: string
  explanation: string
}

export interface RunStats {
  critiques: number
  revisions: number
  principlesApplied: number
  iterationsCompleted: number
  wordsChanged: number
}
