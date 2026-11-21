import type { MathResult, ProblemType, Relation } from "../types.ts";

export class MathUnavailableError extends Error {
  constructor() {
    super("math unavailable");
    this.name = "MathUnavailableError";
  }
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
