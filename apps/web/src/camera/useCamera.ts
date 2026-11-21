import { useCallback, useEffect, useRef, useState } from 'react'
import { useSessionStore } from '../state/sessionStore'

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
}

const UPLOAD_HINT = 'Puedes usar «Tomar o subir foto».'

function cameraErrorMessage(e: unknown): string {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return `El navegador solo deja usar la cámara en HTTPS o en localhost. ${UPLOAD_HINT}`
  }
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError') return `El navegador bloqueó la cámara; dale permiso en la barra de direcciones. ${UPLOAD_HINT}`
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return `No encontré una cámara. ${UPLOAD_HINT}`
  if (name === 'NotReadableError') return `Otra aplicación está usando la cámara. ${UPLOAD_HINT}`
  return `No hay acceso a la cámara. ${UPLOAD_HINT}`
}

/** Pasa una foto elegida por el usuario a JPEG ≤ 1280 px de lado mayor. */
export async function fileToFrame(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const attemptRef = useRef(0)
  const [ready, setReady] = useState(false)
  const setCameraMode = useSessionStore((s) => s.setCameraMode)
  const setError = useSessionStore((s) => s.setError)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setReady(false)
  }, [])

  const start = useCallback(async () => {
    const attempt = ++attemptRef.current
    setError(null)
    stop()
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
      if (attempt !== attemptRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      if (attempt !== attemptRef.current) return
      setReady(true)
      setCameraMode('live')
    } catch (e) {
      if (attempt !== attemptRef.current) return
      if (e instanceof DOMException && e.name === 'AbortError' && stream?.active) {
        setReady(true)
        setCameraMode('live')
        return
      }
      stream?.getTracks().forEach((t) => t.stop())
      setCameraMode('denied')
      setError(cameraErrorMessage(e))
    }
  }, [setCameraMode, setError, stop])

  /** Captura JPEG ≤ 1280 px lado mayor (contrato §5.1). */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null

    const maxSide = 1280
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
    const w = Math.round(video.videoWidth * scale)
    const h = Math.round(video.videoHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.85)
  }, [])

  useEffect(
    () => () => {
      attemptRef.current++
      stop()
    },
    [stop],
  )

  return { videoRef, ready, start, stop, captureFrame }
}
