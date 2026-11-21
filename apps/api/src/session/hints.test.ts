import assert from "node:assert/strict";
import { test } from "node:test";
import { transition, type HintState } from "./hints.ts";

const start: HintState = { hintLevel: 0, wrongStreak: 0, failedAttempts: 0, warm: false };

test("dos errores seguidos suben un nivel", () => {
  const once = transition(start, "incorrect");
  assert.equal(once.hintLevel, 0);
  assert.equal(once.wrongStreak, 1);
  const twice = transition(once, "incorrect");
  assert.equal(twice.hintLevel, 1);
  assert.equal(twice.wrongStreak, 0);
});

test("una respuesta correcta baja un nivel y avanza el subobjetivo", () => {
  const moved = transition({ ...start, hintLevel: 3 }, "correct");
  assert.equal(moved.hintLevel, 2);
  assert.equal(moved.subgoalDelta, 1);
  assert.equal(moved.failedAttempts, 0);
});

test("el nivel no pasa de 5 ni baja de 0", () => {
  const top = transition({ ...start, hintLevel: 5, wrongStreak: 1 }, "incorrect");
  assert.equal(top.hintLevel, 5);
  const floor = transition(start, "correct");
  assert.equal(floor.hintLevel, 0);
});

test("la frustración sube un nivel y calienta el tono", () => {
  const next = transition(start, "frustration");
  assert.equal(next.hintLevel, 1);
  assert.equal(next.warm, true);
});

test("un mensaje sin intento no sube el nivel", () => {
  const next = transition({ ...start, wrongStreak: 1 }, "chat");
  assert.equal(next.hintLevel, 0);
  assert.equal(next.wrongStreak, 0);
});

test("una lectura ilegible no cambia el nivel", () => {
  const next = transition({ ...start, hintLevel: 2, wrongStreak: 1 }, "unreadable");
  assert.equal(next.hintLevel, 2);
  assert.equal(next.wrongStreak, 1);
});
