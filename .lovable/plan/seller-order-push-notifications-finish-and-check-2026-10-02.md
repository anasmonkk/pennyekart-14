# Seller order push notifications: finish and check

Most of this is already built. The plan finishes the gaps, checks the setup, and covers what the separate seller app needs.

## Already in place (left as is)
- Orders are still saved exactly as before, one row per seller.
- The in-app popup and bell for sellers (`NewOrderNotification`) still works through live updates.
- A secure server function, `send-seller-order-push`, does the following:
  - Checks that the person calling it is the customer who owns the order.
  - Sends only to that order's seller(s), and only to accounts marked as selling partners. Customers, delivery staff and admins never get it.
  - Marks the order as sent so it is never sent twice.
  - Clears dead phone tokens.
- The cart calls this function after each order is saved. It runs in the background and can never block or fail the order.
- Tapping a notification opens the seller dashboard on the Orders tab with that order (`?tab=orders&order=<id>`, the address the dashboard already uses).

## Changes
1. **Message wording**: title "New Order Received", body "You have received a new order. Tap to view the order." Add the short order number. No customer details.
2. **Push data**: add `orderId` next to the existing `url` and `order_id`. Keep the dashboard's real `order` link setting.
3. **Tap handling**: keep the current handler. Make it also work when the app was fully closed, by using in-app navigation once the app is ready instead of a full page reload.
4. **Setup check**:
   - Confirm the three Firebase secrets exist (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
   - Deploy the function.
   - Do a dry-run call to confirm it rejects bad requests and finds the right seller. Secret values are never shown.

## Separate seller app (com.pennyekart.seller)
That app lives in another project, so I can't change it from here. For pushes to reach it:
- In Firebase project `pennyekart9094`, add an Android app with package `com.pennyekart.seller`. Today's `google-services.json` only lists `com.pennyekart.app` and an old Lovable ID.
- Put the downloaded `google-services.json` into that app's `android/app/` folder.
- That app must use the same backend and save its token to `profiles.fcm_token` after sign-in, the same way `native.ts` does here. It also needs the `@capacitor/push-notifications` plugin, the POST_NOTIFICATIONS permission, the `default_notification_channel` channel, and the same tap handler.
- Rebuild it: `npm install`, `npm run build`, `npx cap sync android`, then build in Android Studio.

## Known limit
Because the send starts from the customer's app right after ordering, a customer who closes the app at that exact moment could cause a missed push. The order is still saved and the in-app alert still works. A fully server-side trigger could come later if you want it.

## Testing (on real phones)
App open, app in background, app fully closed, tapping the notification, an order with two sellers, and checking that delivery staff get nothing. I won't claim it works until these pass on a phone.
