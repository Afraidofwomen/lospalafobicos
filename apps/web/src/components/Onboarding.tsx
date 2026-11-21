interface Props {
  onStart: () => void
}

export function Onboarding({ onStart }: Props) {
  return (
    <section className="onboarding">
      <div className="onboarding__media" aria-hidden>
        <div className="onboarding__grid" />
        <div className="onboarding__curve" />
      </div>
      <div className="onboarding__scrim" />
      <div className="onboarding__content">
        <h1 className="onboarding__brand">visAR</h1>
        <p className="onboarding__lead">
          Apunta al ejercicio. Una pregunta a la vez, hasta que llegues tú a la
          solución.
        </p>
        <button type="button" className="btn btn--light btn--lg" onClick={onStart}>
          Abrir cámara
        </button>
        <p className="onboarding__privacy">
          Al revisar se envía una foto del ejercicio. No se guarda en disco por
          defecto.
        </p>
      </div>
    </section>
  )
}

