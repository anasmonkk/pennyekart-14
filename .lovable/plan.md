# Seller "Turn On Notifications" button

## What changes
1. New small card component `SellerNotificationCard` (seller-only), placed in the Selling Partner dashboard Profile tab, just above the Account section.
2. Button label: "Turn On Notifications" with a bell icon. Tapping it calls the existing `enableNotifications()` from `src/lib/native.ts`. That function already shows the explanation popup, asks Android for permission, registers with Firebase, and saves the token to `profiles.fcm_token`.
3. Messages:
   - Granted: "Notifications are now enabled."
   - Denied: "Notification permission was not granted. Please enable notifications from Android Settings."
   - Already on (checked at load via the push plugin in the app, or browser permission on the web): shows a disabled "Notifications Enabled" status instead of the button.
4. Styled with the existing card/button look; full width on phones.

## Not touched
`native.ts` logic, token saving, `NewOrderNotification`, realtime orders, seller push function, push tap navigation, Firebase files, customer and delivery staff screens.

## Note on app ID
The project's app ID is currently `com.pennyekart.app` (not `com.pennyekart.seller` as your notes say). The plan leaves it unchanged. Tell me if it should be changed — that also needs a matching Firebase file.

## Checks after
Build passes, `/selling-partner/login` opens, push and navigation code still present.
