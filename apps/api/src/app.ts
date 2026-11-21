import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppConfig } from "./config.ts";
import { createLlmClient, LlmNotConfiguredError, type LlmClient } from "./llm/client.ts";
import { createMathClient, MathUnavailableError, type MathClient } from "./math/client.ts";
import { rateLimit } from "./rateLimit.ts";
import { analyze } from "./routes/analyze.ts";
import { tutor } from "./routes/tutor.ts";
import { verify } from "./routes/verify.ts";
import { errorBody } from "./schemas.ts";
import { deleteSession } from "./session/store.ts";
import { ZodError } from "zod";

export interface AppDeps {
  config: AppConfig;
  math?: MathClient;
  llm?: LlmClient;
}

export function createApp(deps: AppDeps) {
  const math = deps.math ?? createMathClient(deps.config.mathServiceUrl);
  const llm = deps.llm ?? createLlmClient(deps.config);
  const app = new Hono();
  const origin = deps.config.corsOrigin === "*" ? "*" : deps.config.corsOrigin.split(",").map((item) => item.trim());
  app.use("*", cors({ origin, allowMethods: ["GET", "POST", "DELETE", "OPTIONS"] }));
  const limit = rateLimit(deps.config.rateLimitPerMinute);

  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/api/health", async (c) => c.json({ ok: true, math: await math.health() }));
  app.post("/api/analyze", limit, (c) => analyze(c, deps.config, llm));
  app.post("/api/verify", limit, (c) => verify(c, math));
  app.post("/api/tutor", limit, (c) => tutor(c, deps.config, math, llm));
  app.delete("/api/session/:id", (c) => {
    deleteSession(c.req.param("id"));
    return c.json({ ok: true });
  });

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json(errorBody("validation_error", "La petición no cumple el esquema."), 400);
    }
    if (err instanceof MathUnavailableError) {
      return c.json(errorBody("math_unavailable", "El verificador simbólico no está disponible."), 503);
    }
    if (err instanceof LlmNotConfiguredError) {
      return c.json(errorBody("llm_not_configured", "Falta LLM_API_KEY en el servidor."), 503);
    }
    console.error(err);
    return c.json(errorBody("internal_error", "Error interno."), 500);
  });

  return app;
}
