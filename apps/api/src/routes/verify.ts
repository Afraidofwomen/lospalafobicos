import type { Context } from "hono";
import { type MathClient, publicVerification } from "../math/client.ts";
import { errorBody, verifyRequestSchema } from "../schemas.ts";
import { readJson } from "./analyze.ts";

export async function verify(c: Context, math: MathClient): Promise<Response> {
  const raw = await readJson(c);
  if (raw instanceof Response) return raw;
  const parsed = verifyRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json(errorBody("validation_error", "La petición no cumple el esquema."), 400);
  }
  const result = await math.verify(parsed.data);
  if (result.status === "parse_error") {
    return c.json(errorBody("parse_error", result.reason), 422);
  }
  if (result.status === "timeout") {
    return c.json(errorBody("timeout", result.reason), 504);
  }
  return c.json(publicVerification(result));
}
