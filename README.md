# visAR — Tutor de Cálculo en AR

PWA donde el estudiante apunta la cámara a un ejercicio de cálculo y visAR guía con preguntas (sin regalar la respuesta).

Especificación: `TUTOR_SOCRATICO_CALCULO_AR.md`.

## Estado

- **Frontend (Fase 0–3 UI):** listo en `apps/web`
- Backend `/api/*` y SymPy: pendientes
- Sin `VITE_API_URL`: la app corre en **modo demo** (mocks de análisis y tutor)

## Requisitos

- Node.js 20+
- Cámara (HTTPS o `localhost`)

## Arranque

```bash
cd apps/web
npm install
npm run dev
```

Abre la URL que muestra Vite (en el teléfono usa un túnel HTTPS, p. ej. Cloudflare Tunnel o `vite --host` en la misma red Wi‑Fi con HTTPS).

Variables: copia `apps/web/.env.example` → `apps/web/.env`.

## Estructura

```
apps/web/src/
  camera/   # getUserMedia, captura JPEG ≤1280px
  ar/       # overlay Canvas 2D
  tutor/    # chat socrático + KaTeX
  state/    # sesión y nivel de pista
  api/      # cliente analyze / verify / tutor
```

## Privacidad

Al pulsar **Revisar**, se envía una imagen del ejercicio al servidor (cuando haya API). Por defecto no se guarda en disco. Ver aviso en el onboarding.

