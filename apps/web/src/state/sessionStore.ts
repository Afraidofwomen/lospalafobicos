import { create } from 'zustand'
import type {
  AnalyzeResult,
  AppPhase,
  CameraMode,
  ChatMessage,
  HintLevel,
  OverlayAnnotation,
  TutorResponse,
} from '../types'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface SessionState {
  sessionId: string
  phase: AppPhase
  cameraMode: CameraMode
  hintLevel: HintLevel
  messages: ChatMessage[]
  analysis: AnalyzeResult | null
  overlays: OverlayAnnotation[]
  frozenFrame: string | null
  isAnalyzing: boolean
  isTutoring: boolean
  error: string | null
  textScale: number
  setPhase: (phase: AppPhase) => void
  setCameraMode: (mode: CameraMode) => void
  setFrozenFrame: (dataUrl: string | null) => void
  setAnalysis: (analysis: AnalyzeResult | null) => void
  setOverlays: (overlays: OverlayAnnotation[]) => void
  setHintLevel: (level: HintLevel) => void
  setAnalyzing: (v: boolean) => void
  setTutoring: (v: boolean) => void
  setError: (error: string | null) => void
  setTextScale: (scale: number) => void
  addMessage: (msg: Omit<ChatMessage, 'id'>) => void
  applyTutorResponse: (res: TutorResponse) => void
  resetSession: () => void
}

const welcome: ChatMessage = {
  id: 'welcome',
  role: 'tutor',
  text: 'Apunta a tu ejercicio y pulsa Revisar. Empezaré con una pregunta, no con la solución.',
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: uid(),
  phase: 'landing',
  cameraMode: 'idle',
  hintLevel: 0,
  messages: [welcome],
  analysis: null,
  overlays: [],
  frozenFrame: null,
  isAnalyzing: false,
  isTutoring: false,
  error: null,
  textScale: 1,

  setPhase: (phase) => set({ phase }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setFrozenFrame: (frozenFrame) => set({ frozenFrame }),
  setAnalysis: (analysis) => set({ analysis }),
  setOverlays: (overlays) => set({ overlays }),
  setHintLevel: (hintLevel) => set({ hintLevel }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setTutoring: (isTutoring) => set({ isTutoring }),
  setError: (error) => set({ error }),
  setTextScale: (textScale) => set({ textScale }),

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, id: uid() }],
    })),

  applyTutorResponse: (res) =>
    set((s) => ({
      hintLevel: res.hintLevel,
      overlays: res.overlay,
      messages: [
        ...s.messages,
        {
          id: uid(),
          role: 'tutor',
          text: res.question,
          celebrate: res.celebrate,
        },
      ],
    })),

  resetSession: () =>
    set({
      sessionId: uid(),
      hintLevel: 0,
      messages: [welcome],
      analysis: null,
      overlays: [],
      frozenFrame: null,
      isAnalyzing: false,
      isTutoring: false,
      error: null,
      phase: 'camera',
      cameraMode: 'live',
    }),
}))

