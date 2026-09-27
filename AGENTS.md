# Architecture rules

- Share the global assistant's availability and open command with homepage navigation through `src/lib/chatControls.ts`; the assistant stays mounted at app level so conversations survive page navigation.