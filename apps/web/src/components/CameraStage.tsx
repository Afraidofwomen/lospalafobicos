import { useEffect, useRef, useState } from 'react'
import { ArOverlay } from '../ar/ArOverlay'
import { useCamera } from '../camera/useCamera'
import { analyzeFrame, askTutor } from '../api/client'
import { useSessionStore } from '../state/sessionStore'
import { ConfirmReading } from '../tutor/ConfirmReading'
import { Latex } from '../tutor/Latex'
import { MathText } from '../tutor/MathText'

export function CameraStage() {
  const { videoRef, ready, start, captureFrame } = useCamera()
  const stageRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null)
  const [draft, setDraft] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)

  const {
    sessionId,
    phase,
    cameraMode,
    frozenFrame,
    analysis,
    overlays,
    messages,
    hintLevel,
    isAnalyzing,
    isTutoring,
    error,
    textScale,
    setPhase,
    setFrozenFrame,
    setAnalysis,
    setAnalyzing,
    setCameraMode,
    setError,
    setTextScale,
    setTutoring,
    addMessage,
    applyTutorResponse,
    resetSession,
  } = useSessionStore()

  const lastTutor = [...messages].reverse().find((m) => m.role === 'tutor')

  useEffect(() => {
    void start()
  }, [start])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  async function handleReview() {
    const frame = captureFrame()
    if (!frame) {
      setError('No se pudo capturar el fotograma. Espera a que la cámara esté lista.')
      return
    }
    setFrozenFrame(frame)
    setCameraMode('photo')
    setAnalyzing(true)
    setError(null)
    try {
      const base64 = frame.split(',')[1] ?? frame
      const result = await analyzeFrame({ sessionId, imageBase64: base64 })
      setAnalysis(result)
      setPhase('confirm')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falló el análisis')
      setCameraMode('live')
      setFrozenFrame(null)
    } finally {
      setAnalyzing(false)
    }
  }

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

  function resumeLive() {
    setFrozenFrame(null)
    setCameraMode('live')
    setPhase('camera')
    setAnalysis(null)
  }

  return (
    <div className="camera-stage" ref={stageRef}>
      <video
        ref={videoRef}
        className={`camera-stage__video${frozenFrame ? ' is-hidden' : ''}`}
        playsInline
        muted
        autoPlay
      />

      {frozenFrame && (
        <img
          src={frozenFrame}
          alt="Fotograma capturado del ejercicio"
          className="camera-stage__freeze"
          onLoad={(e) =>
            setFrameSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
        />
      )}

      <ArOverlay
        analysis={analysis}
        overlays={overlays}
        width={size.w}
        height={size.h}
        frame={frozenFrame ? frameSize : null}
      />

      <div className="camera-stage__chrome">
        <header className="camera-stage__top">
          <span className="camera-stage__logo">visAR</span>
          <div className="camera-stage__top-actions">
            {cameraMode === 'photo' && phase !== 'confirm' && (
              <button type="button" className="btn btn--ghost" onClick={resumeLive}>
                En vivo
              </button>
            )}
            {phase === 'session' && (
              <button type="button" className="btn btn--ghost" onClick={resetSession}>
                Nuevo
              </button>
            )}
          </div>
        </header>

        <aside className="camera-stage__rail" aria-label="Controles de sesión">
          <div
            className={`hint-chip${hintLevel >= 3 ? ' hint-chip--warn' : ''}`}
            aria-live="polite"
          >
            <span className="hint-chip__n">{hintLevel}</span>
            <span className="hint-chip__l">/5</span>
          </div>
          <button
            type="button"
            className="rail-btn"
            onClick={() => setTextScale(Math.min(1.35, textScale + 0.1))}
            aria-label="Aumentar texto"
          >
            A+
          </button>
          <button
            type="button"
            className="rail-btn"
            onClick={() => setTextScale(Math.max(0.85, textScale - 0.1))}
            aria-label="Reducir texto"
          >
            A−
          </button>
          {phase === 'session' && (
            <button
              type="button"
              className="rail-btn"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
              aria-controls="tutor-history"
            >
              Chat
            </button>
          )}
        </aside>

        {error && (
          <p className="camera-stage__error" role="alert">
            {error}
          </p>
        )}

        {cameraMode === 'denied' && (
          <div className="camera-stage__denied">
            <p>Sin permiso de cámara.</p>
            <button type="button" className="btn btn--light" onClick={() => void start()}>
              Reintentar
            </button>
          </div>
        )}

        {phase === 'confirm' && analysis && (
          <ConfirmReading analysis={analysis} onConfirm={() => undefined} />
        )}

        {historyOpen && phase === 'session' && (
          <div id="tutor-history" className="history-sheet" role="dialog" aria-label="Historial del tutor">
            <header className="history-sheet__head">
              <h2>Conversación</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setHistoryOpen(false)}>
                Cerrar
              </button>
            </header>
            {analysis && (
              <div className="history-sheet__problem">
                <Latex latex={analysis.problem.latex} display />
              </div>
            )}
            <div className="history-sheet__list">
              {messages.map((m) => (
                <p key={m.id} className={`history-sheet__msg history-sheet__msg--${m.role}`}>
                  <MathText text={m.text} />
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="camera-stage__caption" style={{ fontSize: `${textScale}rem` }}>
          {phase === 'session' && lastTutor && (
            <div className={`caption-card${lastTutor.celebrate ? ' caption-card--ok' : ''}`}>
              <span className="caption-card__who">Tutor</span>
              <p className="caption-card__q">{isTutoring ? 'Pensando…' : <MathText text={lastTutor.text} />}</p>
            </div>
          )}

          {phase === 'session' && (
            <form
              className="caption-compose"
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
              <button type="submit" className="btn btn--light" disabled={!draft.trim() || isTutoring}>
                Enviar
              </button>
            </form>
          )}

          {(phase === 'camera' || phase === 'session') && cameraMode !== 'denied' && (
            <div className="camera-stage__actions">
              <button
                type="button"
                className="btn btn--review"
                onClick={() => void handleReview()}
                disabled={!ready || isAnalyzing || (cameraMode === 'photo' && phase !== 'session')}
              >
                {isAnalyzing ? 'Leyendo…' : 'Revisar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

