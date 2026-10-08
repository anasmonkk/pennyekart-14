# Roadmap

## Delivery Orders feature cards
- [x] Finish the Orders feature-card grid and back navigation; two automated tests passed for all five sections and quick filters, and build passed. Live signed-in checks unavailable with external Supabase.

## Utility seller notification popup
- [x] Match the utility request popup to the normal seller blue notification layout; sample layout verified at 360px and 390px, with Accept and Later controls tested. Live signed-in booking updates remain unverified (external Supabase session unavailable).

## Consistent order popups
- [ ] Match admin and selling-partner order popups to the delivery blue layout, preserving role-specific actions; verify layout and controls.

## Delivery order contacts and popup
- [x] Show customer contact details on delivery orders and organize the blue gradient notification popup for mobile; deploy assignment-checked contact service.
- [ ] Verify customer contact retrieval and order updates signed in on the delivery app (blocked: external Supabase session unavailable); sample popup layout and controls verified at 360px.

## Delivery staff customer location
- [ ] Navigate to saved customer address pins and let assigned delivery staff save a newly captured delivery pin to the customer's address book.

## Dedicated selling-partner management
- [ ] Expand the standalone admin area to include partner profile/business details, performance, products, wallet, and coverage in one place.
- [ ] Confirm all admin links point to the standalone partner area, outside Users.

## Selling partner sign-in and notifications
- [x] Keep selling-partner sign-in restored after reopening; remember the mobile number without saving the password.
- [x] Refresh the notification permission display when the app resumes.

## Mobile homepage Utility shortcut
- [x] Replace scrolling service names with animated Utility category images; keep the icon fallback.

## Play Store compliance (approved plan)
- [ ] DB: deletion requests, profile field protection, verification RPCs, anonymise function, FK changes
- [ ] delete-account server function + Delete Account section (profile + partner dashboards)
- [ ] /privacy-policy, /delete-account, /terms pages + links (login, signup, profile, footer)
- [ ] Admin deletion requests list
- [ ] Android permissions + permission explanation prompts; no push request at launch
- [ ] Security: lock admin password reset function, verification moved server-side
- [ ] PLAY_STORE_CHECKLIST.md

## Customer password migration (uploaded notes)
- [ ] Remove shared password from frontend; legacy login checked on server only
- [ ] New signups choose own password
- [ ] Legacy/temporary accounts forced to set new password after login (status legacy -> migrated)
- [ ] Admin "Set Password" (temporary, must change on next login), admin-only on server
- [ ] No DOB-based recovery for customers
