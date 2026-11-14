# Support App Check configuration

The reported error occurred before submitting a ticket: the browser required `VITE_FIREBASE_APPCHECK_SITE_KEY`, but none was configured. The project also had Firebase App Check and reCAPTCHA Enterprise APIs disabled and no score-based reCAPTCHA key registered for this web app.

## Repair performed

- Enabled `firebaseappcheck.googleapis.com` and `recaptchaenterprise.googleapis.com` in `gen-lang-client-0168639596`.
- Created the score-based key **DTH Tamizhan App Check** and registered it for Firebase web app `1:398577360635:web:40a8a4f83b52434bf99a5e`, with the default one-hour token TTL and score policy.
- Restricted its domains to localhost/127.0.0.1, this project's Firebase Hosting domains and the DTH Cloud Run service hostnames. Domain verification remains enabled. Add a custom domain to this key's allowlist before using that domain.
- Added the registered public site key to `firebase-applet-config.json`. This is the browser-facing reCAPTCHA site identifier, not an OAuth token, provider secret, debug token or Gemini key.
- Configured the local ignored `.env` for the running development app. No environment secrets were committed.
- Added a public `GET /api/support/config` endpoint, exposing only the site key, with `Cache-Control: no-store`. Existing builds can load runtime configuration when neither a build variable nor a bundled key exists. Failed configuration loads can be retried.
- Kept required server-side App Check verification, app-ID binding, Firebase authentication and all rate/abuse limits. There is no attestation bypass.

Frontend key precedence: `VITE_FIREBASE_APPCHECK_SITE_KEY`, registered bundled Firebase config, then runtime endpoint. Server runtime overrides use `FIREBASE_APPCHECK_SITE_KEY` (or the existing `VITE_` variable), falling back to the registered bundled config. Site-key changes require a page refresh; deployed code updates require the usual rebuild/deployment.

## Verification

- The running local server returned HTTP 200 from `/api/support/config`, with a configured key and no-store headers.
- Cloud registration returned the site key for the correct Firebase app; key domain restrictions were verified.
- Unit tests cover bundled configuration, runtime fallback, failure/retry, public-only output and server rejection of invalid/missing App Check.
- TypeScript and production build pass. No real customer ticket, email, payment or refund was created to test this fix. The browser's real attestation completes when the customer refreshes and retries.

Firebase setup reference: [App Check with reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider).

## Files changed

- `.env.example`
- `firebase-applet-config.json`
- `server/routes/authConfig.ts`
- `src/lib/ticketAppCheck.ts`
- `tests/authConfig.test.ts`
- `tests/ticketAppCheck.test.ts`
- `docs/app-check-setup.md`

Local `.env` was updated separately and remains ignored by Git.
