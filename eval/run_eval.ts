import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createEmptySession } from "../apps/api/src/session/store.ts";
import { leaksSecret, questionCount, wordCount } from "../apps/api/src/tutor/text.ts";
import { runTutorTurn } from "../apps/api/src/tutor/turn.ts";
import type { MathResult, ProblemType, Session } from "../apps/api/src/types.ts";

const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;

interface ErrorCase {
  latex: string;
  misconception: string | null;
  message: string;
}

interface Problem {
  id: string;
  topic: ProblemType;
  statement: string;
  problemLatex: string;
  solutionLatex: string;
  correctStep: string;
  type?: ProblemType;
  errors: ErrorCase[];
}

interface Tallies {
  turns: number;
  leaks: number;
  badQuestions: number;
  diagnosisHits: number;
  diagnosisTotal: number;
  contradictions: number;
  words: number;
}

const tallies: Tallies = {
  turns: 0,
  leaks: 0,
  badQuestions: 0,
  diagnosisHits: 0,
  diagnosisTotal: 0,
  contradictions: 0,
  words: 0,
};

async function main() {
  const problems = readFileSync(new URL("./problems.jsonl", import.meta.url), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Problem);
  if (problems.length < 40) throw new Error(`hacen falta ejercicios: ${problems.length}`);
  const child = await ensureMath();
  try {
    for (const problem of problems) {
      await runProblem(problem);
    }
  } finally {
    child?.kill();
  }
  const meanWords = tallies.words / Math.max(1, tallies.turns);
  const diagnosis = tallies.diagnosisHits / Math.max(1, tallies.diagnosisTotal);
  const leakRate = tallies.leaks / Math.max(1, tallies.turns);
  const report = [
    "# Evaluación del tutor",
    "",
    `Ejercicios: ${problems.length}. Turnos: ${tallies.turns}.`,
    "",
    "| Métrica | Resultado | Meta |",
    "|---|---|---|",
    `| Filtración de la respuesta final antes del nivel 5 | ${(leakRate * 100).toFixed(1)} % | 0 % |`,
    `| Preguntas por turno distintas de 1 | ${tallies.badQuestions} | 0 |`,
    `| Concordancia del diagnóstico | ${(diagnosis * 100).toFixed(1)} % | ≥ 80 % |`,
    `| Veredicto contradice a SymPy | ${tallies.contradictions} | 0 |`,
    `| Longitud media de la respuesta | ${meanWords.toFixed(1)} palabras | ≤ 40 |`,
    "",
    "La pregunta la arma el servidor a partir del veredicto de SymPy. Si hay `LLM_API_KEY`, el modelo solo puede reemplazarla cuando cumple las mismas reglas.",
    "",
  ].join("\n");
  writeFileSync(new URL("./REPORT.md", import.meta.url), report);
  console.log(report);
  const ok = tallies.leaks === 0 && tallies.badQuestions === 0 && diagnosis >= 0.8 && tallies.contradictions === 0 && meanWords <= 40;
  if (!ok) process.exitCode = 1;
}

async function runProblem(problem: Problem) {
  const correct = await verify(problem, problem.correctStep);
  if (!correct.valid) {
    throw new Error(`${problem.id}: el paso correcto no verificó (${correct.misconception ?? correct.reason})`);
  }
  recordTutor(problem, correct, problem.correctStep, "así queda", null);
  for (const error of problem.errors) {
    let session = createEmptySession(problem.id);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const verification = await verify(problem, error.latex);
      session = recordTutor(problem, verification, error.latex, error.message, error.misconception ?? "sin_clasificar", session);
      if (session.hintLevel === 5) break;
    }
  }
}

function recordTutor(
  problem: Problem,
  verification: MathResult,
  step: string,
  message: string,
  expectedDiagnosis: string | null,
  session: Session = createEmptySession(`${problem.id}-ok`),
): Session {
  const turn = runTutorTurn({
    session,
    problem: { latex: problem.problemLatex, ...(problem.type ? { type: problem.type } : { type: problem.topic }) },
    steps: [{ id: "s1", latex: step, confidence: 0.95 }],
    studentMessage: message,
    verification,
  });
  const question = turn.response.question;
  const overlay = turn.response.overlay.map((item) => item.text).join(" ");
  tallies.turns += 1;
  tallies.words += wordCount(question);
  if (questionCount(question) !== 1) tallies.badQuestions += 1;
  if (turn.response.hintLevel < 5) {
    const blob = `${question}\n${overlay}`;
    if (leaksSecret(blob, problem.solutionLatex, turn.response.hintLevel) || leaksSecret(blob, verification.nextStepLatex, turn.response.hintLevel)) {
      tallies.leaks += 1;
    }
  }
  if (verification.status === "ok") {
    const contradicts = (verification.valid && !turn.response.celebrate) || (!verification.valid && turn.response.celebrate);
    if (contradicts) tallies.contradictions += 1;
  }
  if (expectedDiagnosis) {
    tallies.diagnosisTotal += 1;
    if (turn.response.diagnosis === expectedDiagnosis) tallies.diagnosisHits += 1;
  }
  return turn.session;
}

async function verify(problem: Problem, step: string): Promise<MathResult> {
  const response = await fetch(`${BASE}/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      problem: problem.problemLatex,
      step,
      relation: "next_valid",
      ...(problem.type ? { type: problem.type } : {}),
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`verify ${problem.id} falló (${response.status}): ${detail}`);
  }
  const body = (await response.json()) as Omit<MathResult, "status"> & { status?: MathResult["status"] };
  return {
    valid: body.valid,
    reason: body.reason,
    counterexample: body.counterexample,
    misconception: body.misconception,
    nextStepLatex: body.nextStepLatex,
    status: body.status ?? "ok",
  };
}

async function ensureMath(): Promise<ChildProcess | null> {
  if (await healthy()) return null;
  const python = "services/math/.venv/bin/python";
  const child = spawn(
    python,
    ["-m", "uvicorn", "main:app", "--app-dir", "services/math", "--host", "127.0.0.1", "--port", String(PORT)],
    { stdio: "ignore" },
  );
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await healthy()) return child;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill();
  throw new Error("el servicio matemático no arrancó");
}

async function healthy(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(500) });
    return response.ok;
  } catch {
    return false;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
