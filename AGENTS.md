# Architecture rules

- Share the global assistant's availability and open command with homepage navigation through `src/lib/chatControls.ts`; the assistant stays mounted at app level so conversations survive page navigation.
- Keep delivery-staff reads and writes of customer address-book locations in an authenticated Edge Function that verifies order assignment, rather than granting staff direct access to other users' addresses.