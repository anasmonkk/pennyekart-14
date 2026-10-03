# Delivery Staff order push notifications (separate FCM system)

When an order is assigned to a delivery staff member, only that person gets a phone push. Tapping it opens their Delivery Dashboard with that order. Nothing existing is changed: the in-app notifications, the new-order popup, seller order pushes and Admin Push Notifications all keep working as they do now.

## Where assignment actually happens
- The only place that sets `orders.assigned_delivery_staff_id` is a database rule that runs **when the order is created**. It picks the staff member assigned to the customer's panchayath and ward.
- No admin page, delivery page or other function changes it later.
- So the push is sent right after an order is created, and only if a staff member was assigned.

## What happens
```text
Customer places order -> order saved (staff auto-assigned) -> send-delivery-order-push
  -> assigned staff's phone -> tap -> /delivery-staff/dashboard?order=<id>
```
- If no staff member is assigned, or they have no saved phone token, nothing is sent. The reason is recorded in the server log.
- Each order sends at most one delivery push, even if it is retried.
- Placing an order never waits for the push and never fails because of it.

## Technical details
- **Migration**: add the nullable column `orders.delivery_push_sent_at timestamptz`. There are no other schema changes.
- **New edge function `send-delivery-order-push`**, independent from `send-seller-order-push` and `send-push-notification`:
  - Requires a signed-in caller who owns the order, and the order must be less than 15 minutes old. This uses the same guard as the seller push.
  - Claims the order atomically: it sets `delivery_push_sent_at` only if that value is still null.
  - Reads `assigned_delivery_staff_id` and that profile's `fcm_token`. The profile must have `user_type = 'delivery_staff'`.
  - Uses the existing `FIREBASE_*` secrets. It gets a Google access token through a service-account JWT and sends with FCM HTTP v1.
  - Title is "New Delivery Order" and body is "You have a new order assigned for delivery."
  - Data payload: `{type: "delivery_order", order_id, url: "/delivery-staff/dashboard?order=<id>"}`, with Android priority high and channel `default_notification_channel`.
  - Clears the token only on UNREGISTERED or invalid-token errors. It never logs token values or keys.
  - Returns `{sent, reason}`.
- **Cart.tsx**: after the order is saved, it calls the new function with fire-and-forget, next to the existing seller-push call.
- **Delivery Dashboard**: reads `?order=<id>` and highlights or opens that order in the Orders tab. Existing tap handling in `pushNavigation.ts` already routes `data.url`, so no native code changes.
- **Testing**: deploy the function, confirm it returns 401 without sign-in, and confirm the build passes.

## Important: the delivery Android app
- `android/app/google-services.json` only lists `com.pennyekart.app`. It does not list `com.pennyekart.delivery`.
- Phones running the delivery app can only get a push token if that package is added to Firebase project `pennyekart9094`. Then the downloaded `google-services.json` has to be used in that app's build.
- Until then, delivery staff who sign in on the main Pennyekart app still receive these pushes.

## Not covered
- Re-assigning orders to a different staff member. No such feature exists today. If one is added later, it can call the same function.
