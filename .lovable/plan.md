# Separate Push Notifications module (Android FCM)

A new, fully independent **Push Notifications** page sends phone push messages to Android users. The existing internal Notifications system is not touched: its page, bell, popups, analytics and resolver all stay as they are. The only thing the two share is each user's saved phone token.

```text
Admin -> Push Notifications -> send-push-notification -> Firebase -> Android app -> tap opens link
Admin -> Internal Notifications -> (unchanged) -> in-app / web notifications
```

## What the admin gets
- **Menu**: "Notifications" splits into "Internal Notifications" (the existing page, same address) and "Push Notifications" (new, `/admin/push-notifications`). Both use the same access rule: super admin or the `read_settings` permission.
- **Compose**: title, message, optional image URL, optional link (for example `/product/<id>`, `/orders`, or `https://...`), and audience: All users / e-Life agents / Selected panchayaths.
- **Recipient preview**: the number of Android devices that will receive it. Tokens are never shown.
- **Confirmation popup**, then **Send push**.
- **Result**: Sent X, Failed Y, Invalid tokens cleared Z.
- **History**: date, title, message, audience, sent, failed, status, and a **Resend** button that creates a new campaign and leaves the old one unchanged.

## On the phone
- The app code is unchanged. Tapping a push with `/product/...` or `/orders` opens that page inside the app. A push with no link just opens the app. HTTPS links follow the existing app behaviour.

## What you need to provide
- Your Firebase service account details from Firebase Console → Project settings → Service accounts → Generate new private key. They are saved as three secure server secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. They are never saved in the app code or the database.

## Technical details
- **New table `push_campaigns`**: title, message, image_url, link_url, target_audience, target_local_body_ids, sent_count, failed_count, invalid_tokens_cleared, status (sending/sent/failed), created_by, sent_at, created_at, updated_at, plus an updated_at trigger. GRANTs go to authenticated and service_role. RLS lets only `is_super_admin()` or `has_permission('read_settings')` read or insert it. No changes to `notifications`.
- **New edge function `send-push-notification`**, independent of `notifications-resolve`, which is left unchanged:
  - Validates the login token, then checks for super admin or the `read_settings` permission.
  - `action=preview` returns the number of distinct tokens.
  - `action=send` creates a campaign row, then sends.
  - Targeting: `all` means profiles with a non-empty `fcm_token`; `panchayath` matches `local_body_id` against the selected panchayaths; `agents` uses its own copy of the e-Life agent check.
  - Tokens are deduplicated.
  - Gets a Google access token through a service-account JWT signed with RS256, converting escaped `\n` in the key to real line breaks. Scope: `firebase.messaging`.
  - Sends through FCM HTTP v1 in groups of about 20 at a time. The payload carries `data.url` (`""` when there is no link; invalid links are rejected), `android.priority: high`, `channel_id: default_notification_channel`, and `android.notification.image` when an image is set.
  - Clears `profiles.fcm_token` only on UNREGISTERED or invalid-token errors and counts how many were cleared.
  - Updates the campaign counts and status. Token values are never logged.
- **Frontend**:
  - New `src/pages/admin/PushNotificationsPage.tsx`.
  - Route added in `App.tsx`.
  - Menu labels updated in `AdminLayout.tsx`.
  - No changes to `NotificationsPage.tsx`, `native.ts`, or any notification component.
- After building, I'll report: files changed, the database change, function details, secrets, deployment and testing steps (preview count, test push, link check in the app).

## Not covered
- iPhone push and scheduled pushes. These can be added later.
