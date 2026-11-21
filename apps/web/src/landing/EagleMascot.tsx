import { useEffect, useRef } from 'react'
import { animate, createTimeline, stagger } from 'animejs'

/** Águila realista: un GIF completo con aleteo + entrada anime.js. */
export function EagleMascot() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const media = root.querySelector<HTMLElement>('.mw-hero-bust')
    const glow = root.querySelector<HTMLElement>('.mw-mascot-glow')
    const plate = root.querySelector<HTMLElement>('.mw-mascot-plate')
    const orbs = root.querySelectorAll<HTMLElement>('.mw-mascot-orb')
    const glyphs = root.querySelectorAll<HTMLElement>('.mw-mascot-glyph')

    if (reduced) {
      root.querySelectorAll<HTMLElement>('[data-mw-anim]').forEach((el) => {
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
      return
    }

    if (!media || !glow || !plate) return

    const enter = createTimeline({ defaults: { ease: 'out(3)' } })
    enter
      .add(plate, { opacity: [0, 1], scale: [0.88, 1], duration: 900 }, 0)
      .add(glow, { opacity: [0, 0.8], scale: [0.7, 1], duration: 1000 }, 60)
      .add(
        media,
        { opacity: [0, 1], translateY: [36, 0], scale: [0.94, 1], duration: 1100 },
        120,
      )
      .add(
        orbs,
        { opacity: [0, 1], scale: [0.4, 1], duration: 650, delay: stagger(80) },
        380,
      )
      .add(
        glyphs,
        { opacity: [0, 0.7], translateY: [12, 0], duration: 700, delay: stagger(100) },
        480,
      )

    const floatMedia = animate(media, {
      translateY: [
        { to: -8, duration: 2400, ease: 'inOut(2)' },
        { to: 0, duration: 2400, ease: 'inOut(2)' },
      ],
      loop: true,
      delay: 1300,
    })

    const pulseGlow = animate(glow, {
      opacity: [
        { to: 0.5, duration: 2200, ease: 'inOut(2)' },
        { to: 0.88, duration: 2200, ease: 'inOut(2)' },
      ],
      scale: [
        { to: 1.05, duration: 2200, ease: 'inOut(2)' },
        { to: 1, duration: 2200, ease: 'inOut(2)' },
      ],
      loop: true,
      delay: 1100,
    })

    const floatOrbs = animate(orbs, {
      translateY: [
        { to: -12, duration: 2400, ease: 'inOut(2)' },
        { to: 6, duration: 2400, ease: 'inOut(2)' },
      ],
      opacity: [
        { to: 0.35, duration: 1800, ease: 'inOut(2)' },
        { to: 0.95, duration: 1800, ease: 'inOut(2)' },
      ],
      delay: stagger(160, { start: 900 }),
      loop: true,
    })

    const driftGlyphs = animate(glyphs, {
      translateY: [
        { to: -16, duration: 3200, ease: 'inOut(2)' },
        { to: 8, duration: 3200, ease: 'inOut(2)' },
      ],
      rotate: [
        { to: 8, duration: 3600, ease: 'inOut(2)' },
        { to: -8, duration: 3600, ease: 'inOut(2)' },
      ],
      opacity: [
        { to: 0.25, duration: 2200, ease: 'inOut(2)' },
        { to: 0.75, duration: 2200, ease: 'inOut(2)' },
      ],
      delay: stagger(220, { start: 1000 }),
      loop: true,
    })

    return () => {
      enter.revert()
      floatMedia.revert()
      pulseGlow.revert()
      floatOrbs.revert()
      driftGlyphs.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className="mw-mascot relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        className="mw-mascot-plate pointer-events-none absolute left-1/2 top-1/2 h-[90%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        aria-hidden
      >
        <div className="mw-mascot-plate-blur absolute inset-0 rounded-full" />
      </div>

      <div
        className="mw-mascot-glow pointer-events-none absolute left-1/2 top-[48%] h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{
          background:
            'radial-gradient(circle, rgba(176,158,255,0.34) 0%, rgba(61,47,107,0.16) 45%, transparent 72%)',
        }}
        aria-hidden
      />

      <span
        className="mw-mascot-orb absolute left-[10%] top-[20%] h-2.5 w-2.5 rounded-full bg-mw-lavender/80 opacity-0 shadow-[0_0_12px_rgba(176,158,255,0.9)]"
        aria-hidden
      />
      <span
        className="mw-mascot-orb absolute right-[12%] top-[26%] h-2 w-2 rounded-full bg-mw-lavender-soft/70 opacity-0 shadow-[0_0_10px_rgba(212,200,255,0.8)]"
        aria-hidden
      />
      <span
        className="mw-mascot-orb absolute bottom-[22%] left-[16%] h-1.5 w-1.5 rounded-full bg-mw-lavender/60 opacity-0"
        aria-hidden
      />
      <span
        className="mw-mascot-orb absolute bottom-[28%] right-[14%] h-3 w-3 rounded-full border border-mw-lavender/45 bg-mw-lavender/15 opacity-0"
        aria-hidden
      />

      <span
        className="mw-mascot-glyph absolute left-[6%] top-[36%] font-serif text-lg text-mw-lavender/70 opacity-0"
        aria-hidden
      >
        ∫
      </span>
      <span
        className="mw-mascot-glyph absolute right-[8%] top-[40%] font-serif text-base text-mw-lavender-soft/60 opacity-0"
        aria-hidden
      >
        ∂
      </span>
      <span
        className="mw-mascot-glyph absolute left-[18%] bottom-[18%] font-serif text-sm text-mw-lavender/55 opacity-0"
        aria-hidden
      >
        ∑
      </span>
      <span
        className="mw-mascot-glyph absolute right-[20%] bottom-[20%] font-serif text-base text-mw-lavender/50 opacity-0"
        aria-hidden
      >
        ∞
      </span>

      <div className="mw-eagle-stage relative mx-auto aspect-square max-h-[440px] w-full max-w-[440px]">
        <img
          src="/mascot/eagle-mascot.gif?v=1"
          alt="Águila realista en vuelo, mascota de cálculo de visAR"
          className="mw-hero-bust mw-mascot-img h-full w-full object-contain object-center opacity-0"
          data-mw-anim
          draggable={false}
        />
      </div>
    </div>
  )
}
