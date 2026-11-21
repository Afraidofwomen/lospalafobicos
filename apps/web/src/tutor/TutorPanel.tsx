import { useEffect, useRef, useState } from 'react'
import { askTutor } from '../api/client'
import { useSessionStore } from '../state/sessionStore'
import { Latex } from './Latex'
import { MathText } from './MathText'

export function TutorPanel() {
  const {
    sessionId,
    messages,
    hintLevel,
    analysis,
    isTutoring,
    textScale,
    addMessage,
    applyTutorResponse,
    setTutoring,
    setError,
    setTextScale,
  } = useSessionStore()

  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTutoring])

  async function send() {
    const text = draft.trim()
    if (!text || isTutoring) return
    setDraft('')
    addMessage({ role: 'student', text })
    setTutoring(true)
    setError(null)
    try {
      const res = await askTutor({
        sessionId,
        hintLevel,
        studentMessage: text,
        analysis,
      })
      applyTutorResponse(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo contactar al tutor')
    } finally {
      setTutoring(false)
    }
  }

  return (
    <aside className="tutor-panel" style={{ fontSize: `${textScale}rem` }}>
      <header className="tutor-panel__head">
        <div>
          <p className="tutor-panel__brand">visAR</p>
          <p className="tutor-panel__meta">Nivel de pista {hintLevel} / 5</p>
        </div>
        <div className="tutor-panel__scale" aria-label="Tamaño de texto">
          <button type="button" onClick={() => setTextScale(Math.max(0.85, textScale - 0.1))} aria-label="Reducir texto">
            A−
          </button>
          <button type="button" onClick={() => setTextScale(Math.min(1.35, textScale + 0.1))} aria-label="Aumentar texto">
            A+
          </button>
        </div>
      </header>

      {analysis && (
        <div className="tutor-panel__problem" aria-label="Ejercicio leído">
          <span className="tutor-panel__label">Ejercicio</span>
          <Latex latex={analysis.problem.latex} display />
        </div>
      )}

      <div className="tutor-panel__messages" ref={listRef} role="log" aria-live="polite">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble bubble--${m.role}${m.celebrate ? ' bubble--celebrate' : ''}`}
          >
            <MathText text={m.text} />
          </div>
        ))}
        {isTutoring && <div className="bubble bubble--tutor bubble--thinking">Pensando…</div>}
      </div>

      <form
        className="tutor-panel__compose"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <label className="sr-only" htmlFor="student-msg">
          Tu respuesta
        </label>
        <input
          id="student-msg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe tu idea…"
          autoComplete="off"
          disabled={isTutoring}
        />
        <button type="submit" disabled={!draft.trim() || isTutoring}>
          Enviar
        </button>
      </form>
    </aside>
  )
}

