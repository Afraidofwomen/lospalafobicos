# Decisiones

## Esta rama no incluye la PWA

El plano pide `apps/web` en la fase 0. Esa app está en `front_end`. Aquí `npm run dev` levanta la API y el motor matemático. Cuando el frontend exista, se conecta a estos contratos y se ajusta `CORS_ORIGIN`.

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

`/api/analyze` manda el fotograma a Vercel AI Gateway, modelo `google/gemini-3.5-flash-lite`, con el prompt de transcripción. No resuelve el ejercicio: `steps` se vacía antes de responder. En Vercel la autorización es el token OIDC; `AI_GATEWAY_API_KEY` o `LLM_API_KEY` sirven fuera. La cámara de la página de prueba envía un fotograma cada dos segundos y solo abre la conversación cuando la misma fórmula se repite. SymPy sigue siendo quien acepta o rechaza un paso.

RapidLatexOCR queda en el servicio de Python y ya no está en el camino de `/api/analyze`.

## Proveedor del modelo de redacción

La redacción opcional del tutor usa el mismo gateway (`LLM_BASE_URL`, `LLM_MODEL`). La clave no se escribe en el cliente. Sin modelo, la pregunta sale de las plantillas.

## Despliegue

La API de Hono y el motor de Python salen juntos con Vercel Services (beta). El motor no tiene ruta pública: la API lo llama por `MATH_SERVICE_URL`, que Vercel rellena en cada despliegue. Así el paso siguiente sigue sin salir al cliente. Python va en 3.12. En Vercel la verificación corre en el mismo proceso.

## Entorno de Python

En esta máquina `python3 -m venv` no trae pip. `scripts/setup-math.sh` crea el entorno con `--without-pip` y luego instala pip. SymPy 1.14 necesita `antlr4-python3-runtime==4.11.1` para leer LaTeX.
