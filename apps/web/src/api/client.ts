import type { AnalyzeResult, TutorResponse, VerifyResult } from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? ''

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Error ${res.status} en ${path}`)
  }
  return res.json() as Promise<T>
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
  if (!API_URL) {
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
  if (!API_URL) {
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
  if (!API_URL) {
    await delay(500)
    return mockTutor(payload.studentMessage, payload.hintLevel)
  }
  return postJson<TutorResponse>('/api/tutor', payload)
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
