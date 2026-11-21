import { useState } from 'react'
import { askTutor } from '../api/client'
import { useSessionStore } from '../state/sessionStore'
import { Latex } from './Latex'
import type { AnalyzeResult } from '../types'

interface Props {
  analysis: AnalyzeResult
  onConfirm: () => void
}

export function ConfirmReading({ analysis, onConfirm }: Props) {
  const [problemLatex, setProblemLatex] = useState(analysis.problem.latex)
  const [stepLatex, setStepLatex] = useState(analysis.steps[0]?.latex ?? '')
  const {
    sessionId,
    setAnalysis,
    setPhase,
    applyTutorResponse,
    setTutoring,
    setError,
  } = useSessionStore()

  async function confirm() {
    const next: AnalyzeResult = {
      ...analysis,
      problem: { ...analysis.problem, latex: problemLatex },
      steps: analysis.steps.map((s, i) =>
        i === 0 ? { ...s, latex: stepLatex || s.latex } : s,
      ),
    }
    setAnalysis(next)
    setTutoring(true)
    setError(null)
    try {
      const res = await askTutor({
        sessionId,
        hintLevel: 0,
        studentMessage: 'Acabo de confirmar la lectura del ejercicio.',
        analysis: next,
      })
      applyTutorResponse(res)
      setPhase('session')
      onConfirm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al iniciar el tutor')
    } finally {
      setTutoring(false)
    }
  }

  return (
    <div className="confirm-sheet" role="dialog" aria-labelledby="confirm-title">
      <h2 id="confirm-title">¿Leí bien tu ejercicio?</h2>
      <p className="confirm-sheet__hint">
        Corrige el LaTeX si hace falta. Si la confianza es baja, confírmalo antes de seguir.
      </p>

      {analysis.legibility === 'low' && (
        <p className="confirm-sheet__warn">Legibilidad baja: conviene reescribir o editar.</p>
      )}

      <label className="confirm-sheet__field">
        <span>Enunciado</span>
        <div className="confirm-sheet__preview">
          <Latex latex={problemLatex} display />
        </div>
        <textarea
          value={problemLatex}
          onChange={(e) => setProblemLatex(e.target.value)}
          rows={2}
          spellCheck={false}
        />
      </label>

      {analysis.steps[0] && (
        <label className="confirm-sheet__field">
          <span>
            Paso ({Math.round(analysis.steps[0].confidence * 100)}% confianza)
          </span>
          <div className="confirm-sheet__preview">
            <Latex latex={stepLatex} display />
          </div>
          <textarea
            value={stepLatex}
            onChange={(e) => setStepLatex(e.target.value)}
            rows={2}
            spellCheck={false}
          />
        </label>
      )}

      <button type="button" className="btn btn--light" onClick={() => void confirm()}>
        Confirmar y continuar
      </button>
    </div>
  )
}
