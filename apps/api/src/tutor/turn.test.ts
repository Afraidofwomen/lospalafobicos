import assert from "node:assert/strict";
import { test } from "node:test";
import { createEmptySession } from "../session/store.ts";
import type { MathResult, Session } from "../types.ts";
import { questionCount, saysIncorrect, wordCount } from "./text.ts";
import { runTutorTurn } from "./turn.ts";

const secret = String.raw`2x\sin x+x^{2}\cos x`;

function wrong(): MathResult {
  return {
    valid: false,
    reason: "Falta un término de la regla del producto.",
    counterexample: "x=1 → tu paso da 2 y no coincide",
    misconception: "product_rule_incomplete",
    nextStepLatex: secret,
    status: "ok",
  };
}

function turn(session: Session, verification: MathResult | null, message = "pruebo esto") {
  return runTutorTurn({
    session,
    problem: { latex: String.raw`\frac{d}{dx}(x^{2}\sin x)`, type: "derivative" },
    steps: [{ id: "s1", latex: "2x\\cos x", confidence: 0.95 }],
    studentMessage: message,
    verification,
  });
}

test("cada turno hace una sola pregunta y no dice incorrecto", () => {
  let session = createEmptySession("t");
  const samples = [
    turn(session, null, "no sé"),
    turn(session, wrong()),
    turn(session, { ...wrong(), valid: true, misconception: null }),
    turn(session, { ...wrong(), status: "parse_error" }),
  ];
  for (const sample of samples) {
    assert.equal(questionCount(sample.response.question), 1);
    assert.equal(saysIncorrect(sample.response.question), false);
    assert.equal(saysIncorrect(sample.response.overlay.map((item) => item.text).join(" ")), false);
    session = sample.session;
  }
});

test("antes del nivel 5 no se filtra el paso siguiente", () => {
  let session = createEmptySession("leak");
  const seen: number[] = [];
  for (let index = 0; index < 10; index += 1) {
    const result = turn(session, wrong(), "sigue mal");
    seen.push(result.response.hintLevel);
    const blob = `${result.response.question} ${result.response.overlay.map((item) => item.text).join(" ")}`;
    if (result.response.hintLevel < 5) {
      assert.equal(blob.includes(secret), false);
      assert.equal(/siguiente paso:/i.test(blob), false);
      assert.ok(wordCount(result.response.question) <= 40);
    } else {
      assert.match(result.response.question, /Siguiente paso:/);
    }
    assert.equal(questionCount(result.response.question), 1);
    assert.equal(result.response.celebrate, false);
    assert.equal(result.response.diagnosis, "product_rule_incomplete");
    session = result.session;
  }
  assert.equal(seen.at(-1), 5);
  assert.ok(seen.filter((level) => level < 5).length >= 8);
});

test("un paso válido celebra y no contradice la verificación", () => {
  const result = turn(createEmptySession("ok"), {
    valid: true,
    reason: "El paso coincide con la derivada.",
    counterexample: null,
    misconception: null,
    nextStepLatex: secret,
    status: "ok",
  });
  assert.equal(result.response.celebrate, true);
  assert.equal(result.response.diagnosis, "avance");
  assert.equal(result.response.question.includes(secret), false);
});

test("la frustración pide con tono cálido y una sola pregunta", () => {
  const result = turn(createEmptySession("warm"), null, "no sé");
  assert.equal(result.response.hintLevel, 1);
  assert.match(result.response.question, /^Vamos paso a paso\. /);
  assert.equal(questionCount(result.response.question), 1);
  assert.equal(result.response.diagnosis, "frustracion");
});

test("poca legibilidad pide confirmación y no sube la pista", () => {
  const result = runTutorTurn({
    session: { ...createEmptySession("read"), hintLevel: 2 },
    problem: { latex: "x^{2}", type: "derivative" },
    steps: [{ id: "s1", latex: "2x?", confidence: 0.4 }],
    legibility: "low",
    studentMessage: "",
    verification: wrong(),
    lowConfidenceLatex: "2x?",
  });
  assert.equal(result.response.hintLevel, 2);
  assert.equal(result.response.diagnosis, "confirmar_lectura");
  assert.equal(result.response.celebrate, false);
  assert.equal(questionCount(result.response.question), 1);
});
