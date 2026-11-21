# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: una página estática, sin framework, servida por la API de Hono que ya está en Vercel. El pedido era ver el backend, no abrir otra aplicación.

## Users

Quien construye el tutor, en el escritorio, comprobando que la foto, SymPy y las preguntas se comportan como el plano dice. Inferido del pedido «solo para ver cómo funciona».

## Product Purpose

El producto de verdad es un tutor socrático de cálculo en realidad aumentada. Esta superficie no es esa app: deja ver el contrato actual, una fórmula a la vez.

## Positioning

SymPy decide si el paso vale. La página solo enseña la pregunta, el nivel de pista y el veredicto. No calcula y no adelanta la respuesta.

## Operating Context

Se abre en el navegador contra la API desplegada. La foto es un recorte de una fórmula. También se puede escribir LaTeX a mano para no depender de la cámara.

## Capabilities and Constraints

La API pública es `/api/analyze`, `/api/verify` y `/api/tutor`. El motor de Python no se expone. Las sesiones viven en memoria del servidor. La primera lectura OCR de una instancia fría descarga los pesos y puede tardar. Inferido: esta página se puede tirar cuando exista el frontend de la cámara.

## Brand Commitments

El tutor habla español, hace una pregunta por turno y no dice «incorrecto». El nombre del proyecto es Palafóbicos.

## Evidence on Hand

Contratos en `apps/api/src/schemas.ts` y el plano `docs/TUTOR_SOCRATICO_CALCULO_AR.md`. No hay banco de fotos de alumnos.

## Product Principles

- La pregunta va delante del veredicto.
- El alumno confirma la lectura antes de que el tutor corrija.
- Lo que la API no devuelve, la página no lo inventa.
