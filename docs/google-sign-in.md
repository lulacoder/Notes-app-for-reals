# Google sign-in

Google and email/password use the same Better Auth user ID, so notes, boards, and canvases stay in the same workspace.

## Configure Google

Create a Google OAuth client with application type "Web application". Add each application's origin as an authorized JavaScript origin and register its exact callback URL:

```text
http://localhost:3000/api/auth/callback/google
https://YOUR_APP_HOST/api/auth/callback/google
```

Set these server environment variables on the corresponding Convex deployment:

```text
SITE_URL=https://YOUR_APP_HOST
GOOGLE_CLIENT_ID=your-google-web-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

The current local frontend uses the `dapper-lemming-169` production deployment with `SITE_URL=http://localhost:3000`. The hosted frontend uses the `calculating-seal-739` development deployment with its hosted `SITE_URL`. Keep each callback and credential configuration aligned with the deployment the frontend actually calls. Google credentials have been stored on those deployments and their `SITE_URL` values checked. Register the localhost callback in Google for the local frontend. If the Google consent screen is in testing mode, add the Google accounts used for testing as test users.

The frontend keeps its existing `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL`. Google credentials belong only on Convex. Do not put the secret in a `NEXT_PUBLIC_` variable or commit it to the repository. The Google provider is enabled only when both credentials are present. Password sign-in continues to work without them.

Deploy the Convex changes and frontend after configuring the client and callback URLs.

## Existing password accounts

An existing account with a verified email links automatically when Google returns the same verified email. Existing password accounts in this app usually have unverified emails. Google sign-in for those accounts asks the user to sign in with their password once, then opens Account and sign-in. The user selects Connect Google and chooses the Google account with the same email. Later sign-ins can use either method.

Keep `requireLocalEmailVerified: true` and `allowDifferentEmails: false`. Automatically connecting Google to an unverified password account can let someone pre-register another person's email, then retain password access when the real email owner signs in with Google. Explicit linking proves access to both accounts before joining them.

## Google-first accounts

Open the avatar menu, choose Account and sign-in, then add a password. The server requires an active account, a verified email, a linked Google account, and a session created within the last five minutes. The password must meet Better Auth's password rules. An existing password cannot be overwritten through this action. If the session is older, use Sign in with Google again and retry.

## Validation

`tests/google-auth.test.ts` runs Better Auth's account-linking logic with only Google's remote token/user-info responses replaced. It covers shared user IDs, the unverified-account safeguard, matching emails for explicit links, and Google-first password sign-in. Convex tests exercise password setup against the real component adapter, including suspended accounts, unverified emails, expired/revoked sessions, and session freshness. Auth dialog tests cover destination preservation, duplicate submission, network errors, and the password-confirmation route.

To verify the actual Google consent and redirect flow, configure real credentials and test both account orders with an authorized Google test account. No live Google sign-in has been verified by the local automated tests.
