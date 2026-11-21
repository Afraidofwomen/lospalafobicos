import type { Session } from "../types.ts";

const sessions = new Map<string, Session>();
const SIX_HOURS = 6 * 60 * 60 * 1000;

export function createEmptySession(id: string): Session {
  return {
    id,
    hintLevel: 0,
    wrongStreak: 0,
    failedAttempts: 0,
    subgoal: 0,
    warm: false,
    history: [],
    misconceptions: [],
    updatedAt: Date.now(),
  };
}

export function getOrCreateSession(id: string): Session {
  prune();
  const existing = sessions.get(id);
  if (existing) return existing;
  const created = createEmptySession(id);
  sessions.set(id, created);
  return created;
}

export function saveSession(session: Session): void {
  sessions.set(session.id, { ...session, updatedAt: Date.now() });
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}

export function resetSessions(): void {
  sessions.clear();
}

function prune(): void {
  const cutoff = Date.now() - SIX_HOURS;
  for (const [id, session] of sessions) {
    if (session.updatedAt < cutoff) sessions.delete(id);
  }
}
