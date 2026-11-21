import { useEffect, useRef } from 'react'
import type { AnalyzeResult, OverlayAnnotation } from '../types'

const COLORS: Record<string, string> = {
  amber: 'rgba(232, 168, 56, 0.45)',
  teal: 'rgba(45, 168, 152, 0.4)',
  rose: 'rgba(224, 90, 110, 0.4)',
  ink: 'rgba(26, 35, 50, 0.35)',
}

const STROKE: Record<string, string> = {
  amber: '#e8a838',
  teal: '#2da898',
  rose: '#e05a6e',
  ink: '#1a2332',
}

interface Props {
  analysis: AnalyzeResult | null
  overlays: OverlayAnnotation[]
  width: number
  height: number
}

/**
 * Overlay AR en modo foto (homografía OpenCV.js llega en Fase 4).
 * Coordenadas normalizadas de la hoja → canvas.
 */
export function ArOverlay({ analysis, overlays, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    if (analysis) {
      drawBBox(ctx, analysis.problem.bbox, width, height, 'rgba(45,168,152,0.2)', '#2da898')
      for (const step of analysis.steps) {
        drawBBox(ctx, step.bbox, width, height, 'rgba(26,35,50,0.08)', 'rgba(26,35,50,0.35)')
      }
    }

    for (const ann of overlays) {
      const step = analysis?.steps.find((s) => s.id === ann.targetStepId)
      const bbox = step?.bbox ?? analysis?.problem.bbox
      if (!bbox) continue
      const [nx, ny, nw, nh] = bbox
      const x = nx * width
      const y = ny * height
      const w = nw * width
      const h = nh * height
      const fill = COLORS[ann.color] ?? COLORS.amber
      const stroke = STROKE[ann.color] ?? STROKE.amber

      if (ann.type === 'highlight') {
        ctx.fillStyle = fill
        roundRect(ctx, x, y, w, h, 8)
        ctx.fill()
      } else if (ann.type === 'underline') {
        ctx.strokeStyle = stroke
        ctx.lineWidth = 3
        ctx.beginPath()
        const baseY = y + h + 4
        for (let i = 0; i < w; i += 10) {
          const wave = Math.sin(i / 5) * 3
          if (i === 0) ctx.moveTo(x, baseY + wave)
          else ctx.lineTo(x + i, baseY + wave)
        }
        ctx.stroke()
      } else if (ann.type === 'arrow') {
        ctx.strokeStyle = stroke
        ctx.fillStyle = stroke
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(x - 28, y + h / 2)
        ctx.lineTo(x - 6, y + h / 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x - 6, y + h / 2)
        ctx.lineTo(x - 14, y + h / 2 - 6)
        ctx.lineTo(x - 14, y + h / 2 + 6)
        ctx.closePath()
        ctx.fill()
      }

      if (ann.text) {
        ctx.font = '600 13px Figtree, system-ui, sans-serif'
        const pad = 8
        const tw = ctx.measureText(ann.text).width
        const bx = x
        const by = Math.max(8, y - 28)
        ctx.fillStyle = 'rgba(255,252,247,0.94)'
        roundRect(ctx, bx, by, tw + pad * 2, 24, 6)
        ctx.fill()
        ctx.strokeStyle = stroke
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = '#1a2332'
        ctx.fillText(ann.text, bx + pad, by + 16)
      }
    }
  }, [analysis, overlays, width, height])

  return (
    <canvas
      ref={canvasRef}
      className="ar-overlay"
      aria-hidden
    />
  )
}

function drawBBox(
  ctx: CanvasRenderingContext2D,
  bbox: [number, number, number, number],
  width: number,
  height: number,
  fill: string,
  stroke: string,
) {
  const [nx, ny, nw, nh] = bbox
  const x = nx * width
  const y = ny * height
  const w = nw * width
  const h = nh * height
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, 6)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
