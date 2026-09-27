# Utility tab carousel animation on mobile homepage

Replace the scrolling image marquee in the homepage bottom-menu Utility tab with a carousel-style animation: one service category image is shown large at a time while the others stay small, then the next image becomes the large one, cycling continuously.

## Changes

Only `src/components/MobileBottomNav.tsx`:

1. Remove the marquee keyframes and marquee track.
2. Keep the existing loader that fetches `name, image_url` from active utility service categories.
3. Add a cycling index that advances every ~2 seconds.
4. Render the category images in a row inside the Utility tab icon slot: the active image renders large (about 8x8) and the others small (about 4x4), with a smooth scale/size transition when the active image changes. Wrench icon remains the fallback when no images exist.
5. Allow the large image to slightly overflow the tab slot (remove the hard overflow-hidden on the icon area) so the "main image" reads as bigger than the tab, matching the carousel look.

## Verification

- Playwright at phone size (394px wide) on the homepage: screenshot the bottom nav, wait ~2.5s, screenshot again and confirm the large image has moved to the next category.
- Tap Utility and confirm it still opens the Utility Services page.
- Check no overlap with the other nav items' labels; keep spacing clean.
