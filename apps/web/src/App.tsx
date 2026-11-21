import { LandingPage } from './landing/LandingPage'
import { CameraStage } from './components/CameraStage'
import { useSessionStore } from './state/sessionStore'

export default function App() {
  const phase = useSessionStore((s) => s.phase)
  const setPhase = useSessionStore((s) => s.setPhase)

  if (phase === 'landing' || phase === 'onboarding') {
    return <LandingPage onStart={() => setPhase('camera')} />
  }

  return (
    <div className="app-shell">
      <CameraStage />
    </div>
  )
}
