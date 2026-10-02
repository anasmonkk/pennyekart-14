# Separate Push Notifications admin page (Android FCM)

A new admin page, **Push Notifications**, sends phone push messages to Android users. The existing in-app Notifications page and its popups stay exactly as they are.

## What the admin gets
- A new menu item, "Push Notifications", under Notifications. It uses the same access rule (super admin or the `read_settings` permission).
- **Compose form**: title, message, optional image, optional link (for example `/product/<id>` opens inside the app, and `https://...` opens outside it), and audience: All users / e-Life agents / Selected panchayaths.
- **Live recipient count**: shows how many devices will receive the message before it is sent. Push tokens are never shown.
- **Send confirmation**: a popup shows the title, message, link, audience and device count, then the admin taps "Send push".
- **Result**: for example "Sent to 125 devices", or "Sent: 120, Failed: 5".
- **History list**: past pushes with date, sender, audience, sent and failed counts, and a "Resend" button.
- **Optional shortcut**: a "Send as push" button on each row of the existing Notifications page opens the same confirmation with that notification's content. Editing a notification never sends a push automatically.

## On the phone
- Tapping the push opens the link through the existing tap handler, with no change to the app code. If there is no link, it opens the home screen.

## What you need to provide
- Your Firebase service account details from Firebase Console → Project settings → Service accounts → Generate new private key. They are saved as three secure server secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. They are never added to the app code.

## Technical details
- **New table `push_campaigns`**: title, message, image_url, link_url, target_audience, target_local_body_ids, notification_id (nullable, links to an existing notification), sent_count, failed_count, invalid_tokens_cleared, status (draft/sending/sent/failed), created_by, sent_at, plus timestamps. It has GRANTs and RLS: only super admins or holders of `has_permission('read_settings')` can read or insert it. The server function updates it using the service role.
- **New server function `send-push-notification`**:
  - Checks the caller's login, then requires a super admin or the `read_settings` permission.
  - Actions: `preview` (returns the count only) and `send`.
  - Picks recipients: `all` means profiles with a non-empty `fcm_token`; `panchayath` matches `local_body_id` against the selected panchayaths; `agents` reuses the e-Life agent check from `notifications-resolve`, moved into `_shared/elife.ts` (the resolve function keeps the same behaviour).
  - Removes duplicate tokens.
  - Gets a Google access token by signing a JWT with the service account. Escaped `\n` in the private key are converted back to real line breaks. Scope: `firebase.messaging`.
  - Sends through the FCM HTTP v1 API in batches of about 20 at a time, with `data: { url, notification_id }` (all values as text), `android.priority: high` and the image when one is set.
  - Clears `profiles.fcm_token` only on UNREGISTERED or invalid-token errors, never on temporary errors.
  - Saves the counts on the campaign.
- **Frontend**:
  - New page `src/pages/admin/PushNotificationsPage.tsx`, plus a route at `/admin/push-notifications` and the menu entry in `AdminLayout.tsx`.
  - Small "Send as push" action added in `NotificationsPage.tsx`.
- No changes to `native.ts`, the existing notifications table, or web notifications.

## Not covered
- iPhone push (needs an Apple setup) and scheduled pushes. These can be added later.
