# Order details: cancel, return, and bill breakdown

## What you'll get

On the customer profile's Orders tab, tapping any order opens a full order detail view with:

1. **Bill details** — an itemized bill like a shop receipt:
   - Every item with photo, name, quantity, price, and MRP (strikethrough when discounted)
   - Item-wise line totals
   - Delivery charge (shown as its own line; "Free" when ₹0)
   - Grand total
   - Order date, status, and delivery address
2. **Cancel Order button** — visible only while the order is still pending/accepted/confirmed/packed/shipped, with a "Are you sure?" confirmation before cancelling.
3. **Request Return button** — visible only after the order is delivered, with a confirmation explaining a delivery/selling partner must confirm the return.

## How it works

- Make each order card in `src/pages/customer/Profile.tsx` tappable, opening the existing `OrderDetailDialog` component.
- Extend `OrderDetailDialog` with:
  - A **Bill Details** section (items, delivery charge from `orders.delivery_charge`, total).
  - **Cancel** and **Return** action buttons at the bottom, shown only when the order status allows, each with a confirmation dialog (matching the app's safety-confirmation rule).
- On cancel/return, the order status updates (`cancelled` / `return_requested`) and the orders list refreshes.
- The existing Cancel/Return buttons on the order cards stay as they are.

## Safety already in place (verified)

- The database already lets a customer update only their own orders (checked the orders table policies), so cancel/return will work without any database changes.
- No database or schema changes are needed.

## Verification

- Build passes.
- Phone-sized preview: open an order, see the bill breakdown, cancel a pending order, request a return on a delivered order, and confirm the list refreshes with the new status.
