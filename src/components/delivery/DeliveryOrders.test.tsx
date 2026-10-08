import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DeliveryOrders from "./DeliveryOrders";

vi.mock("@/hooks/useDeliveryContacts", () => ({ useDeliveryContacts: () => ({ data: {}, isLoading: false, isError: false }) }));
vi.mock("@/components/delivery/DeliveryOrderContact", () => ({ default: () => null }));
vi.mock("@/components/OrderDetailDialog", () => ({ default: () => null }));

afterEach(cleanup);

const orders = [
  { id: "micro-order", status: "pending", total: 100, shipping_address: "Micro address", created_at: "2026-10-08T00:00:00Z", items: [], user_id: "customer" },
  { id: "area-order", seller_id: "seller", status: "seller_confirmation_pending", total: 200, shipping_address: "Area address", created_at: "2026-10-08T00:00:00Z", items: [], user_id: "customer" },
  { id: "return-order", status: "return_requested", total: 300, shipping_address: "Return address", created_at: "2026-10-08T00:00:00Z", items: [], user_id: "customer" },
  { id: "done-order", status: "delivered", total: 400, shipping_address: "Done address", created_at: "2026-10-08T00:00:00Z", items: [], user_id: "customer" },
];

describe("Delivery Orders feature navigation", () => {
  it("opens each card section and returns to the features grid", () => {
    render(<MemoryRouter><DeliveryOrders orders={orders} userId="staff" onRefresh={vi.fn()} /></MemoryRouter>);
    for (const label of ["Micro Orders", "Area Orders", "Returns", "All Orders", "History"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
      expect(screen.queryByLabelText("Order features")).not.toBeInTheDocument();
      if (label === "Micro Orders") expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
      if (label === "Returns") expect(screen.getByRole("button", { name: "Accept Return" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Back to features" }));
      expect(screen.getByLabelText("Order features")).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "All Orders 4 total" })).toBeInTheDocument();
  });

  it("keeps quick filters opening All Orders", () => {
    render(<MemoryRouter><DeliveryOrders orders={orders} userId="staff" onRefresh={vi.fn()} quickFilter={{ status: "pending", nonce: 1 }} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "All Orders" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("pending");
    expect(screen.getByText("Micro address")).toBeInTheDocument();
    expect(screen.queryByText("Area address")).not.toBeInTheDocument();
  });
});