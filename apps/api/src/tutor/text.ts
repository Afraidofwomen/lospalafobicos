import type { HintLevel } from "../types.ts";

const FRUSTRATION =
  /no\s*s[eé]|no\s+entiendo|ayuda|no\s+puedo|me\s+rindo|estoy\s+perdid[oa]|ni\s+idea/i;

const INCORRECT_TONE = /incorrecto|est[aá]\s+mal|te equivoc|mal hecho/i;
const GIVEAWAY = /la respuesta|el resultado es|la soluci[oó]n|siguiente paso:/i;

export function isFrustration(message: string): boolean {
  return FRUSTRATION.test(message);
}

export function looksLikeMath(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 300) return false;
  if (/\\[a-zA-Z]/.test(trimmed)) return true;
  if (/[\^_]/.test(trimmed)) return true;
  if (/=/.test(trimmed) && /[0-9a-zA-Z]/.test(trimmed)) return true;
  if (/^[0-9a-zA-Z+\-*/().,\s^]+$/.test(trimmed) && /\d/.test(trimmed) && trimmed.length <= 80) {
    return true;
  }
  return false;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function questionCount(text: string): number {
  return [...text].filter((character) => character === "?").length;
}

export function saysIncorrect(text: string): boolean {
  return INCORRECT_TONE.test(text);
}

export function normalizeMath(value: string): string {
  return value
    .toLowerCase()
    .replace(/\\left|\\right/g, "")
    .replace(/[{}\\\s]/g, "");
}

export function leaksSecret(text: string, secret: string | null, level: HintLevel): boolean {
  if (level >= 5 || !secret) return false;
  if (GIVEAWAY.test(text)) return true;
  const normalized = normalizeMath(secret);
  if (normalized.length < 8) return false;
  return normalizeMath(text).includes(normalized);
}

export function guessVariable(latex: string): string {
  return latex.match(/\\frac\{d\}\{d([a-z])\}/)?.[1] ?? "x";
}

export function pointFrom(counterexample: string | null): string | null {
  return counterexample?.match(/[a-z]=([+-]?\d+(?:\.\d+)?)/)?.[1] ?? null;
}
