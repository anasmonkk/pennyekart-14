# Fix push notification registration (Android app)

Only `src/lib/native.ts` changes. The website is not affected.

## Changes
1. Set `PUSH_CONFIGURED = true`. The Firebase file `android/app/google-services.json` is already in the project, so registering will no longer crash the app.
2. In `initNativeApp()`, right after loading the push plugin, add these listeners before any `register()` call:
   - `registration`: logs the device token (for debugging only, not saved anywhere).
   - `registrationError`: logs the error.
   - `pushNotificationReceived`: logs incoming notifications.
3. Keep the existing permission check: `register()` runs only if permission is already granted. The app still never asks for permission at launch.
4. Keep the existing `pushNotificationActionPerformed` tap handler and URL handling as they are.
5. `enableNotifications()` stays as it is (explanation popup, then the permission request, then `register()`). It reuses the listeners added at startup, so nothing is added twice.

## After the change
- Re-read the file and confirm all six checks from your notes.
- On your computer: `git pull`, `npx cap sync android`, then rebuild and install. Open Android Studio Logcat and look for "FCM registration token" after turning on notifications.

## Note
The token is only logged for now. To actually send notifications to a phone, the token still needs to be saved securely against the user's account later. That would be a separate step.
