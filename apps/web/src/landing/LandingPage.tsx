import { useEffect, useRef } from 'react'
import { createTimeline } from 'animejs'
import { EagleMascot } from './EagleMascot'

interface Props {
  onStart: () => void
}

export function LandingPage({ onStart }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

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

    const logo = root.querySelector('.mw-logo')
    const copy = root.querySelector('.mw-hero-copy')
    const cta = root.querySelector('.mw-cta')
    if (!logo || !copy || !cta) return

    const tl = createTimeline({ defaults: { ease: 'out(3)' } })
    tl.add(logo, { opacity: [0, 1], translateY: [14, 0], duration: 520 }, 0)
      .add(copy, { opacity: [0, 1], translateY: [20, 0], duration: 700 }, 100)
      .add(cta, { opacity: [0, 1], scale: [0.96, 1], duration: 560 }, 520)

    return () => {
      tl.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className="mw-landing min-h-full bg-mw-bg text-mw-white">
      <div className="mx-auto flex min-h-full max-w-6xl items-center px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="relative w-full overflow-hidden rounded-[2rem] border border-mw-lavender/15 bg-mw-card shadow-[0_30px_80px_rgba(0,0,0,0.5)] sm:rounded-[2.5rem]">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                'radial-gradient(ellipse 55% 50% at 78% 45%, rgba(176,158,255,0.12), transparent 60%), radial-gradient(ellipse 40% 35% at 12% 18%, rgba(61,47,107,0.28), transparent 55%)',
            }}
          />

          <header className="relative z-20 flex items-center px-6 pt-6 sm:px-10 sm:pt-8">
            <a
              href="#inicio"
              className="mw-logo flex items-center gap-2.5 opacity-0"
              data-mw-anim
            >
              <LogoMark />
              <span className="text-lg font-semibold tracking-tight sm:text-xl">
                vis<span className="text-mw-lavender">AR</span>
              </span>
            </a>
          </header>

          <section
            id="inicio"
            className="relative z-10 flex flex-col gap-8 px-6 pb-10 pt-10 sm:px-10 sm:pb-12 lg:pt-8"
          >
            <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 xl:gap-4">
              <div
                className="mw-hero-copy mx-auto max-w-xl space-y-6 text-center opacity-0 lg:mx-0 lg:space-y-7 lg:text-left"
                data-mw-anim
              >
                <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-mw-white sm:text-5xl lg:text-[3.35rem]">
                  Domina las alturas del{' '}
                  <span className="mw-genius-underline text-mw-white">genio</span>{' '}
                  matemático.
                </h1>

                <div className="space-y-3 text-[0.95rem] leading-relaxed text-mw-muted sm:text-base">
                  <p>
                    Explora límites, derivadas e integrales con un tutor que guía
                    con preguntas — nunca con la respuesta regalada.
                  </p>
                  <p>
                    Apunta la cámara a tu ejercicio y razona paso a paso hasta la
                    solución.
                  </p>
                </div>
              </div>

              <EagleMascot />
            </div>

            <div className="flex w-full justify-center">
              <button
                type="button"
                onClick={onStart}
                className="mw-cta inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-mw-lavender bg-mw-lavender/15 px-10 py-4 text-base font-bold tracking-wide text-mw-white opacity-0 shadow-[0_0_36px_rgba(176,158,255,0.28)] transition hover:bg-mw-lavender/25 hover:shadow-[0_0_48px_rgba(176,158,255,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mw-lavender sm:px-14 sm:py-5 sm:text-lg"
                data-mw-anim
              >
                <CameraIcon />
                Abrir cámara
              </button>
            </div>
          </section>
        </div>
      </div>
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
      <path
        d="M16 8L23 12.2V19.8L16 24L9 19.8V12.2L16 8Z"
        fill="#b09eff"
        fillOpacity="0.5"
      />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}
