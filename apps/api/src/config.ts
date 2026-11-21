export interface AppConfig {
  port: number;
  mathServiceUrl: string;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  llmVisionModel: string;
  visionRateLimitPerMinute: number;
  corsOrigin: string;
  rateLimitPerMinute: number;
  maxImageBytes: number;
}

function integer(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: integer(env.PORT, 8787),
    mathServiceUrl: (env.MATH_SERVICE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, ""),
    llmApiKey: env.LLM_API_KEY ?? "",
    llmBaseUrl: (env.LLM_BASE_URL?.trim() || "https://ai-gateway.vercel.sh/v1").replace(/\/$/, ""),
    llmModel: env.LLM_MODEL?.trim() || "google/gemini-3.5-flash-lite",
    llmVisionModel: env.LLM_VISION_MODEL?.trim() || "google/gemini-3.5-flash-lite",
    visionRateLimitPerMinute: Math.max(integer(env.RATE_LIMIT_PER_MINUTE, 30), 40),
    corsOrigin: env.CORS_ORIGIN ?? "*",
    rateLimitPerMinute: integer(env.RATE_LIMIT_PER_MINUTE, 30),
    maxImageBytes: integer(env.MAX_IMAGE_BYTES, 1_500_000),
  };
}
