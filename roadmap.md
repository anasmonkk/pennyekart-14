# Roadmap

## Selling partner sign-in and notifications
- [ ] Keep selling-partner sign-in restored after reopening; remember the mobile number without saving the password.
- [ ] Refresh the notification permission display when the app resumes.

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
