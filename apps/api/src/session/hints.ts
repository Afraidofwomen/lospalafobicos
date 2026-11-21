import type { HintLevel, Outcome } from "../types.ts";

export interface HintState {
  hintLevel: HintLevel;
  wrongStreak: number;
  failedAttempts: number;
  warm: boolean;
}

export function clampLevel(level: number): HintLevel {
  return Math.max(0, Math.min(5, level)) as HintLevel;
}

export function transition(state: HintState, outcome: Outcome): HintState & { subgoalDelta: number } {
  if (outcome === "correct") {
    return {
      hintLevel: clampLevel(state.hintLevel - 1),
      wrongStreak: 0,
      failedAttempts: 0,
      warm: false,
      subgoalDelta: 1,
    };
  }
  if (outcome === "unreadable") {
    return { ...state, subgoalDelta: 0 };
  }
  if (outcome === "chat") {
    return { ...state, wrongStreak: 0, subgoalDelta: 0 };
  }
  if (outcome === "frustration") {
    return {
      hintLevel: clampLevel(state.hintLevel + 1),
      wrongStreak: 0,
      failedAttempts: 0,
      warm: true,
      subgoalDelta: 0,
    };
  }
  const failedAttempts = state.failedAttempts + 1;
  const wrongStreak = state.wrongStreak + 1;
  if (wrongStreak >= 2 || failedAttempts >= 3) {
    return {
      hintLevel: clampLevel(state.hintLevel + 1),
      wrongStreak: 0,
      failedAttempts: 0,
      warm: failedAttempts >= 3,
      subgoalDelta: 0,
    };
  }
  return {
    hintLevel: state.hintLevel,
    wrongStreak,
    failedAttempts,
    warm: false,
    subgoalDelta: 0,
  };
}
