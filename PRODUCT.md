# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React + Vite + TypeScript PWA in `apps/web` (already scaffolded; camera via getUserMedia; KaTeX for formulas).

## Users

Estudiantes universitarios de cálculo (una variable) que tienen un ejercicio en papel, pizarrón o pantalla y quieren avanzar sin que les den la respuesta.

## Product Purpose

Tutor socrático en realidad aumentada: la cámara lee el ejercicio, el tutor guía con una pregunta a la vez, y un motor simbólico verifica los pasos. Éxito = el estudiante llega solo a la solución, sin filtración de la respuesta final antes del nivel de pista 5.

## Positioning

No es un solucionador de tareas. Es un tutor que enseña por preguntas, anclado al papel del estudiante vía cámara/AR, con verificación matemática determinista (no solo LLM).

## Operating Context

Uso en el teléfono (PWA), a menudo en escritorio de estudio o aula; luz variable; manos ocupadas con lápiz; sesión corta centrada en un ejercicio. Idioma español. Notación LaTeX interna.

## Capabilities and Constraints

- MVP: límites, continuidad, derivadas, aplicaciones, integrales.
- Análisis solo al pulsar "Revisar" (no por frame).
- Sin revelar la respuesta final salvo escalamiento nivel 5.
- Imágenes no se guardan en disco por defecto.
- Backend aún incompleto; frontend puede correr en modo demo con mocks.
- Open: clave LLM solo en servidor; tracking OpenCV.js en fase posterior.

## Brand Commitments

- Nombre de producto: **visAR**.
- Voz: cálida, breve, una pregunta por turno; nunca condescendiente.
- El usuario rechazó explícitamente un look de pizarrón escolar como dirección visual ("nada que ver").

## Evidence on Hand

- Brief: `TUTOR_SOCRATICO_CALCULO_AR.md`
- UI actual: `apps/web` (cámara, overlay, chat, onboarding)
- No hay logo oficial, fotos de producto ni testimonios reales. Demos sintéticas deben etiquetarse como demo.

## Product Principles

1. El razonamiento del estudiante es el centro; la UI no compite con el papel ni con la pregunta.
2. Claridad matemática: las fórmulas deben leerse mejor que el chrome.
3. Privacidad por defecto: avisar qué se envía; no archivar imágenes sin consentimiento.
4. Guía gradual: el nivel de pista es estado visible y comprensible.
5. Degradar con gracia: sin cámara → mensaje claro; sin red → estado honesto.

