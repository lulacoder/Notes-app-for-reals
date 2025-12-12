# Canvas blank-screen fix summary

## Problem
New canvases (and sometimes existing ones) rendered a blank area on `/canvas/[id]` even though notes and the rest of the app worked.

## Root causes (most likely)
1. **tldraw CSS was not reliably loaded**
   - The app previously tried to load CSS via a runtime `<link href="/tldraw.css">` injection.
   - That approach can fail silently (or load too late), while UI code still mounts, resulting in a visually blank/unstyled canvas.

2. **Flex layout height collapse**
   - Some wrappers used `overflow-hidden` + flex children without `min-h-0`.
   - In that situation, the canvas container can end up with an effective height of `0px`, which looks like “blank canvas”.

## Fix implemented
### 1) Load tldraw CSS via the package (reliable)
- Added global import:
  - `app/layout.tsx`: `import "@tldraw/tldraw/tldraw.css";`

This ensures tldraw base styles ship consistently with the app bundle.

### 2) Remove fragile runtime CSS injection + gating
- Removed runtime `<link href="/tldraw.css">` logic and related `cssLoaded` gating:
  - `components/CanvasEditor.tsx`
  - `app/(dashboard)/canvas-test/page.tsx`

Now the canvas loads based on the module import + data readiness, not on a best-effort CSS link.

### 3) Harden the flex height chain
- Ensured key wrappers allow children to size correctly by adding `min-h-0` where needed:
  - `app/(dashboard)/layout.tsx` (main content wrapper)
  - `app/(dashboard)/canvas/page.tsx`
  - `app/(dashboard)/canvas/[id]/page.tsx`

### 4) Remove stale local CSS file
- Deleted `public/tldraw.css` (no longer needed).

### 5) Clean up Next config that caused warnings
- `next.config.ts`: removed `serverExternalPackages` that attempted to externalize `@tldraw/tldraw`.
  - This can trigger warnings because CSS imports don’t work with Node-style externals.

## Files changed
- `app/layout.tsx`
- `components/CanvasEditor.tsx`
- `app/(dashboard)/canvas-test/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/canvas/page.tsx`
- `app/(dashboard)/canvas/[id]/page.tsx`
- `next.config.ts`
- Deleted: `public/tldraw.css`

## How to verify
1. Start dev server: `npm run dev`
2. Open `/canvas-test`
   - Confirm you see the full tldraw UI (toolbar + drawable surface).
3. Create/open a real canvas `/canvas/<id>`
   - Confirm it renders and you can draw.
4. Persistence check
   - Draw something, refresh the page, confirm it reloads from Convex (`canvases.content`).

## Notes
- A production build previously succeeded after the canvas/layout/CSS changes.
- After the `next.config.ts` cleanup, you can re-run `npm run build` to confirm the earlier tldraw externalization warning is gone.
