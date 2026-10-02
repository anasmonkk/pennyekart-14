# Add notifications button to Seller Profile

## Changes
1. Add a notifications section in `/selling-partner/dashboard` under the **Profile** tab, directly above the existing Account section.
2. Reuse the existing notification permission flow so the button:
   - Shows a bell icon and **Turn On Notifications**.
   - Displays a loading state while permission and registration are processed.
   - Confirms success when notifications are enabled.
   - Explains that Android Settings can be used when permission is denied.
   - Hides once notifications are enabled.
3. Keep the control full-width on phones and aligned with the existing Profile styling.

## Scope protection
- Do not change Android package/application IDs.
- Do not change Firebase configuration or `google-services.json`.
- Do not change notification delivery, order handling, or customer/delivery screens.

## Verification
- Confirm the button appears only in the Seller dashboard Profile tab.
- Confirm the permission explanation opens and the existing registration flow is called.
- Confirm success, denied, loading, and already-enabled states behave correctly.
- Confirm the Profile tab remains usable at phone and desktop sizes and the production build succeeds.
