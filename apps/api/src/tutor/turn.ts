import type { MathResult, Outcome, ProblemType, Session, Step, TutorResponse } from "../types.ts";
import { transition } from "../session/hints.ts";
import { buildOverlay, buildQuestion } from "./questions.ts";
import { guessVariable, isFrustration, leaksSecret, questionCount, saysIncorrect } from "./text.ts";

export interface TurnInput {
  session: Session;
  problem: { latex: string; type?: ProblemType };
  steps: Step[];
  legibility?: "good" | "low";
  studentMessage: string;
  verification: MathResult | null;
  forceUnreadable?: boolean;
  lowConfidenceLatex?: string | null;
}

export function classifyTurn(input: TurnInput): Outcome {
  if (input.forceUnreadable || input.legibility === "low") return "unreadable";
  const verification = input.verification;
  if (!verification) {
    return isFrustration(input.studentMessage) ? "frustration" : "chat";
  }
  if (verification.status !== "ok") return "unreadable";
  return verification.valid ? "correct" : "incorrect";
}

export function runTutorTurn(input: TurnInput): { response: TutorResponse; session: Session } {
  const outcome = classifyTurn(input);
  const next = transition(input.session, outcome);
  const misconception = input.verification?.misconception ?? null;
  const question = buildQuestion({
    level: next.hintLevel,
    warm: next.warm,
    outcome,
    topic: input.problem.type,
    misconception,
    counterexample: input.verification?.counterexample ?? null,
    variable: guessVariable(input.problem.latex),
    lowConfidenceLatex: input.lowConfidenceLatex ?? null,
    nextStepLatex: next.hintLevel === 5 ? input.verification?.nextStepLatex ?? null : null,
  });
  const response: TutorResponse = {
    hintLevel: next.hintLevel,
    question,
    overlay: buildOverlay(next.hintLevel, outcome, input.steps),
    diagnosis: diagnosisFor(outcome, misconception),
    celebrate: outcome === "correct",
  };
  const misconceptions = [...input.session.misconceptions];
  if (misconception && !misconceptions.includes(misconception)) misconceptions.push(misconception);
  const session: Session = {
    ...input.session,
    hintLevel: next.hintLevel,
    wrongStreak: next.wrongStreak,
    failedAttempts: next.failedAttempts,
    subgoal: input.session.subgoal + next.subgoalDelta,
    warm: next.warm,
    history: [
      ...input.session.history,
      { role: "student" as const, text: input.studentMessage, hintLevel: input.session.hintLevel },
      { role: "tutor" as const, text: question, hintLevel: next.hintLevel },
    ].slice(-40),
    misconceptions,
    updatedAt: Date.now(),
  };
  return { response, session };
}

export function diagnosisFor(outcome: Outcome, misconception: string | null): string {
  if (outcome === "unreadable") return "confirmar_lectura";
  if (outcome === "frustration") return "frustracion";
  if (outcome === "correct") return "avance";
  if (outcome === "chat") return "exploracion";
  return misconception ?? "sin_clasificar";
}

export function questionIsSafe(
  question: string,
  level: TutorResponse["hintLevel"],
  secrets: Array<string | null>,
): boolean {
  if (questionCount(question) !== 1) return false;
  if (saysIncorrect(question)) return false;
  const words = question.trim().split(/\s+/).filter(Boolean).length;
  if (words > (level >= 5 ? 80 : 40)) return false;
  return secrets.every((secret) => !leaksSecret(question, secret, level));
}
