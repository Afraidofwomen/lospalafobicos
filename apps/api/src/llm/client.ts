import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "../config.ts";

const here = dirname(fileURLToPath(import.meta.url));

export class LlmNotConfiguredError extends Error {
  constructor() {
    super("llm not configured");
    this.name = "LlmNotConfiguredError";
  }
}

export interface LlmMessage {
  system: string;
  user: string;
  imageBase64?: string;
  model: string;
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
    enabled: () => config.llmApiKey.length > 0,
    async completeJson(message) {
      if (!config.llmApiKey) throw new LlmNotConfiguredError();
      const content = message.imageBase64
        ? [
            { type: "text", text: message.user },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${message.imageBase64}` } },
          ]
        : message.user;
      const response = await fetch(`${config.llmBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.llmApiKey}`,
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
      if (!response.ok) {
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

export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("el modelo no devolvió JSON");
    return JSON.parse(match[0]);
  }
}
