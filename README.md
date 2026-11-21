# visAR — tutor socrático de cálculo en AR (Los Palafóbicos)

PWA donde el estudiante apunta la cámara a un ejercicio de cálculo y visAR guía con preguntas. El backend transcribe la foto, verifica con SymPy y contesta con una sola pregunta. No entrega la solución antes del nivel de pista 5.

El plano completo está en `docs/TUTOR_SOCRATICO_CALCULO_AR.md`.

## Piezas

| Pieza | Rol |
|---|---|
| `apps/web` | PWA React + Vite: cámara, overlay AR, chat socrático con KaTeX |
| `apps/api` | API Node: `/api/analyze`, `/api/verify`, `/api/tutor` |
| `services/math` | FastAPI + SymPy. Solo en localhost |
| `eval` | 42 ejercicios y el reporte de las métricas del plano |

## Requisitos

- Node 22
- Python 3.14. El entorno del servicio matemático se crea sin `ensurepip` del sistema; `scripts/setup-math.sh` lo deja listo.
- Cámara: HTTPS o `localhost`

```bash
bash scripts/setup-math.sh
npm install
cp .env.example apps/api/.env
```

`/api/analyze` manda cada fotograma a un modelo de visión (`gemini-3.5-flash-lite`). Con Vercel AI Gateway, en Vercel usa el token OIDC del despliegue y en local hace falta `AI_GATEWAY_API_KEY`. Con una clave de Google, pon `LLM_API_KEY`, `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai` y los modelos sin el prefijo `google/`. SymPy sigue decidiendo si un paso vale. Si no hay modelo, la pregunta del tutor sale de las plantillas.

## Correr

```bash
npm run dev
```

Eso levanta la PWA en `http://localhost:5173`, la API en `http://127.0.0.1:8787` y el motor matemático en `http://127.0.0.1:8000`. Vite pasa `/api` a la API, así que en el teléfono solo hace falta llegar a Vite (túnel HTTPS, p. ej. Cloudflare Tunnel). El motor no debe publicarse: la API le quita el paso siguiente antes de responder al cliente.

Para usar la PWA sin backend, pon `VITE_DEMO=true` en `apps/web/.env` (ver `apps/web/.env.example`).

```bash
npm test
npm run eval
npm run build
```

`npm run eval` escribe `eval/REPORT.md`. `npm run build` genera la PWA en `apps/web/dist`.

## Estructura del frontend

```
apps/web/src/
  camera/   # getUserMedia, captura JPEG ≤1280px
  ar/       # overlay Canvas 2D
  tutor/    # chat socrático + KaTeX
  state/    # sesión y nivel de pista
  api/      # cliente analyze / verify / tutor
```

## Contratos

`POST /api/analyze` recibe `{ "sessionId", "imageBase64" }`. JPEG o PNG, lado mayor de 1280 px como máximo, con una sola fórmula en el recorte. El modelo de visión la pasa a LaTeX en memoria y no guarda la foto. La respuesta trae el problema, `steps` vacío y una nota para confirmar la lectura. Si no hay una fórmula clara, responde 422. Si el modelo no está configurado, responde 503.

`POST /api/verify` recibe `{ "problem", "step", "relation", "type?" }`. `relation` es `equivalent` o `next_valid`. La respuesta es `{ "valid", "reason", "counterexample", "misconception" }`. No incluye la solución simbólica.

`POST /api/tutor` recibe la sesión, el problema, los pasos, el mensaje del estudiante y, si ya reescribió, `proposedStep`. Un mensaje que parece una expresión también se verifica como paso. Responde `{ "hintLevel", "question", "overlay", "diagnosis", "celebrate" }`.

`DELETE /api/session/:id` borra la sesión. Las sesiones viven en memoria y se descartan a las 6 horas.

## Pistas

Dos errores seguidos en el mismo nivel suben un nivel. Una respuesta que SymPy acepta baja un nivel. "No sé" o "ayuda" suben un nivel y cambian a un tono más cálido. El nivel no pasa de 5. En el 5 la pregunta puede mostrar solo el siguiente paso.

## Privacidad

Al pulsar **Revisar**, se envía una imagen del ejercicio al servidor. No se guarda en disco. Ver aviso en el onboarding.
