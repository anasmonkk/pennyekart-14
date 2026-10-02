/**
 * Bridges native push-notification taps to React Router.
 * A tap can arrive before the router mounts (cold start), so the target is
 * stored (memory + localStorage) and consumed once the router is ready.
 */
const KEY = "pennyekart_pending_push_nav";
type Navigator = (url: string) => void;

let navigator: Navigator | null = null;
let pending: string | null = null;

const isSafeInternal = (url: unknown): url is string =>
  typeof url === "string" && url.startsWith("/") && !url.startsWith("//");

/** Resolve the target URL from an FCM data payload. */
export const pushTargetFromData = (data: Record<string, unknown> | undefined): string | null => {
  if (!data) return null;
  if (isSafeInternal(data.url)) return data.url;
  const orderId = (data.orderId ?? data.order_id) as string | undefined;
  if (typeof orderId === "string" && orderId) {
    return `/selling-partner/dashboard?tab=orders&order=${encodeURIComponent(orderId)}`;
  }
  return null;
};

/** Called from the native tap listener. Navigates now, or queues for later. */
export const requestPushNavigation = (url: string) => {
  if (!isSafeInternal(url)) return;
  if (navigator) {
    navigator(url);
    return;
  }
  pending = url;
  try { localStorage.setItem(KEY, url); } catch { /* ignore */ }
};

/** Called once the router is mounted. Returns a cleanup function. */
export const registerPushNavigator = (nav: Navigator) => {
  navigator = nav;
  let target = pending;
  if (!target) {
    try { target = localStorage.getItem(KEY); } catch { /* ignore */ }
  }
  pending = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  if (isSafeInternal(target)) nav(target);
  return () => {
    if (navigator === nav) navigator = null;
  };
};
