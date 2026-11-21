import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getVercelOidcToken } from "@vercel/oidc";
import type { AppConfig } from "../config.ts";

const here = dirname(fileURLToPath(import.meta.url));
const GATEWAY = "https://ai-gateway.vercel.sh/v1";

export class LlmNotConfiguredError extends Error {
  constructor(message = "llm not configured") {
    super(message);
    this.name = "LlmNotConfiguredError";
  }
}

export class VisionUnavailableError extends Error {
  constructor() {
    super("vision unavailable");
    this.name = "VisionUnavailableError";
  }
}

export interface LlmMessage {
  system: string;
  user: string;
  imageBase64?: string;
  model: string;
  oidcToken?: string;
}

export interface LlmClient {
  enabled(): boolean;
  completeJson(message: LlmMessage): Promise<unknown>;
}

export function tutorSystemPrompt(): string {
  return readFileSync(join(here, "../prompts/tutor_system.md"), "utf8");
}

export function visionSystemPrompt(): string {
  return readFileSync(join(here, "../prompts/vision_system.md"), "utf8");
}

export function createLlmClient(config: AppConfig): LlmClient {
  return {
    enabled: () =>
      config.llmApiKey.length > 0 ||
      Boolean(process.env.AI_GATEWAY_API_KEY?.trim()) ||
      Boolean(process.env.VERCEL) ||
      Boolean(process.env.VERCEL_OIDC_TOKEN),
    async completeJson(message) {
      const token = await bearer(config, message.oidcToken);
      const content = message.imageBase64
        ? [
            { type: "text", text: message.user },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${message.imageBase64}` } },
          ]
        : message.user;
      const request = () =>
        fetch(`${config.llmBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: message.model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: message.system },
              { role: "user", content },
            ],
          }),
          signal: AbortSignal.timeout(30_000),
        });
      let response = await request();
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        response = await request();
      }
      if (response.status === 401 || response.status === 403) {
        throw new LlmNotConfiguredError("rejected");
      }
      if (!response.ok) {
        if (message.imageBase64) throw new VisionUnavailableError();
        throw new Error(`llm status ${response.status}`);
      }
      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      return parseModelJson(text);
    },
  };
}

async function bearer(config: AppConfig, requestToken?: string): Promise<string> {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) return gatewayKey;
  if (config.llmApiKey && !config.llmBaseUrl.startsWith(GATEWAY)) return config.llmApiKey;
  if (requestToken) return requestToken;
  if (process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN || config.llmBaseUrl.startsWith(GATEWAY)) {
    try {
      const token = await getVercelOidcToken();
      if (token) return token;
    } catch {
      // Sin token de Vercel se usa la clave explícita, si existe.
    }
  }
  if (config.llmApiKey) return config.llmApiKey;
  throw new LlmNotConfiguredError();
}

function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("el modelo no devolvió JSON");
    return JSON.parse(match[0]);
  }
}
