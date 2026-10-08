import { useEffect, useState } from "react";

export const UTILITY_REMINDER_PAUSE_MS = 12 * 60 * 60 * 1000;
const storageKey = (userId: string) => `utility_reminders_paused_until_${userId}`;

export function readUtilityReminderPause(userId?: string): number {
  if (!userId) return 0;
  try {
    const value = Number(localStorage.getItem(storageKey(userId)));
    return Number.isFinite(value) && value > Date.now() ? value : 0;
  } catch {
    return 0;
  }
}

export function useUtilityReminderPause(userId?: string) {
  const [saved, setSaved] = useState<{ userId?: string; until: number }>({ userId, until: readUtilityReminderPause(userId) });
  const pausedUntil = saved.userId === userId ? saved.until : readUtilityReminderPause(userId);
  const paused = pausedUntil > Date.now();

  useEffect(() => {
    if (!paused) return;
    const timer = window.setTimeout(() => {
      setSaved({ userId, until: 0 });
      if (userId) {
        try { localStorage.removeItem(storageKey(userId)); } catch { /* Memory state still resumes. */ }
      }
    }, Math.max(0, pausedUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [userId, paused, pausedUntil]);

  const setPaused = (next: boolean) => {
    if (!userId) return;
    const until = next ? Date.now() + UTILITY_REMINDER_PAUSE_MS : 0;
    try {
      if (next) localStorage.setItem(storageKey(userId), String(until));
      else localStorage.removeItem(storageKey(userId));
    } catch { /* Keep the control usable when storage is unavailable. */ }
    setSaved({ userId, until });
  };

  return { paused, pausedUntil, setPaused };
}