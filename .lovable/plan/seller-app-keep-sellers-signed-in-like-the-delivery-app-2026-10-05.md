# Seller app: keep sellers signed in (like the delivery app)

## What I found in this project
- The seller login and delivery login use the exact same sign-in screen and the same "stay signed in" logic. Sellers additionally get their mobile number remembered.
- Nothing in the seller dashboard signs the seller out automatically; the only sign-out is the logout button.
- So in this (customer) project, the seller and delivery flows behave the same. The difference most likely comes from the separate Seller Android app (com.pennyekart.seller), e.g. which website address it opens, or how it starts.

## Plan
1. Check the live seller flow at phone size here: sign in as a seller, close/reopen, confirm it goes straight to the dashboard. If it fails here, fix it in this project.
2. If it works here, the fix belongs in the Seller app project. There, check:
   - The address the app opens (must be the same site the login happened on, e.g. www.pennyekart.com, not a changing preview link).
   - That the app's start page is the seller login, which already auto-jumps to the dashboard when a saved login exists.
   - That nothing clears the app's storage on launch.
3. Small safety improvements here (shared by both apps, no change for delivery):
   - When the app reopens offline or slowly, keep showing "Restoring your account" with a retry instead of the login form.
   - Utility-type sellers also redirect correctly from the login page to their dashboard.

## Not changing
- App IDs, Firebase files, notifications, delivery app behaviour, customer login.

## Technical details
- `PartnerLogin.tsx` (shared) + `ProtectedPartnerRoute.tsx`; Supabase client uses `persistSession: true` with localStorage.
- If the Seller app's `capacitor.config.ts` `server.url` differs from where sessions were saved, localStorage is per-origin and the login won't persist — that is the first thing to compare against the delivery app config.
