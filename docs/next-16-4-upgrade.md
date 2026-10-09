# Next.js 16.4 upgrade

The app uses Next.js 16.4.0, React 19.3.0, React Compiler 1.0.0, and matching Next ESLint rules. Better Auth 1.6.33 and the Convex bridge 0.12.5 replace the old authentication packages. Tiptap packages move together to 3.31.4 for editor security fixes.

## Rendering and caching

- `cacheComponents` and `partialPrefetching` enable static route shells and partial route prefetching. Runtime auth and data reads sit inside Suspense boundaries.
- The dashboard session uses `use cache: private` with a 30-second client stale time. It is private browser memory, not a shared server cache. Logout performs a full navigation to discard the private route cache.
- Notes, tags, boards, and canvases remain live Convex subscriptions. There is no shared persistent cache of private content and no mutation invalidation layer to maintain.
- React `cache()` deduplicates note-layout and page reads within one server request. The persistent notes layout shares the summary, tag, and canvas snapshots across note detail navigation.
- The server loads the selected note, selected canvas, and initial board cards/columns before their client views mount. Auth-aware preload hooks retain those snapshots while browser authentication starts.
- Note summaries omit rich HTML while keeping plaintext search, previews, and thumbnails. Trash badges read a count. Full trash records load when trash opens.
- Quick switcher, trash, grid, and canvas editor code load separately. Normal navigation links use Next prefetching. Note titles use React ViewTransition with reduced-motion support.
- The saved list/grid preference hydrates from a stable server snapshot. The editor shows the loaded title and a plaintext body preview before Tiptap becomes interactive. Autosave waits for note data.

## Admin and authentication

This change includes the existing admin and authentication work in the checkout. The panel supports creation, role changes, timed bans, password resets, deletion, deployment counts, and sample data, with typed adapter boundaries and toast feedback.

Administrator operations validate the live session, role, and ban state. Bootstrap is an internal mutation and requires a supplied password. Self-demotion, self-ban, self-deletion, and primary administrator protection remain enforced. Account and session pagination handles every page. Deleted users' storage files are removed with their records. Seeded accounts receive an unknown random password and require an administrator reset before use.

Private data functions also check the live session. A revoked or banned identity cannot continue reading or writing with an otherwise unexpired JWT. Upload queries and attachments check ownership.

The Convex bridge currently has a [documented client type inference bug](https://github.com/get-convex/better-auth/issues/420) with security-patched Better Auth releases. A single `@ts-expect-error` at the provider adapter documents that upstream mismatch. Other client APIs keep their inferred types. Remove the workaround after the upstream fix.

The Better Auth CLI generated `convex/betterAuth/schema.generated.ts`. The existing schema preserves optional user fields, custom indexes, and legacy plugin tables, and imports the generated active core tables. Existing data is not dropped by schema cleanup.

## Validation

Run `npm ci`, `npm run lint -- --max-warnings=0`, `npm run typecheck`, `npm test`, `npm audit --omit=dev`, and `npm run build`. CI runs the same checks with Node 24. Tests use an in-memory Convex database and the real component adapter, plus React server rendering and hydration. No tests create or modify remote accounts.

`npm audit --omit=dev` is clean. Full audit still reports the development-only `braces` -> `micromatch` -> `fast-glob` -> Next ESLint chain. npm's proposed fix downgrades the Next ESLint package to 14.2.35, so this upgrade keeps the matching 16.4 rules.

After building, run `node scripts/measure-route-bundles.mjs`. It sums the unique route chunk paths from Next's diagnostics and gzips each chunk at level 9. It excludes async editor chunks, CSS, images, API data, and browser timing. These numbers measure the synchronous chunk set, not total network transfer or interaction latency.

## Release order

Deploy the Convex backend from this branch before releasing the frontend. The frontend requires the new `notes:listNoteSummaries` and `notes:countTrash` queries, the upload ownership indexes, and the updated Better Auth component schema. Use the normal authenticated Convex deployment workflow, then deploy the frontend. This PR does not deploy either production service.

After deployment, verify sign-in, saved grid mode, note edits and version history, canvas editing, board drag/drop, and admin actions in the target environment. Browser smoke testing has not been completed. Authenticated browser workflows require the matching backend deployment.

References: [Next.js 16.4](https://nextjs.org/blog/next-16-4), [Convex bridge 0.12 migration](https://labs.convex.dev/better-auth/migrations/migrate-to-0-12), [Better Auth 1.6 changes](https://better-auth.com/blog/1-6).
