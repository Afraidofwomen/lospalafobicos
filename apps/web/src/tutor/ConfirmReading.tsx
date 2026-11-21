import { useState } from 'react'
import { askTutor } from '../api/client'
import { useSessionStore } from '../state/sessionStore'
import { Latex } from './Latex'
import type { AnalyzeResult, StepCheck } from '../types'

interface Props {
  analysis: AnalyzeResult
  onConfirm: () => void
}

const ICON: Record<StepCheck['verdict'], string> = { ok: '✓', wrong: '✗', unknown: '?' }

export function ConfirmReading({ analysis, onConfirm }: Props) {
  const [problemLatex, setProblemLatex] = useState(analysis.problem.latex)
  const [expanded, setExpanded] = useState(false)
  const {
    sessionId,
    setAnalysis,
    setPhase,
    applyTutorResponse,
    setTutoring,
    setError,
  } = useSessionStore()

  const checks = analysis.checks ?? []
  const wrongIndex = analysis.steps.findIndex(
    (s) => checks.find((c) => c.stepId === s.id)?.verdict === 'wrong',
  )
  const wrongStep = wrongIndex >= 0 ? analysis.steps[wrongIndex] : null
  const allOk = analysis.steps.length > 0 && checks.length > 0 && checks.every((c) => c.verdict === 'ok')
  const wrongCheck = wrongStep ? checks.find((c) => c.stepId === wrongStep.id) : null

  async function confirm() {
    const next: AnalyzeResult = {
      ...analysis,
      problem: { ...analysis.problem, latex: problemLatex },
    }
    setAnalysis(next)
    setTutoring(true)
    setError(null)
    try {
      const res = await askTutor({
        sessionId,
        hintLevel: 0,
        studentMessage: wrongStep
          ? `Revisa mi paso ${wrongIndex + 1}.`
          : 'Acabo de confirmar la lectura del ejercicio.',
        analysis: next,
        ...(wrongStep ? { proposedStep: wrongStep.latex } : {}),
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
      <h2 id="confirm-title">
        {wrongStep ? `Revisa el paso ${wrongIndex + 1}` : allOk ? 'Todo cuadra' : '¿Leí bien tu ejercicio?'}
      </h2>
      <p className="confirm-sheet__hint">
        {analysis.steps.length === 0
          ? 'No vi pasos escritos. Escribe tu primer paso y vuelve a pulsar Revisar, o sigue con el tutor.'
          : 'Marqué en la foto cada paso: verde si cuadra, rojo donde no.'}
      </p>

      {analysis.legibility === 'low' && (
        <p className="confirm-sheet__warn">Legibilidad baja: conviene reescribir o editar.</p>
      )}

      {wrongCheck && !expanded && (
        <p className="confirm-sheet__warn">{wrongCheck.reason}</p>
      )}

      {expanded && (
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
      )}

      {expanded && analysis.steps.length > 0 && (
        <ol className="step-checks" aria-label="Revisión de tus pasos">
          {analysis.steps.map((step, i) => {
            const check = checks.find((c) => c.stepId === step.id)
            const verdict = check?.verdict ?? 'unknown'
            return (
              <li key={step.id} className={`step-check step-check--${verdict}`}>
                <span className="step-check__icon" aria-hidden>{ICON[verdict]}</span>
                <div className="step-check__body">
                  <span className="step-check__n">Paso {i + 1}</span>
                  <div className="confirm-sheet__preview">
                    <Latex latex={step.latex} display />
                  </div>
                  {check && verdict !== 'ok' && <p className="step-check__reason">{check.reason}</p>}
                  {check?.counterexample && <p className="step-check__reason">{check.counterexample}</p>}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <button
        type="button"
        className="btn btn--ghost confirm-sheet__toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Ver la foto' : 'Ver pasos y editar lectura'}
      </button>

      <button type="button" className="btn btn--light" onClick={() => void confirm()}>
        {wrongStep ? 'Pedir una pista' : 'Confirmar y continuar'}
      </button>
    </div>
  )
}
