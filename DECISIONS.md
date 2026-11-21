# Decisiones de diseño

## 2026-11-21 — Frontend Fase 0 (PWA)

1. **Monorepo en la raíz del repo** (`apps/web`), no carpeta `tutor-ar/` aparte: el remoto ya es `lospalafobicos`.
2. **Sin backend en esta entrega**: el cliente usa mocks en `src/api/client.ts` cuando `VITE_API_URL` está vacío, para que la UI sea usable de inmediato.
3. **AR en modo foto**: overlay Canvas 2D sobre fotograma congelado. OpenCV.js / homografía queda para Fase 4.
4. **Estado con Zustand**: sesión, nivel de pista, mensajes y overlays en un store único.
5. **Análisis solo al pulsar “Revisar”**, como pide §8 del brief.

## 2026-11-21 — Mundo visual (Impeccable)

1. Dirección elegida: **challenger vertical full-bleed** (`pop-culture-shelf-vertical-video-feed-surface`) para la app de cámara.
2. Operate: el mundo presta solo type / palette / density / signature move — no costume de red social.
3. Firma: pregunta del tutor como caption inferior sobre la cámara; rail derecho con pista y controles estándar.
4. Tipografía app: Public Sans (self-hosted). Paleta void + blanco + ámbar de estado.

## 2026-11-21 — Landing estilo MathWiz

Landing adaptada de la referencia MathWiz: card oscura, acentos púrpura/verde, busto VR de la misma imagen (`public/hero-bust.jpg` / `landing-ref.jpg`). CTAs abren la cámara del tutor visAR.

