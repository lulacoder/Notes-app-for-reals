# Local production testing

The local environment files select separate Convex deployments automatically.
They are ignored by Git so this setup does not change hosted frontend builds.

| Frontend mode | Convex deployment | Better Auth `SITE_URL` on Convex |
| --- | --- | --- |
| Development | `calculating-seal-739` | `https://notes-app-liart-eight.vercel.app` |
| Local production build | `dapper-lemming-169` | `http://localhost:3000` |

Run the production frontend locally:

```powershell
npm run build
npm run start
```

Open `http://localhost:3000`. Sign in with an existing account from the copied
development data. Keep port 3000 because Better Auth checks the origin.

`.env.production.local` selects the production backend for `build` and `start`.
`.env.development.local` selects the development backend for `dev`. Convex CLI
commands still use `.env.local` by default. Select a deployment explicitly when
changing backend settings:

```powershell
npx convex env get SITE_URL --deployment-name calculating-seal-739
npx convex env get SITE_URL --deployment-name dapper-lemming-169
```

The production backend has been reserved for localhost testing. The remote app
must use the development backend. Running `next dev` locally does not change the
development backend's trusted origin.

## Workspace navigation

Notes and canvases share `app/(dashboard)/(workspace)/layout.tsx`. The shell owns
sidebar filters, search, mobile navigation, trash, and the quick switcher. Page
loading placeholders replace only the document area.

`DocumentLink` prepares the target after 100 ms of hover, immediately on keyboard
focus, or on touch. It prefetches the private server result, briefly subscribes
to the corresponding Convex query, and loads the editor module. Passing over an
item briefly cancels the hover work. Live queries keep opened documents current.

Direct visits still get server-loaded document data. Private prefetch output is
kept in the current browser session, not a shared server cache.

## Autosave

Notes and canvas shapes save after a two-second pause, or after ten seconds of
continuous changes. Leaving an editor submits its pending snapshot. Hiding the
tab or receiving `pagehide` also submits pending edits. Abrupt browser termination
can still prevent an unconfirmed save from completing.

Note updates send only changed title/body fields. Canvas shape updates serialize
the latest committed shapes when saving, and title changes remain explicit.
Identical updates do not patch the database or change `updatedAt`. Note history
still creates a separate version after five minutes without edits.

The shared sidebar subscribes to `canvases.listCanvasSummaries`, which excludes
shape content. Canvas grids keep `listCanvases` for previews, and the notes grid
subscribes to that full query only while grid view is open. Summary queries still
read the canvas documents on the backend.

If the summary query is missing or returns Convex's opaque production server
error, workspace loading logs the error and falls back to the authenticated
`listCanvases` query. Network errors still propagate, as does the original error
if the fallback query also fails.
