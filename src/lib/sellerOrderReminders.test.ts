import { describe, expect, it } from "vitest";
import { sellerReminderGroup } from "./sellerOrderReminders";

describe("seller order reminders", () => {
  it("keeps new orders separate", () => {
    expect(sellerReminderGroup("pending")).toBe("new");
    expect(sellerReminderGroup("seller_confirmation_pending")).toBe("new");
  });
  it("includes every unfinished delivery stage", () => {
    for (const status of ["seller_accepted", "accepted", "packed", "pickup", "shipped", "out_for_delivery", "delivery_pending", "self_delivery_pickup", "self_delivery_shipped"]) {
      expect(sellerReminderGroup(status)).toBe("unfinished");
    }
  });
  it("excludes finished and closed orders", () => {
    for (const status of ["delivered", "completed", "cancelled", "returned", "refunded", "rejected"]) {
      expect(sellerReminderGroup(status)).toBeNull();
    }
  });
});