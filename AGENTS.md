# Architecture rules

- Share the global assistant's availability and open command with homepage navigation through `src/lib/chatControls.ts`; the assistant stays mounted at app level so conversations survive page navigation.
- Keep delivery-staff reads and writes of customer address-book locations in an authenticated Edge Function that verifies order assignment, rather than granting staff direct access to other users' addresses.
- Fetch delivery order customer contacts in cached batches through the assignment-checked delivery Edge Function; share the contact display across order lists and notifications to avoid exposing unrelated profiles.
- Use the shared OrderNotificationDialog presentation for admin, seller, and delivery order alerts; apply the blue theme within the dialog portal and retain role-specific data access and actions.
- Keep utility-service FCM delivery in an authenticated Edge Function that verifies request ownership, resolves the provider server-side, and deduplicates sends so customer clients cannot choose recipients.