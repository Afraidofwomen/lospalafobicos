import { z } from "zod";
import { PROBLEM_TYPES } from "./types.ts";

export const problemTypeSchema = z.enum(PROBLEM_TYPES);

export const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const stepSchema = z.object({
  id: z.string().min(1).max(40),
  latex: z.string().min(1).max(2000),
  bbox: bboxSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const verifyRequestSchema = z.object({
  problem: z.string().min(1).max(2000),
  step: z.string().min(1).max(2000),
  relation: z.enum(["equivalent", "next_valid"]),
  type: problemTypeSchema.optional(),
});

export const analyzeRequestSchema = z.object({
  sessionId: z.string().min(1).max(80),
  imageBase64: z.string().min(20).max(2_000_000),
});

export const tutorRequestSchema = z.object({
  sessionId: z.string().min(1).max(80),
  problem: z.object({
    latex: z.string().min(1).max(2000),
    type: problemTypeSchema.optional(),
  }),
  steps: z.array(stepSchema).max(20).default([]),
  legibility: z.enum(["good", "low"]).optional(),
  studentMessage: z.string().max(2000).default(""),
  proposedStep: z.string().min(1).max(2000).optional(),
  relation: z.enum(["equivalent", "next_valid"]).optional(),
});

export const analyzeResponseSchema = z.object({
  problem: z.object({
    latex: z.string().min(1),
    type: problemTypeSchema,
    bbox: bboxSchema,
  }),
  steps: z.array(
    z.object({
      id: z.string(),
      latex: z.string(),
      bbox: bboxSchema,
      confidence: z.number().min(0).max(1),
    }),
  ),
  legibility: z.enum(["good", "low"]),
  notes: z.string().optional(),
  checks: z.array(
    z.object({
      stepId: z.string(),
      verdict: z.enum(["ok", "wrong", "unknown"]),
      reason: z.string(),
      counterexample: z.string().nullable(),
      misconception: z.string().nullable(),
    }),
  ),
});

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}
