import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createApp } from "../app.ts";
import type { AppConfig } from "../config.ts";
import type { LlmClient } from "../llm/client.ts";
import type { MathClient } from "../math/client.ts";
import { resetRateLimits } from "../rateLimit.ts";
import { resetSessions } from "../session/store.ts";
import type { MathResult } from "../types.ts";

const config: AppConfig = {
  port: 0,
  mathServiceUrl: "http://127.0.0.1:9",
  llmApiKey: "",
  llmBaseUrl: "http://127.0.0.1:9",
  llmModel: "test",
  llmVisionModel: "test",
  visionRateLimitPerMinute: 40,
  corsOrigin: "*",
  rateLimitPerMinute: 30,
  maxImageBytes: 1_500_000,
};

function jpeg(): string {
  const buf = Buffer.alloc(32, 0);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xc0;
  buf[6] = 8;
  buf.writeUInt16BE(240, 7);
  buf.writeUInt16BE(320, 9);
  return buf.toString("base64");
}

function mathResult(partial: Partial<MathResult> = {}): MathResult {
  return {
    valid: false,
    reason: "Falta un factor de la regla de la cadena.",
    counterexample: "x=1 → tu paso da 1 y no coincide",
    misconception: "chain_rule_omitted",
    nextStepLatex: String.raw`2x\cos(x^{2})`,
    status: "ok",
    ...partial,
  };
}

function clients(mathBody: MathResult = mathResult()) {
  const calls: unknown[] = [];
  const math: MathClient = {
    health: async () => true,
    verify: async (input) => {
      calls.push(input);
      return mathBody;
    },
  };
  const llm: LlmClient = {
    enabled: () => false,
    completeJson: async () => {
      throw new Error("no debe llamarse");
    },
  };
  return { math, llm, calls };
}

test("la raíz sirve la página de prueba", async () => {
  const { math, llm } = clients();
  const app = createApp({ config, math, llm });
  const response = await app.request("/");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Palafóbicos/);
});

beforeEach(() => {
  resetSessions();
  resetRateLimits();
});

test("verify no entrega el paso siguiente", async () => {
  const { math, llm } = clients();
  const app = createApp({ config, math, llm });
  const response = await app.request("/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ problem: "x^{2}", step: "x", relation: "next_valid" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.misconception, "chain_rule_omitted");
  assert.equal("nextStepLatex" in body, false);
  assert.equal("status" in body, false);
});

test("el tutor usa el veredicto simbólico y no filtra la respuesta", async () => {
  const { math, llm, calls } = clients();
  const app = createApp({ config, math, llm });
  const response = await app.request("/api/tutor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: "s1",
      problem: { latex: String.raw`\frac{d}{dx}\sin(x^{2})`, type: "derivative" },
      steps: [],
      studentMessage: "creo que es el coseno",
      proposedStep: String.raw`\cos(x^{2})`,
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.celebrate, false);
  assert.equal(body.diagnosis, "chain_rule_omitted");
  assert.equal(body.hintLevel, 0);
  assert.equal((body.question.match(/\?/g) ?? []).length, 1);
  assert.equal(JSON.stringify(body).includes("2x"), false);
  assert.equal(calls.length, 1);
});

test("confianza baja pide confirmación y no llama al verificador", async () => {
  const { math, llm, calls } = clients();
  const app = createApp({ config, math, llm });
  const response = await app.request("/api/tutor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: "low",
      problem: { latex: "x^{2}", type: "derivative" },
      steps: [{ id: "s1", latex: "2x?", bbox: [0, 0, 1, 1], confidence: 0.4 }],
      studentMessage: "revisar",
    }),
  });
  const body = await response.json();
  assert.equal(body.diagnosis, "confirmar_lectura");
  assert.match(body.question, /Leí bien/);
  assert.equal(calls.length, 0);
});

test("analyze manda el fotograma al modelo de visión y revisa los pasos", async () => {
  const { math, calls } = clients();
  let sawImage = "";
  let sawModel = "";
  const llm: LlmClient = {
    enabled: () => true,
    completeJson: async (message) => {
      sawImage = message.imageBase64 ?? "";
      sawModel = message.model;
      return {
        problem: { latex: String.raw`\frac{d}{dx}x^{2}`, type: "derivative" },
        steps: [{ id: "s1", latex: "2x", bbox: [0, 0, 1, 1], confidence: 0.9 }],
        legibility: "good",
      };
    },
  };
  const app = createApp({ config, math, llm });
  const response = await app.request("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "cam", imageBase64: jpeg() }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.problem.type, "derivative");
  assert.equal(body.steps.length, 1);
  assert.equal(body.steps[0].latex, "2x");
  assert.equal(body.checks[0].stepId, "s1");
  assert.equal(body.checks[0].verdict, "wrong");
  assert.match(body.checks[0].reason, /regla de la cadena/);
  assert.equal(calls.length, 2);
  assert.match(body.notes, /Confírmala/);
  assert.equal(sawImage.length > 20, true);
  assert.equal(sawModel, "test");
  assert.equal(JSON.stringify(body).includes(String.raw`\cos(x^{2})`), false);
});

test("analyze no corrige un paso que leyó con poca confianza", async () => {
  const { math, calls } = clients();
  const llm: LlmClient = {
    enabled: () => true,
    completeJson: async () => ({
      problem: { latex: String.raw`\frac{d}{dx}x^{2}`, type: "derivative" },
      steps: [{ latex: "2x?", bbox: [0, 0.5, 1, 0.2], confidence: 0.3 }],
      legibility: "good",
    }),
  };
  const app = createApp({ config, math, llm });
  const response = await app.request("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "cam-low", imageBase64: jpeg() }),
  });
  const body = await response.json();
  assert.equal(body.checks[0].verdict, "unknown");
  assert.equal(calls.length, 0);
});

test("analyze avisa cuando la fórmula no se lee", async () => {
  const { math } = clients();
  const llm: LlmClient = {
    enabled: () => true,
    completeJson: async () => ({ problem: { latex: "  " }, legibility: "low" }),
  };
  const app = createApp({ config, math, llm });
  const response = await app.request("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "cam", imageBase64: jpeg() }),
  });
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.error.code, "unreadable");
});

test("rechaza una imagen demasiado grande en píxeles", async () => {
  const { math, llm } = clients();
  const app = createApp({ config, math, llm });
  const big = Buffer.alloc(32, 0);
  big[0] = 0xff;
  big[1] = 0xd8;
  big[2] = 0xff;
  big[3] = 0xc0;
  big.writeUInt16BE(2000, 7);
  big.writeUInt16BE(10, 9);
  const response = await app.request("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "cam", imageBase64: big.toString("base64") }),
  });
  assert.equal(response.status, 413);
});

test("limita la tasa", async () => {
  const { math, llm } = clients();
  const app = createApp({ config: { ...config, rateLimitPerMinute: 2 }, math, llm });
  const post = () =>
    app.request("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ problem: "x", step: "x", relation: "equivalent" }),
    });
  assert.equal((await post()).status, 200);
  assert.equal((await post()).status, 200);
  assert.equal((await post()).status, 429);
});

test("una salida del modelo con dos preguntas se descarta", async () => {
  const { math } = clients();
  const llm: LlmClient = {
    enabled: () => true,
    completeJson: async () => ({ question: "¿Por qué? ¿Y luego qué?" }),
  };
  const app = createApp({ config: { ...config, llmApiKey: "k" }, math, llm });
  const response = await app.request("/api/tutor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: "llm",
      problem: { latex: "x^{2}", type: "derivative" },
      proposedStep: "x",
      studentMessage: "así",
    }),
  });
  const body = await response.json();
  assert.equal((body.question.match(/\?/g) ?? []).length, 1);
  assert.doesNotMatch(body.question, /luego/);
});
