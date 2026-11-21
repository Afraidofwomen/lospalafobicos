import type { HintLevel, Outcome, OverlayItem, ProblemType, Step } from "../types.ts";
import { pointFrom } from "./text.ts";

export interface QuestionContext {
  level: HintLevel;
  warm: boolean;
  outcome: Outcome;
  topic?: ProblemType;
  misconception: string | null;
  counterexample: string | null;
  variable: string;
  lowConfidenceLatex: string | null;
  nextStepLatex: string | null;
}

export function buildQuestion(ctx: QuestionContext): string {
  const core = coreQuestion(ctx);
  if (ctx.warm && ctx.outcome !== "correct" && ctx.outcome !== "unreadable") {
    return `Vamos paso a paso. ${core}`;
  }
  return core;
}

function coreQuestion(ctx: QuestionContext): string {
  if (ctx.outcome === "unreadable") return confirmReading(ctx.lowConfidenceLatex);
  if (ctx.outcome === "correct") return "Eso cuadra. ¿Por qué puedes aplicar esa regla aquí?";
  if (ctx.level === 0) return "¿Cómo planeas empezar este ejercicio?";
  if (ctx.level === 1) return levelOne(ctx.topic);
  if (ctx.level === 2) return levelTwo(ctx.misconception);
  if (ctx.level === 3) {
    const point = pointFrom(ctx.counterexample) ?? "0";
    return `¿Qué obtienes si sustituyes ${ctx.variable} = ${point} y comparas?`;
  }
  if (ctx.level === 4) return levelFour(ctx.misconception, ctx.topic);
  return levelFive(ctx.nextStepLatex);
}

function confirmReading(latex: string | null): string {
  if (!latex) return "¿Puedes confirmar o reescribir el paso que no se lee bien?";
  const cleaned = latex.replaceAll("?", "").trim();
  const question = `¿Leí bien esto: ${cleaned}?`;
  if (question.split(/\s+/).length <= 40) return question;
  return "¿Puedes confirmar o reescribir el paso que no se lee bien?";
}

function levelOne(topic: ProblemType | undefined): string {
  if (topic === "derivative" || topic === "optimization" || topic === "related_rates") {
    return "¿Qué regla de derivación encaja con esta función?";
  }
  if (topic === "integral") return "¿Qué método de integración probarías primero?";
  if (topic === "limit" || topic === "continuity") {
    return "¿Qué le pasa a la expresión al acercarse al punto?";
  }
  return "¿Qué tipo de función es y qué herramienta usarías?";
}

function levelTwo(misconception: string | null): string {
  switch (misconception) {
    case "product_rule_incomplete":
      return "Una parte del producto ya está. ¿Qué término falta?";
    case "product_of_derivatives":
      return "Multiplicar las derivadas sueltas cambia la regla. ¿Qué forma tiene el producto?";
    case "chain_rule_omitted":
      return "Hay una función dentro de otra. ¿Qué más hay que tener en cuenta?";
    case "quotient_sign":
      return "El signo del cociente es delicado. ¿Dónde iría el menos?";
    case "quotient_denominator":
      return "Mira el denominador del cociente. ¿Qué potencia debería tener?";
    case "missing_integration_constant":
      return "La antiderivada va encaminada. ¿Qué falta para la familia completa?";
    case "power_rule_exponent":
    case "power_rule_coefficient":
      return "La potencia no quedó cerrada. ¿Qué le pasa al exponente?";
    case "operator_not_applied":
      return "La operación todavía no tocó la expresión. ¿Qué le harías?";
    case "sign_error":
      return "Un signo está moviendo el resultado. ¿Cuál revisarías?";
    case "indeterminate_form":
      return "Sustituir directo aquí no alcanza. ¿Qué forma aparece?";
    default:
      return "Miremos el último paso. ¿Ese término sigue la regla que elegiste?";
  }
}

function levelFour(misconception: string | null, topic: ProblemType | undefined): string {
  switch (misconception) {
    case "chain_rule_omitted":
      return "La regla de la cadena pide multiplicar por la derivada interior. ¿Qué factor falta?";
    case "product_rule_incomplete":
    case "product_of_derivatives":
      return "La regla del producto es u'v + uv'. ¿Cómo la usarías aquí?";
    case "quotient_sign":
    case "quotient_denominator":
      return "La regla del cociente lleva un signo menos. ¿Dónde iría en este caso?";
    case "missing_integration_constant":
      return "Una integral indefinida incluye una constante. ¿Qué término falta al final?";
    case "power_rule_exponent":
    case "power_rule_coefficient":
      return "La regla de la potencia baja el exponente y multiplica. ¿Qué parte revisarías?";
    default:
      break;
  }
  if (topic === "integral") {
    return "Hay una técnica de integración en juego. ¿Cuál nombrarías, sin aplicarla aún?";
  }
  if (topic === "limit" || topic === "continuity") {
    return "Este límite pide un método, no sustituir a ciegas. ¿Cuál usarías?";
  }
  return "Hay una regla que aplica aquí, sin usarla todavía. ¿Cuál nombrarías?";
}

function levelFive(nextStepLatex: string | null): string {
  if (!nextStepLatex) return "¿Puedes escribir solo el siguiente paso y dejar el resto para después?";
  return `Siguiente paso: ${nextStepLatex}. ¿Puedes continuar desde aquí?`;
}

export function buildOverlay(
  level: HintLevel,
  outcome: Outcome,
  steps: Step[],
): OverlayItem[] {
  // Sin pasos leídos de la foto, el cliente ancla la marca al enunciado.
  const target = steps.at(-1) ?? { id: "problem" };
  if (outcome === "unreadable") {
    return [{ targetStepId: target.id, type: "note", text: "¿Es esto lo que escribiste?", color: "amber" }];
  }
  if (outcome === "correct") {
    return [{ targetStepId: target.id, type: "underline", text: "Este paso cuadra.", color: "green" }];
  }
  if (level >= 2 && outcome === "incorrect") {
    return [{ targetStepId: target.id, type: "highlight", text: "¿Revisaste este término?", color: "amber" }];
  }
  if (level >= 3) {
    return [{ targetStepId: target.id, type: "arrow", text: "Prueba un valor concreto.", color: "amber" }];
  }
  return [];
}
