import { useEffect, useRef, useState } from 'react'
import { createTimeline, stagger } from 'animejs'

interface Props {
  onStart: () => void
}

const TOPICS = ['Límites', 'Derivadas', 'Integrales', 'Series', 'Aplicaciones'] as const

export function LandingPage({ onStart }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('Límites')

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      root.querySelectorAll<HTMLElement>('[data-mw-anim]').forEach((el) => {
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
      return
    }

    const tl = createTimeline({ defaults: { ease: 'out(3)' } })
    tl.add('.mw-hero-bg', { opacity: [0, 1], scale: [1.08, 1], duration: 1600 }, 0)
      .add('.mw-topbar', { opacity: [0, 1], translateY: [-12, 0], duration: 500 }, 100)
      .add('.mw-nav', { opacity: [0, 1], translateY: [-10, 0], duration: 600 }, 200)
      .add('.mw-word', { opacity: [0, 1], letterSpacing: ['0.3em', '0.02em'], duration: 1200 }, 350)
      .add('.mw-bracket', { opacity: [0, 1], scale: [1.4, 1], duration: 700 }, 900)
      .add('.mw-hero-left', { opacity: [0, 1], translateY: [24, 0], duration: 700 }, 950)
      .add('.mw-hero-right', { opacity: [0, 1], translateY: [24, 0], duration: 700 }, 1050)
      .add('.mw-tab', { opacity: [0, 1], translateY: [10, 0], duration: 500, delay: stagger(70) }, 1200)

    return () => {
      tl.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className="mw-landing flex min-h-full flex-col bg-mw-card text-mw-white">
      <div
        className="mw-topbar bg-mw-lavender-soft px-4 py-1.5 text-center text-xs font-semibold text-mw-card opacity-0 sm:text-sm"
        data-mw-anim
      >
        Gratis: apunta tu cámara a cualquier ejercicio y resuélvelo paso a paso.
      </div>

      <section id="inicio" className="relative isolate flex min-h-[calc(100svh-2rem)] flex-1 flex-col overflow-hidden">
        <img
          src="/hero-classroom.png"
          alt=""
          aria-hidden
          className="mw-hero-bg absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-0"
          data-mw-anim
        />
        <div className="mw-hero-shade absolute inset-0 -z-10" aria-hidden />

        <header className="mw-nav relative grid grid-cols-[1fr_auto_1fr] items-center px-6 py-5 opacity-0 sm:px-12" data-mw-anim>
          <a href="#inicio" className="flex items-center gap-2.5 justify-self-start">
            <LogoMark />
            <span className="text-lg font-semibold tracking-tight">
              vis<span className="text-mw-lavender">AR</span>
            </span>
          </a>
          <nav className="hidden items-center gap-10 text-sm font-semibold tracking-wide uppercase sm:flex">
            <a href="#temas" className="transition hover:text-mw-lavender">Temas</a>
            <a href="#como" className="transition hover:text-mw-lavender">Cómo funciona</a>
            <a href="#acerca" className="transition hover:text-mw-lavender">Acerca</a>
          </nav>
          <button
            type="button"
            onClick={onStart}
            aria-label="Abrir cámara"
            className="justify-self-end rounded-full p-2 transition hover:bg-white/10 hover:text-mw-lavender"
          >
            <CameraIcon />
          </button>
        </header>

        <div className="relative flex flex-1 flex-col justify-end px-6 pb-8 sm:px-12 lg:px-24">
          <div className="relative mx-auto mb-10 sm:mb-14">
            <span className="mw-bracket mw-bracket--tr opacity-0" aria-hidden data-mw-anim />
            <span className="mw-bracket mw-bracket--bl opacity-0" aria-hidden data-mw-anim />
            <h1
              className="mw-word px-4 text-center text-[clamp(3.5rem,13vw,10rem)] font-extrabold leading-none text-mw-lavender-soft uppercase opacity-0"
              data-mw-anim
            >
              Cálculo
            </h1>
          </div>

          <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start md:gap-12">
            <div className="mw-hero-left space-y-6 opacity-0" data-mw-anim>
              <h2 className="text-2xl font-extrabold leading-tight uppercase sm:text-3xl">
                Tu tutor de cálculo
                <br />
                en realidad aumentada
              </h2>
              <button
                type="button"
                onClick={onStart}
                className="mw-cta inline-flex items-center gap-2.5 bg-mw-lavender-soft px-8 py-3.5 text-sm font-bold tracking-wide text-mw-card uppercase transition hover:bg-mw-lavender focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mw-lavender"
              >
                <CameraIcon />
                Abrir cámara
              </button>
            </div>

            <p className="mw-hero-right max-w-xl text-sm leading-relaxed text-mw-white/85 opacity-0 sm:text-base" data-mw-anim>
              Para estudiantes que se atoran en límites, derivadas e integrales. visAR
              lee tu ejercicio con la cámara y te guía con preguntas, paso a paso,
              hasta que llegas a la solución por tu cuenta — nunca te regala la
              respuesta.
            </p>
          </div>
        </div>

        <nav id="temas" aria-label="Temas" className="relative flex gap-6 overflow-x-auto px-6 pb-4 sm:gap-10 sm:px-12 lg:px-24">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              aria-pressed={topic === t}
              className={`mw-tab shrink-0 border-b-2 pb-1.5 text-xs font-semibold tracking-wide uppercase opacity-0 transition sm:text-sm ${
                topic === t
                  ? 'border-mw-lavender-soft text-mw-white'
                  : 'border-transparent text-mw-white/70 hover:text-mw-white'
              }`}
              data-mw-anim
            >
              {t}
            </button>
          ))}
        </nav>
      </section>
    </div>
  )
}

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 3L28 10.5V21.5L16 29L4 21.5V10.5L16 3Z"
        fill="#b09eff"
        fillOpacity="0.22"
        stroke="#b09eff"
        strokeWidth="1.6"
      />
      <path d="M16 8L23 12.2V19.8L16 24L9 19.8V12.2L16 8Z" fill="#b09eff" fillOpacity="0.5" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}
