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

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
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
    setError(null)
    try {
      stop()
      const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setReady(true)
      setCameraMode('live')
    } catch {
      setCameraMode('denied')
      setError(
        'No hay acceso a la cámara. Revisa permisos del navegador o usa HTTPS.',
      )
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

  useEffect(() => () => stop(), [stop])

  return { videoRef, ready, start, stop, captureFrame }
}
