# Delivery staff customer location

## User experience
- In delivery order details, show Google Maps navigation when the customer already has a saved GPS pin, checking saved customer addresses and then existing profile coordinates.
- When no pin exists, let delivery staff capture the current phone location at the delivery address, preview the coordinates, and save them as a new “Delivery location” on the customer’s address book for future orders. Keep existing customer addresses intact.
- Request location permission only when staff choose to capture a pin, with the existing permission explanation. Show clear loading, success, and failure feedback.

## Secure save
- Add an authenticated Supabase Edge Function action to save the captured coordinates. It will verify the signed-in staff member is assigned to that order, then create the saved customer address using the order’s delivery text and the customer’s available name and phone. Do not let the browser write directly to another user’s address book.
- Reuse the current Google Maps directions link and existing location columns; no database schema change is planned.

## Technical details
- Update the shared order detail dialog used from the delivery dashboard, and add the edge-function handler for authorization and persistence.
- Validate the function’s assignment check and location input, then verify the app’s build and inspect the resulting delivery detail states where possible.
