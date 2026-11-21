import type { AnalyzeResult, ProblemType, TutorResponse, VerifyResult } from '../types'

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const DEMO = import.meta.env.VITE_DEMO === 'true'

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(detail?.error?.message ?? `Error ${res.status} en ${path}`)
  }
  return res.json() as Promise<T>
}

/** El backend no conoce 'unknown' ni 'definite_integral'. */
function backendType(type: ProblemType): string | undefined {
  if (type === 'unknown') return undefined
  if (type === 'definite_integral') return 'integral'
  return type
}

/** Demo local cuando no hay backend (Fase 0–3 UI). */
function mockAnalyze(): AnalyzeResult {
  return {
    problem: {
      latex: String.raw`\frac{d}{dx}\left(x^{2}\sin x\right)`,
      type: 'derivative',
      bbox: [0.08, 0.12, 0.84, 0.14],
    },
    steps: [
      {
        id: 's1',
        latex: String.raw`2x\sin x + x^{2}\cos x`,
        bbox: [0.1, 0.32, 0.7, 0.12],
        confidence: 0.91,
      },
    ],
    legibility: 'good',
    notes: 'Modo demo: sin backend. Confirma o edita la lectura.',
  }
}

function mockTutor(studentMessage: string, hintLevel: number): TutorResponse {
  const level = Math.min(5, Math.max(0, hintLevel)) as TutorResponse['hintLevel']
  const frustrated = /no sé|ayuda|help/i.test(studentMessage)
  const nextLevel = (frustrated ? Math.min(5, level + 1) : level) as TutorResponse['hintLevel']

  const questions: Record<number, string> = {
    0: '¿Cómo planeas empezar con esta derivada?',
    1: '¿Qué tipo de función ves: producto, cociente o composición?',
    2: 'Mira el término que resalté: ¿qué regla aplica ahí?',
    3: 'Si evalúas tu resultado en x = 0, ¿coincide con lo que esperarías?',
    4: 'Aquí conviene la regla del producto. ¿Cómo se escribe sin aplicarla aún?',
    5: 'El siguiente paso usa (uv)′ = u′v + uv′. Continúa tú desde ahí.',
  }

  return {
    hintLevel: nextLevel,
    question: questions[nextLevel] ?? questions[0],
    overlay:
      nextLevel >= 2
        ? [
            {
              targetStepId: 's1',
              type: nextLevel >= 3 ? 'note' : 'highlight',
              text: nextLevel >= 3 ? '¿x = 0?' : 'Revisa este término',
              color: 'amber',
            },
          ]
        : [],
    diagnosis: nextLevel >= 2 ? 'producto_sin_regla' : 'exploracion',
    celebrate: /producto|regla/i.test(studentMessage),
  }
}

export async function analyzeFrame(payload: {
  sessionId: string
  imageBase64: string
}): Promise<AnalyzeResult> {
  if (DEMO) {
    await delay(700)
    return mockAnalyze()
  }
  return postJson<AnalyzeResult>('/api/analyze', payload)
}

export async function verifyStep(payload: {
  problem: string
  step: string
  relation: 'equivalent' | 'next_valid'
}): Promise<VerifyResult> {
  if (DEMO) {
    await delay(300)
    return {
      valid: true,
      reason: 'Demo: verificación simulada como válida.',
      misconception: null,
    }
  }
  return postJson<VerifyResult>('/api/verify', payload)
}

export async function askTutor(payload: {
  sessionId: string
  hintLevel: number
  studentMessage: string
  analysis: AnalyzeResult | null
}): Promise<TutorResponse> {
  if (DEMO) {
    await delay(500)
    return mockTutor(payload.studentMessage, payload.hintLevel)
  }
  const { analysis } = payload
  if (!analysis) throw new Error('Primero apunta la cámara a un ejercicio y pulsa Revisar.')
  // El nivel de pista lo lleva el servidor por sessionId; no se manda.
  return postJson<TutorResponse>('/api/tutor', {
    sessionId: payload.sessionId,
    problem: { latex: analysis.problem.latex, type: backendType(analysis.problem.type) },
    steps: analysis.steps,
    legibility: analysis.legibility,
    studentMessage: payload.studentMessage,
  })
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
