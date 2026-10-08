import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeliveryStock from "./DeliveryStock";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const data = table === "godown_wards" ? [{ godown_id: "g1", local_body_id: "lb1", ward_number: 1 }]
        : table === "godowns" ? [{ id: "g1", name: "Main Godown" }]
        : table === "products" ? [{ id: "p1", name: "Rice" }]
        : table === "godown_stock" ? [{ id: "s1", product_id: "p1", godown_id: "g1", quantity: 12 }]
        : table === "stock_transfers" ? [{ id: "t1", product_id: "p1", from_godown_id: "g1", to_godown_id: "g1", quantity: 2, status: "completed", created_at: "2026-10-08T00:00:00Z" }] : [];
      const query = { select: () => query, in: () => query, or: () => query, order: () => query, limit: () => query, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data }).then(resolve) };
      return query;
    },
  },
}));

afterEach(cleanup);

describe("Stock feature cards", () => {
  it("opens all three features and preserves search and transfer controls", async () => {
    render(<DeliveryStock userId="staff" assignedWards={[{ local_body_name: "Local", local_body_id: "lb1", ward_number: 1 }]} />);
    await screen.findByLabelText("Stock features");
    expect(screen.getByRole("button", { name: "Current Stock 1 products" })).toBeInTheDocument();
    for (const label of ["Current Stock", "Transfer", "Transfer History"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label} \\d`) }));
      expect(screen.getByRole("heading", { name: label, exact: true })).toBeInTheDocument();
      if (label === "Current Stock") {
        expect(screen.getByText("Rice")).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText("Search product..."), { target: { value: "missing" } });
        expect(screen.getByText("No stock")).toBeInTheDocument();
      }
      if (label === "Transfer") expect(screen.getByRole("button", { name: "Create Transfer" })).toBeInTheDocument();
      if (label === "Transfer History") expect(screen.getByText("completed")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Back to features" }));
      expect(screen.getByLabelText("Stock features")).toBeInTheDocument();
    }
  });
});