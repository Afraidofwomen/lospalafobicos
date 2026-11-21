import { useEffect, useRef } from 'react'
import type { AnalyzeResult, OverlayAnnotation, StepCheck } from '../types'

const COLORS: Record<string, string> = {
  amber: 'rgba(232, 168, 56, 0.45)',
  teal: 'rgba(45, 168, 152, 0.4)',
  green: 'rgba(76, 190, 110, 0.4)',
  rose: 'rgba(224, 90, 110, 0.4)',
  ink: 'rgba(26, 35, 50, 0.35)',
}

const STROKE: Record<string, string> = {
  amber: '#e8a838',
  teal: '#2da898',
  green: '#4cbe6e',
  rose: '#e05a6e',
  ink: '#1a2332',
}

const VERDICT: Record<StepCheck['verdict'], { color: string; label: string; width: number }> = {
  ok: { color: 'green', label: '✓ Cuadra', width: 2 },
  wrong: { color: 'rose', label: '✗ Aquí no cuadra', width: 3 },
  unknown: { color: 'amber', label: '¿Leí bien?', width: 2 },
}

interface Props {
  analysis: AnalyzeResult | null
  overlays: OverlayAnnotation[]
  width: number
  height: number
  /** Tamaño original del fotograma; la foto se muestra con object-fit: cover. */
  frame?: { w: number; h: number } | null
}

type Bbox = [number, number, number, number]

/** Pasa una caja normalizada del fotograma a píxeles del canvas, con el mismo recorte que cover. */
function coverMapper(width: number, height: number, frame?: { w: number; h: number } | null) {
  if (!frame || frame.w === 0 || frame.h === 0) {
    return ([nx, ny, nw, nh]: Bbox): Bbox => [nx * width, ny * height, nw * width, nh * height]
  }
  const scale = Math.max(width / frame.w, height / frame.h)
  const dx = (width - frame.w * scale) / 2
  const dy = (height - frame.h * scale) / 2
  return ([nx, ny, nw, nh]: Bbox): Bbox => [
    dx + nx * frame.w * scale,
    dy + ny * frame.h * scale,
    nw * frame.w * scale,
    nh * frame.h * scale,
  ]
}

/**
 * Overlay AR en modo foto (homografía OpenCV.js llega en Fase 4).
 * Coordenadas normalizadas de la hoja → canvas.
 */
export function ArOverlay({ analysis, overlays, width, height, frame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)
    const toPx = coverMapper(width, height, frame)

    if (analysis) {
      drawBBox(ctx, toPx(analysis.problem.bbox), 'rgba(45,168,152,0.2)', '#2da898')
      for (const step of analysis.steps) {
        const check = analysis.checks?.find((c) => c.stepId === step.id)
        const mark = check ? VERDICT[check.verdict] : null
        const rect = toPx(step.bbox)
        if (!mark) {
          drawBBox(ctx, rect, 'rgba(26,35,50,0.08)', 'rgba(26,35,50,0.35)')
          continue
        }
        drawBBox(ctx, rect, COLORS[mark.color], STROKE[mark.color], mark.width)
        drawLabel(ctx, mark.label, rect[0], rect[1], STROKE[mark.color])
      }
    }

    for (const ann of overlays) {
      const step = analysis?.steps.find((s) => s.id === ann.targetStepId)
      const bbox = step?.bbox ?? analysis?.problem.bbox
      if (!bbox) continue
      const [x, y, w, h] = toPx(bbox)
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

      if (ann.text) drawLabel(ctx, ann.text, x, y, stroke)
    }
  }, [analysis, overlays, width, height, frame])

  return (
    <canvas
      ref={canvasRef}
      className="ar-overlay"
      aria-hidden
    />
  )
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, stroke: string) {
  ctx.font = '600 13px Figtree, system-ui, sans-serif'
  const pad = 8
  const tw = ctx.measureText(text).width
  const bx = Math.min(Math.max(8, x), ctx.canvas.width - tw - pad * 2 - 8)
  const by = Math.max(8, y - 28)
  ctx.fillStyle = 'rgba(255,252,247,0.94)'
  roundRect(ctx, bx, by, tw + pad * 2, 24, 6)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = '#1a2332'
  ctx.fillText(text, bx + pad, by + 16)
}

function drawBBox(
  ctx: CanvasRenderingContext2D,
  [x, y, w, h]: Bbox,
  fill: string,
  stroke: string,
  lineWidth = 1.5,
) {
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, 6)
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
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
