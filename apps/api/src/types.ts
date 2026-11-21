export const PROBLEM_TYPES = [
  "limit",
  "continuity",
  "derivative",
  "integral",
  "optimization",
  "related_rates",
  "other",
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];
export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type Relation = "equivalent" | "next_valid";
export type Outcome = "correct" | "incorrect" | "frustration" | "unreadable" | "chat";

export interface Step {
  id: string;
  latex: string;
  bbox?: [number, number, number, number];
  confidence?: number;
}

export interface MathResult {
  valid: boolean;
  reason: string;
  counterexample: string | null;
  misconception: string | null;
  nextStepLatex: string | null;
  status: "ok" | "unverifiable" | "parse_error" | "timeout";
}

export interface OverlayItem {
  targetStepId: string;
  type: "highlight" | "underline" | "arrow" | "note";
  text: string;
  color: "amber" | "green";
}

export interface TutorResponse {
  hintLevel: HintLevel;
  question: string;
  overlay: OverlayItem[];
  diagnosis: string | null;
  celebrate: boolean;
}

export interface HistoryTurn {
  role: "student" | "tutor";
  text: string;
  hintLevel: HintLevel;
}

export interface Session {
  id: string;
  hintLevel: HintLevel;
  wrongStreak: number;
  failedAttempts: number;
  subgoal: number;
  warm: boolean;
  history: HistoryTurn[];
  misconceptions: string[];
  updatedAt: number;
}
