# Move Utility and Chat into the homepage bottom menu

On phones, keep the homepage's five-item bottom menu but replace **Cart** with **Utility** and **Account** with **Chat**. Cart and account remain available from the icons in the top search bar.

## Changes

1. Remove the floating Utility shortcut from the homepage. Make the new Utility menu item open the existing Utility Services page.
2. Make the new Chat menu item open the existing Penny Assistant conversation. Hide its separate floating message icon on the homepage at phone size, while preserving its existing behavior elsewhere and on larger screens.
3. Keep Home, Play and the existing Wallet/Top Deals slot as they are. Preserve the assistant's enabled/disabled setting so the Chat item does not offer an unavailable action.
4. Check the phone-sized homepage for spacing and overlaps, then tap Utility and Chat to verify both open correctly. Confirm Cart and Account still work in the top bar.

## Technical approach

Update the homepage bottom navigation and remove its floating utility render. Expose a small shared open-chat action between the global assistant and the homepage menu, scoped to the homepage mobile view. Do not change shopping, account, or service data flows.
