import type { MathResult, ProblemType, Relation } from "../types.ts";

export class MathUnavailableError extends Error {
  constructor() {
    super("math unavailable");
    this.name = "MathUnavailableError";
  }
}

export class UnreadableImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnreadableImageError";
  }
}

export interface FormulaReading {
  problem: {
    latex: string;
    type: "limit" | "continuity" | "derivative" | "integral" | "optimization" | "related_rates" | "other";
    bbox: [number, number, number, number];
  };
  steps: Array<{
    id: string;
    latex: string;
    bbox: [number, number, number, number];
    confidence: number;
  }>;
  legibility: "good" | "low";
  notes?: string;
}

export interface VerifyInput {
  problem: string;
  step: string;
  relation: Relation;
  type?: ProblemType;
}

export interface MathClient {
  health(): Promise<boolean>;
  verify(input: VerifyInput): Promise<MathResult>;
  readFormula(imageBase64: string): Promise<FormulaReading>;
}

export function createMathClient(baseUrl: string): MathClient {
  return {
    async health() {
      try {
        const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
        return response.ok;
      } catch {
        return false;
      }
    },
    async readFormula(imageBase64) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/ocr`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ imageBase64 }),
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        throw new MathUnavailableError();
      }
      if (response.status === 422) {
        const body = (await response.json()) as { error?: { message?: string } };
        throw new UnreadableImageError(body.error?.message ?? "No pude leer la fórmula.");
      }
      if (!response.ok) throw new MathUnavailableError();
      return (await response.json()) as FormulaReading;
    },
    async verify(input) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/verify`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(6000),
        });
      } catch {
        throw new MathUnavailableError();
      }
      if (response.status === 422) {
        return emptyResult("No pude leer la expresión.", "parse_error");
      }
      if (response.status === 504) {
        return emptyResult("La verificación superó el tiempo límite.", "timeout");
      }
      if (!response.ok) throw new MathUnavailableError();
      const body = (await response.json()) as Partial<MathResult>;
      return {
        valid: Boolean(body.valid),
        reason: body.reason ?? "",
        counterexample: body.counterexample ?? null,
        misconception: body.misconception ?? null,
        nextStepLatex: body.nextStepLatex ?? null,
        status: body.status === "unverifiable" ? "unverifiable" : "ok",
      };
    },
  };
}

function emptyResult(reason: string, status: MathResult["status"]): MathResult {
  return {
    valid: false,
    reason,
    counterexample: null,
    misconception: null,
    nextStepLatex: null,
    status,
  };
}

export function publicVerification(result: MathResult) {
  return {
    valid: result.valid,
    reason: result.reason,
    counterexample: result.counterexample,
    misconception: result.misconception,
  };
}
