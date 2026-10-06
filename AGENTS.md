# Architecture rules

- Share the global assistant's availability and open command with homepage navigation through `src/lib/chatControls.ts`; the assistant stays mounted at app level so conversations survive page navigation.
- Keep delivery-staff reads and writes of customer address-book locations in an authenticated Edge Function that verifies order assignment, rather than granting staff direct access to other users' addresses.
- Fetch delivery order customer contacts in cached batches through the assignment-checked delivery Edge Function; share the contact display across order lists and notifications to avoid exposing unrelated profiles.
- Keep the delivery notification presentation separate from seller notifications and apply its theme within the dialog portal so seller styling remains unchanged.