# Los Palafóbicos — tutor socrático de cálculo

Backend del tutor. El estudiante, más adelante desde la PWA, manda la foto de un ejercicio y sus pasos. Este servicio transcribe, verifica con SymPy y contesta con una sola pregunta. No entrega la solución antes del nivel de pista 5.

El plano completo está en `docs/TUTOR_SOCRATICO_CALCULO_AR.md`. La app de cámara y el overlay AR viven en la rama `front_end`; los contratos de abajo ya son los que esa app va a consumir.

## Qué hay en esta rama

| Pieza | Rol |
|---|---|
| `apps/api` | API Node: `/api/analyze`, `/api/verify`, `/api/tutor` |
| `services/math` | FastAPI + SymPy. Solo en localhost |
| `eval` | 42 ejercicios y el reporte de las métricas del plano |

## Requisitos

- Node 22
- Python 3.14. El entorno del servicio matemático se crea sin `ensurepip` del sistema; `scripts/setup-math.sh` lo deja listo.

```bash
bash scripts/setup-math.sh
npm install
cp .env.example .env
```

`/api/analyze` manda cada fotograma a un modelo de visión en Vercel AI Gateway (`google/gemini-3.5-flash-lite`). En Vercel usa el token OIDC del despliegue. En local hace falta `AI_GATEWAY_API_KEY` o `LLM_API_KEY`. SymPy sigue decidiendo si un paso vale. Si no hay modelo, la pregunta del tutor sale de las plantillas.

## Correr

```bash
npm run dev
```

Eso levanta la API en `http://127.0.0.1:8787` y el motor matemático en `http://127.0.0.1:8000`. El motor no debe publicarse: la API le quita el paso siguiente antes de responder al cliente.

```bash
npm test
npm run eval
```

`npm run eval` escribe `eval/REPORT.md`.

## Contratos

`POST /api/analyze` recibe `{ "sessionId", "imageBase64" }`. JPEG o PNG, lado mayor de 1280 px como máximo, con una sola fórmula en el recorte. El modelo de visión la pasa a LaTeX en memoria y no guarda la foto. La respuesta trae el problema, `steps` vacío y una nota para confirmar la lectura. Si no hay una fórmula clara, responde 422. Si el modelo no está configurado, responde 503.

`POST /api/verify` recibe `{ "problem", "step", "relation", "type?" }`. `relation` es `equivalent` o `next_valid`. La respuesta es `{ "valid", "reason", "counterexample", "misconception" }`. No incluye la solución simbólica.

`POST /api/tutor` recibe la sesión, el problema, los pasos, el mensaje del estudiante y, si ya reescribió, `proposedStep`. Responde `{ "hintLevel", "question", "overlay", "diagnosis", "celebrate" }`.

`DELETE /api/session/:id` borra la sesión. Las sesiones viven en memoria y se descartan a las 6 horas.

## Pistas

Dos errores seguidos en el mismo nivel suben un nivel. Una respuesta que SymPy acepta baja un nivel. "No sé" o "ayuda" suben un nivel y cambian a un tono más cálido. El nivel no pasa de 5. En el 5 la pregunta puede mostrar solo el siguiente paso.
