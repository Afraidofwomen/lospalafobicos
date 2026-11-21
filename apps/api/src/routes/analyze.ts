import type { Context } from "hono";
import type { AppConfig } from "../config.ts";
import { LlmNotConfiguredError, VisionUnavailableError, visionSystemPrompt, type LlmClient } from "../llm/client.ts";
import type { MathClient } from "../math/client.ts";
import { decodeImage, imageProblem } from "../media/image.ts";
import { analyzeRequestSchema, analyzeResponseSchema, errorBody } from "../schemas.ts";
import { getOrCreateSession } from "../session/store.ts";
import { PROBLEM_TYPES, type ProblemType } from "../types.ts";

const CONFIRM = "Confírmala si no es la fórmula que estás mirando.";
const MAX_STEPS = 8;
const MIN_CONFIDENCE = 0.7;

type Bbox = [number, number, number, number];

interface Reading {
  problem: { latex: string; type: ProblemType; bbox: Bbox };
  steps: Array<{ id: string; latex: string; bbox: Bbox; confidence: number }>;
  legibility: "good" | "low";
  notes: string;
}

export interface StepCheck {
  stepId: string;
  verdict: "ok" | "wrong" | "unknown";
  reason: string;
  counterexample: string | null;
  misconception: string | null;
}

export async function analyze(c: Context, config: AppConfig, llm: LlmClient, math: MathClient): Promise<Response> {
  const raw = await readJson(c);
  if (raw instanceof Response) return raw;
  const parsed = analyzeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json(errorBody("validation_error", "La petición no cumple el esquema."), 400);
  }
  const bytes = decodeImage(parsed.data.imageBase64);
  const imageError = imageProblem(bytes, config.maxImageBytes);
  if (imageError) {
    const code = /1280|tamaño/.test(imageError) ? 413 : 400;
    return c.json(errorBody("invalid_image", imageError), code);
  }
  getOrCreateSession(parsed.data.sessionId);
  let model: unknown;
  try {
    model = await llm.completeJson({
      model: config.llmVisionModel,
      system: visionSystemPrompt(),
      user: "Transcribe el enunciado y los pasos escritos, tal como están. No los corrijas ni resuelvas el ejercicio.",
      imageBase64: bytes.toString("base64"),
      oidcToken: c.req.header("x-vercel-oidc-token"),
    });
  } catch (error) {
    if (error instanceof LlmNotConfiguredError || error instanceof VisionUnavailableError) throw error;
    throw new VisionUnavailableError();
  }
  const reading = normalizeReading(model);
  if (!reading) {
    return c.json(errorBody("unreadable", "No pude leer una fórmula."), 422);
  }
  const checks = await checkSteps(math, reading);
  const checked = analyzeResponseSchema.safeParse({ ...reading, checks });
  if (!checked.success) {
    return c.json(errorBody("unreadable", "No pude leer una fórmula."), 422);
  }
  return c.json(checked.data);
}

async function checkSteps(math: MathClient, reading: Reading): Promise<StepCheck[]> {
  const type = reading.problem.type === "other" ? undefined : reading.problem.type;
  return Promise.all(
    reading.steps.map(async (step): Promise<StepCheck> => {
      if (step.confidence < MIN_CONFIDENCE) {
        return unknown(step.id, "No estoy seguro de haber leído bien este paso. ¿Lo confirmas?");
      }
      const input = { problem: reading.problem.latex, step: step.latex, ...(type ? { type } : {}) };
      try {
        const result = await math.verify({ ...input, relation: "equivalent" });
        if (result.status !== "ok") return unknown(step.id, "No pude verificar este paso.");
        if (result.valid) {
          return { stepId: step.id, verdict: "ok", reason: "Este paso cuadra.", counterexample: null, misconception: null };
        }
        const diagnosis = await math.verify({ ...input, relation: "next_valid" });
        const detail = diagnosis.status === "ok" && !diagnosis.valid ? diagnosis : result;
        return {
          stepId: step.id,
          verdict: "wrong",
          reason: detail.reason || "Este paso no coincide con el ejercicio.",
          counterexample: detail.counterexample ?? result.counterexample,
          misconception: detail.misconception,
        };
      } catch {
        return unknown(step.id, "El verificador no está disponible.");
      }
    }),
  );
}

function unknown(stepId: string, reason: string): StepCheck {
  return { stepId, verdict: "unknown", reason, counterexample: null, misconception: null };
}

function normalizeReading(raw: unknown): Reading | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { problem?: unknown; steps?: unknown; legibility?: unknown; notes?: unknown };
  if (!body.problem || typeof body.problem !== "object") return null;
  const problem = body.problem as { latex?: unknown; type?: unknown; bbox?: unknown };
  const latex = typeof problem.latex === "string" ? problem.latex.trim() : "";
  if (!latex) return null;
  const type = PROBLEM_TYPES.includes(problem.type as ProblemType) ? (problem.type as ProblemType) : "other";
  return {
    problem: { latex, type, bbox: bboxOrFull(problem.bbox) },
    steps: normalizeSteps(body.steps),
    legibility: body.legibility === "low" ? "low" : "good",
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : CONFIRM,
  };
}

function normalizeSteps(value: unknown): Reading["steps"] {
  if (!Array.isArray(value)) return [];
  const steps: Reading["steps"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const step = item as { latex?: unknown; bbox?: unknown; confidence?: unknown };
    const latex = typeof step.latex === "string" ? step.latex.trim().replace(/^=\s*/, "") : "";
    if (!latex || latex.length > 2000) continue;
    const confidence = Number(step.confidence);
    steps.push({
      id: `s${steps.length + 1}`,
      latex,
      bbox: bboxOrFull(step.bbox),
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.8,
    });
    if (steps.length >= MAX_STEPS) break;
  }
  return steps;
}

function bboxOrFull(value: unknown): Bbox {
  if (!Array.isArray(value) || value.length !== 4) return [0, 0, 1, 1];
  const numbers = value.map((item) => Number(item));
  if (numbers.some((item) => !Number.isFinite(item))) return [0, 0, 1, 1];
  return numbers as Bbox;
}

export async function readJson(c: Context): Promise<unknown | Response> {
  try {
    return await c.req.json();
  } catch {
    return c.json(errorBody("validation_error", "El cuerpo no es JSON."), 400);
  }
}
