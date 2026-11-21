import type { Context } from "hono";
import type { AppConfig } from "../config.ts";
import { LlmNotConfiguredError, VisionUnavailableError, visionSystemPrompt, type LlmClient } from "../llm/client.ts";
import { decodeImage, imageProblem } from "../media/image.ts";
import { analyzeRequestSchema, analyzeResponseSchema, errorBody } from "../schemas.ts";
import { getOrCreateSession } from "../session/store.ts";
import { PROBLEM_TYPES } from "../types.ts";

const CONFIRM = "Confírmala si no es la fórmula que estás mirando.";

export async function analyze(c: Context, config: AppConfig, llm: LlmClient): Promise<Response> {
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
      user: "Transcribe solo la fórmula del centro del fotograma. No la resuelvas. steps debe ser [].",
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
  const checked = analyzeResponseSchema.safeParse(reading);
  if (!checked.success) {
    return c.json(errorBody("unreadable", "No pude leer una fórmula."), 422);
  }
  return c.json(checked.data);
}

function normalizeReading(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { problem?: unknown; legibility?: unknown; notes?: unknown };
  if (!body.problem || typeof body.problem !== "object") return null;
  const problem = body.problem as { latex?: unknown; type?: unknown; bbox?: unknown };
  const latex = typeof problem.latex === "string" ? problem.latex.trim() : "";
  if (!latex) return null;
  const type = PROBLEM_TYPES.includes(problem.type as (typeof PROBLEM_TYPES)[number]) ? problem.type : "other";
  return {
    problem: { latex, type, bbox: bboxOrFull(problem.bbox) },
    steps: [],
    legibility: body.legibility === "low" ? "low" : "good",
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : CONFIRM,
  };
}

function bboxOrFull(value: unknown): [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4) return [0, 0, 1, 1];
  const numbers = value.map((item) => Number(item));
  if (numbers.some((item) => !Number.isFinite(item))) return [0, 0, 1, 1];
  return numbers as [number, number, number, number];
}

export async function readJson(c: Context): Promise<unknown | Response> {
  try {
    return await c.req.json();
  } catch {
    return c.json(errorBody("validation_error", "El cuerpo no es JSON."), 400);
  }
}
