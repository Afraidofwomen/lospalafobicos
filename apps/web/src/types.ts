export type ProblemType =
  | 'limit'
  | 'continuity'
  | 'derivative'
  | 'optimization'
  | 'related_rates'
  | 'integral'
  | 'definite_integral'
  | 'other'
  | 'unknown'

export type Legibility = 'good' | 'low'

export type OverlayType = 'highlight' | 'underline' | 'arrow' | 'note'
export type OverlayColor = 'amber' | 'teal' | 'rose' | 'ink' | 'green'

export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export interface Problem {
  latex: string
  type: ProblemType
  bbox: [number, number, number, number]
}

export interface Step {
  id: string
  latex: string
  bbox: [number, number, number, number]
  confidence: number
}

export interface StepCheck {
  stepId: string
  verdict: 'ok' | 'wrong' | 'unknown'
  reason: string
  counterexample: string | null
  misconception: string | null
}

export interface AnalyzeResult {
  problem: Problem
  steps: Step[]
  legibility: Legibility
  notes?: string
  checks?: StepCheck[]
}

export interface VerifyResult {
  valid: boolean
  reason: string
  counterexample?: string
  misconception: string | null
}

export interface OverlayAnnotation {
  targetStepId: string
  type: OverlayType
  text: string
  color: OverlayColor
}

export interface TutorResponse {
  hintLevel: HintLevel
  question: string
  overlay: OverlayAnnotation[]
  diagnosis: string
  celebrate: boolean
}

export interface ChatMessage {
  id: string
  role: 'tutor' | 'student' | 'system'
  text: string
  celebrate?: boolean
}

export type AppPhase = 'landing' | 'onboarding' | 'camera' | 'confirm' | 'session'
export type CameraMode = 'live' | 'photo' | 'denied' | 'idle'

