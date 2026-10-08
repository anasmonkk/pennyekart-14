import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readUtilityReminderPause, useUtilityReminderPause } from "./utilityReminderPause";

describe("utility reminder pause", () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-08T10:26:00Z")); });
  afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

  it("pauses for exactly 12 hours and resumes automatically at the deadline", () => {
    const { result } = renderHook(() => useUtilityReminderPause("seller-a"));
    act(() => result.current.setPaused(true));
    expect(result.current.pausedUntil).toBe(Date.now() + 43_200_000);
    act(() => vi.advanceTimersByTime(43_199_999));
    expect(result.current.paused).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.paused).toBe(false);
    expect(readUtilityReminderPause("seller-a")).toBe(0);
  });

  it("keeps the pause after reopening and only for that seller", () => {
    const first = renderHook(() => useUtilityReminderPause("seller-a"));
    act(() => first.result.current.setPaused(true));
    const until = first.result.current.pausedUntil;
    first.unmount();
    const reopened = renderHook(() => useUtilityReminderPause("seller-a"));
    expect(reopened.result.current.pausedUntil).toBe(until);
    expect(reopened.result.current.paused).toBe(true);
    expect(readUtilityReminderPause("seller-b")).toBe(0);
  });

  it("allows reminders to be turned back on before 12 hours", () => {
    const { result } = renderHook(() => useUtilityReminderPause("seller-a"));
    act(() => result.current.setPaused(true));
    act(() => result.current.setPaused(false));
    expect(result.current.paused).toBe(false);
    expect(readUtilityReminderPause("seller-a")).toBe(0);
  });
});