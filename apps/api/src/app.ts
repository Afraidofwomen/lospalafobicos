import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig, type AppConfig } from "./config.ts";
import { createLlmClient, LlmNotConfiguredError, VisionUnavailableError, type LlmClient } from "./llm/client.ts";
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
  const visionLimit = rateLimit(deps.config.visionRateLimitPerMinute);

  app.get("/", (c) => c.html(demoPage()));
  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/api/health", async (c) => c.json({ ok: true, math: await math.health() }));
  app.post("/api/analyze", visionLimit, (c) => analyze(c, deps.config, llm));
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
      return c.json(errorBody("math_unavailable", "El verificador no está disponible."), 503);
    }
    if (err instanceof VisionUnavailableError) {
      return c.json(errorBody("vision_unavailable", "El modelo que ve las fórmulas no está disponible."), 503);
    }
    if (err instanceof LlmNotConfiguredError) {
      const message = err.message === "rejected"
        ? "La clave del modelo en la nube fue rechazada."
        : "El modelo en la nube no está configurado.";
      return c.json(errorBody("llm_not_configured", message), 503);
    }
    console.error(err);
    return c.json(errorBody("internal_error", "Error interno."), 500);
  });

  return app;
}

function demoPage(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../public/index.html"),
    join(here, "public/index.html"),
    join(process.cwd(), "public/index.html"),
    join(process.cwd(), "apps/api/public/index.html"),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, "utf8");
    } catch {
      continue;
    }
  }
  return "<p>No encontré la página de prueba.</p>";
}

const app = createApp({ config: loadConfig() });

export default app;
