export const SELLER_REMINDER_INTERVAL = 2 * 60 * 1000;
const NEW_STATUSES = new Set(["pending", "seller_confirmation_pending"]);
const FINISHED_STATUSES = new Set(["delivered", "completed", "cancelled", "canceled", "returned", "refunded", "rejected"]);

export function sellerReminderGroup(status: string): "new" | "unfinished" | null {
  if (FINISHED_STATUSES.has(status)) return null;
  return NEW_STATUSES.has(status) ? "new" : "unfinished";
}