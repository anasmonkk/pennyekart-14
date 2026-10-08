# Architecture rules

- Share the presentation-only OrderItemHighlight across normal and utility seller order views; shared customer/delivery dialogs opt in explicitly so seller styling does not alter other roles or order actions.

- Keep delivery Orders card navigation local to DeliveryOrders while preserving quick-filter and notification deep-link entry into All Orders; presentation changes must not alter order actions.
- Keep Stock feature navigation local to DeliveryStock; card navigation must preserve the existing stock search, transfer form, and history filters without changing stock operations.

- Share the global assistant's availability and open command with homepage navigation through `src/lib/chatControls.ts`; the assistant stays mounted at app level so conversations survive page navigation.
- Keep delivery-staff reads and writes of customer address-book locations in an authenticated Edge Function that verifies order assignment, rather than granting staff direct access to other users' addresses.
- Fetch delivery order customer contacts in cached batches through the assignment-checked delivery Edge Function; share the contact display across order lists and notifications to avoid exposing unrelated profiles.
- Use NotificationDialogFrame for admin, seller, delivery, and utility booking alerts; apply the shared blue theme within the dialog portal while retaining domain-specific details and actions so notification layouts stay consistent.
- Keep utility-service FCM delivery in an authenticated Edge Function that verifies request ownership, resolves the provider server-side, and deduplicates sends so customer clients cannot choose recipients.