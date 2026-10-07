# Utility-service Firebase notifications

## Goal
Give utility partners the same reliable phone push alerts that selling partners receive for new orders, while keeping existing in-app alerts and other notification systems unchanged.

## Current behavior verified
- The utility dashboard already includes the shared notification-permission control, in-app notification bell, live request refresh, and a new-request popup.
- Customer utility bookings are inserted directly into `utility_service_requests`; no Firebase sender is called on that path.
- Regular seller order pushes use an authenticated Edge Function, resolve the recipient on the server, and use the existing Firebase secrets. Native push registration saves the signed-in user's FCM token to their own profile.
- Utility partners use the `selling_partner` account type, and their services identify their owner through `provider_user_id`. Request RLS permits that provider to read their own service requests.

## Implementation
1. Add an authenticated `send-utility-request-push` Edge Function. Validate the caller and request ID, confirm the caller created the request, resolve its service owner on the server, and send only to that provider's saved FCM token using the existing Firebase configuration. Ignore missing tokens and clear permanently invalid ones, matching existing push behavior.
2. Add a nullable send timestamp to utility requests and use an atomic claim to prevent duplicate pushes on retries.
3. After a booking is successfully saved, have the customer screen invoke the sender without blocking or failing the booking if notification delivery fails.
4. Put the request link in the push payload so tapping opens the utility dashboard's Requests view and focuses the corresponding request. Preserve all existing in-app notifications and dashboard popups.
5. Verify the function's authorization and targeting paths, inspect build/preview diagnostics, and exercise the public booking flow where possible. A real phone delivery check requires an installed app with notifications enabled.

## Technical details
- Use a database migration for the send-timestamp column; do not create any new table.
- Reuse the existing Firebase project credentials and native token registration; no new credential is expected.
- The dashboard's notification toggle remains the user's permission control. No notification permission prompt will be added at app launch.
