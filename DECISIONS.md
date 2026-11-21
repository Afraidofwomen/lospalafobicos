# Decisiones

## Frontend y backend en el mismo monorepo

La PWA (`apps/web`) llegó en la rama `cursor/tutor-socratico-frontend-f31e` y se fusionó con el backend. `apps/api` y `apps/web` son workspaces de la raíz; `npm run dev` levanta API, motor matemático y Vite. El plano queda solo en `docs/`.

## La PWA llama a la API en el mismo origen

`VITE_API_URL` vacío significa `/api` en el mismo host. En desarrollo Vite pasa `/api` a `127.0.0.1:8787`, así el teléfono solo necesita llegar a Vite. Los mocks del frontend quedan detrás de `VITE_DEMO=true`.

El cliente traduce la sesión de la PWA al contrato de `/api/tutor`: manda `problem`, `steps`, `legibility` y `studentMessage`. El nivel de pista no se manda; lo lleva el servidor por `sessionId`. Los tipos `unknown` y `definite_integral` del frontend se mandan como sin tipo e `integral`.

## SymPy es la fuente de verdad

`/api/tutor` vuelve a verificar el paso con el microservicio. Si el cliente mandara un veredicto distinto, no se usa. El modelo de lenguaje, si está configurado, solo puede cambiar el texto de la pregunta, y el servidor la rechaza si tiene más de una pregunta, pasa de 40 palabras, dice "incorrecto" o filtra el paso siguiente antes del nivel 5.

## El paso siguiente no sale en `/api/verify`

El motor lo calcula y la API lo guarda para el nivel 5. La respuesta pública no lo trae. El servicio de Python escucha en `127.0.0.1`.

## Cómo se comparan las expresiones

Se evalúan derivada, integral y límite (`doit`) y se simplifica la diferencia. Si el álgebra no concluye, se muestrean puntos fijos. `equivalent` compara valores. `next_valid`, además, clasifica errores frecuentes y, en una integral indefinida, exige una constante (`+ C` u otra constante). Una integral indefinida equivalente al valor del operador, sin constante, es válida como `equivalent` y no como `next_valid`.

`e` y `\pi` del LaTeX se leen como las constantes de Euler y pi. `x(expr)` se lee como producto, que es la notación usual en un ejercicio, no como una función llamada x. La variable sale del operador (`d/dt` usa t); si no hay operador, se prefiere x.

## Sesiones e imágenes

No hay disco para fotos ni para sesiones. La imagen se valida en memoria (JPEG o PNG, lado mayor ≤ 1280 px, tope de bytes) y se descarta. El modelo de visión la ve en esa petición y no la guarda. El modelo de redacción no recibe la foto.

## La fórmula la ve un modelo en la nube

`/api/analyze` manda el fotograma a un modelo de visión (`gemini-3.5-flash-lite`) con el prompt de transcripción. No resuelve el ejercicio: `steps` se vacía antes de responder. El proveedor sale de `LLM_BASE_URL`: con Vercel AI Gateway la autorización es el token OIDC o `AI_GATEWAY_API_KEY`; con otro endpoint compatible con OpenAI, como el de Google, se usa `LLM_API_KEY`. SymPy sigue siendo quien acepta o rechaza un paso.

RapidLatexOCR queda en el servicio de Python y ya no está en el camino de `/api/analyze`.

## Proveedor del modelo de redacción

La redacción opcional del tutor usa el mismo endpoint (`LLM_BASE_URL`, `LLM_MODEL`). La clave no se escribe en el cliente. Sin modelo, la pregunta sale de las plantillas.

## Despliegue

La API de Hono y el motor de Python salen juntos con Vercel Services (beta). El motor no tiene ruta pública: la API lo llama por `MATH_SERVICE_URL`, que Vercel rellena en cada despliegue. Así el paso siguiente sigue sin salir al cliente. Python va en 3.12. En Vercel la verificación corre en el mismo proceso. La PWA todavía no está en `vercel.json`.

## Entorno de Python

En esta máquina `python3 -m venv` no trae pip. `scripts/setup-math.sh` crea el entorno con `--without-pip` y luego instala pip. SymPy 1.14 necesita `antlr4-python3-runtime==4.11.1` para leer LaTeX.

## 2026-11-21 — Frontend Fase 0 (PWA)

1. **Monorepo en la raíz del repo** (`apps/web`), no carpeta `tutor-ar/` aparte: el remoto ya es `lospalafobicos`.
2. **AR en modo foto**: overlay Canvas 2D sobre fotograma congelado. OpenCV.js / homografía queda para Fase 4.
3. **Estado con Zustand**: sesión, nivel de pista, mensajes y overlays en un store único.
4. **Análisis solo al pulsar “Revisar”**, como pide §8 del brief.

## 2026-11-21 — Mundo visual (Impeccable)

1. Dirección elegida: **challenger vertical full-bleed** (`pop-culture-shelf-vertical-video-feed-surface`) para la app de cámara.
2. Operate: el mundo presta solo type / palette / density / signature move — no costume de red social.
3. Firma: pregunta del tutor como caption inferior sobre la cámara; rail derecho con pista y controles estándar.
4. Tipografía app: Public Sans (self-hosted). Paleta void + blanco + ámbar de estado.

## 2026-11-21 — Landing estilo MathWiz

Landing adaptada de la referencia MathWiz: card oscura, acentos púrpura/verde, busto VR de la misma imagen (`public/hero-bust.jpg` / `landing-ref.jpg`). CTAs abren la cámara del tutor visAR.
