# DTH Tamizhan

DTH Tamizhan is an English/Tamil DTH recharge, support and new-connection web application for Sun Direct, Tata Play, Airtel Digital TV, Dish TV and D2H.

The application is built with React 19, TypeScript, Vite, Express, Firebase Authentication, Firestore and Razorpay. It includes a customer-facing catalog and booking flow plus an administrator portal for recharges, payments, support, catalog data and reporting.

## Features

- Recharge planning and custom top-ups for supported DTH operators.
- Operator-specific subscriber ID validation.
- Saved set-top boxes with per-account storage.
- English/Tamil localization.
- Google, email/password, passwordless email-link and optional Firebase phone OTP sign-in.
- Recharge assistant with optional Gemini-backed ranking and a local catalog fallback.
- Razorpay sandbox/production checkout and server-side payment verification.
- Manual recharge fulfillment: captured payment, pending order, operator-side recharge, administrator confirmation.
- Customer recharge history and PDF/HTML receipt downloads.
- New-connection catalog, comparison, booking, cancellation and owner-only tracking.
- Help/support tickets, paid service requests, App Check protection and notification workflows.
- Excel catalog import/export and Firestore/file-backed persistence.
- Administrator directory, approvals, revocation, reports and operator settings.

Recharge fulfillment is manual unless a separate provider integration is added. A successful payment does not itself recharge a subscriber; an administrator must confirm completion after completing the recharge through the operator/distributor process.

## Requirements

- Node.js 22
- npm
- Firebase project with Authentication and Firestore enabled
- Java and Firebase CLI only for local Firestore emulator tests
- Razorpay account/keys only for Razorpay checkout

## Quick start

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:3000`.

The Express server serves both the API and Vite development frontend. The default port is `3000`; override it with `PORT`.

Create the local environment file before starting the application:

```dotenv
PORT=3000
NODE_ENV=development
PERSISTENCE_DRIVER=file
RECHARGE_ENABLED=false
PAYMENT_MODE=sandbox
APP_URL=http://localhost:3000
CSP_MODE=report-only
```

Use `PERSISTENCE_DRIVER=firestore` for shared development or production data. Production refuses file persistence.

## Environment configuration

See `.env.example` for the complete template. Environment variables should be configured on the server; never expose secrets through `VITE_*`.

| Variable | Purpose |
| --- | --- |
| `PORT` | Express/Vite server port; defaults to `3000`. |
| `NODE_ENV` | Use `production` for the built server; development uses Vite middleware. |
| `APP_URL` | Public application origin used in metadata and callbacks. |
| `PERSISTENCE_DRIVER` | `firestore` or `file`. Firestore is required in production. |
| `RECHARGE_ENABLED` | Enables recharge routes and UI. Set to `true` for recharge checkout. |
| `PAYMENT_MODE` | `sandbox` uses the local simulator; `production` uses Razorpay. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay server credentials; only the key ID may be public. |
| `VITE_RAZORPAY_KEY_ID` | Optional public Razorpay key override for browser checkout. |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | Public Firebase App Check/reCAPTCHA site key. |
| `FIREBASE_PHONE_AUTH_ENABLED` | Opt-in switch for the Firebase phone OTP UI and API. |
| `BREVO_ENABLED`, `BREVO_API_KEY` | Enable server-side transactional receipt/confirmation email. |
| `EMAIL_WORKER_TOKEN` | Protects the external receipt-email worker endpoint. |
| `GEMINI_FREE_ENABLED`, `GEMINI_FREE_API_KEY` | Enables verified free-tier Gemini plan assistance. |
| `WAY2API_API_KEY` | Optional server-only live DTH customer lookup provider. |
| `DTH_CUSTOMER_LOOKUP_ENABLED` | Enables or disables customer lookup endpoints. |
| `RAZORPAY_RECHARGE_WEBHOOK_SECRET` | Verifies recharge payment webhooks. |
| `RECHARGE_SCHEDULER_SECRET` | Protects payment reconciliation requests. |
| `NC_RAZORPAY_TEST_ENABLED` | Enables test-only Razorpay checkout for new connections. |
| `CSP_MODE` | `report-only` or `enforce` for production Content Security Policy. |
| `DISABLE_HMR` | Set to `true` to disable Vite HMR and file watching. |

Additional email, reconciliation, App Check, lookup, storage and AI settings are documented in `.env.example`.

## Firebase setup

Configure `firebase-applet-config.json` with the Firebase project, web app and named Firestore database.

In Firebase Console:

1. Enable the Authentication providers that are supported in your deployment:
   - Google
   - Email/Password
   - Email link (passwordless sign-in)
   - Phone, if SMS OTP is required
2. Add deployed domains to Authentication authorized domains.
3. Configure reCAPTCHA/App Check before enabling protected ticket or lookup workflows.
4. Deploy `firestore.rules` and `firestore.indexes.json` for any rule/index changes.
5. Provide server Application Default Credentials or a protected service-account credential for local Admin SDK use.

Never commit service-account JSON or server secrets.

## Persistence

The server supports two persistence modes:

- `PERSISTENCE_DRIVER=file`: development JSON storage under `data/`.
- `PERSISTENCE_DRIVER=firestore`: shared production storage using the named database in `firebase-applet-config.json`.

Production startup requires Firestore and refuses file persistence.

Useful storage commands:

```powershell
npm run storage:check
npm run storage:migrate
npx tsx scripts/migrate-persistence.ts --apply
```

The migration command starts as a dry run unless `--apply` is supplied. Review migration conflicts and stop all writers before applying changes.

Main server collections include `server_payments`, `server_recharges`, `server_email_outbox`, `server_email_payloads`, `server_customers`, `server_admin_requests`, `server_installation_requests`, `server_deleted_plans` and `server_runtime`.

## Razorpay checkout

Set server-only Razorpay credentials and select the desired mode:

```dotenv
PAYMENT_MODE=sandbox
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
VITE_RAZORPAY_KEY_ID=""
```

Use `sandbox` for the local simulator. Use `production` with a Razorpay test or live account for Standard Checkout.

Checkout behavior:

- A signed-in Firebase user is required.
- Catalog prices are calculated and validated on the server.
- Provider order ownership is written to the server ledger.
- Payment verification validates HMAC, provider order/payment state and account ownership.
- Captured payments appear in Pending Orders.
- Repeated verification or sync does not duplicate an order.
- Test payments are labeled and excluded from live totals.
- Administrators manually confirm fulfillment.

Configure webhooks and payment reconciliation before relying on unattended live-payment updates. Static hosting and `npm run preview` do not provide Express API routes.

## Brevo receipt email

Brevo can deliver payment receipts and recharge confirmations with PDF attachments.

```dotenv
BREVO_ENABLED=true
BREVO_API_KEY=""
BREVO_SENDER_EMAIL="support@example.com"
BREVO_SENDER_NAME="DTH Tamizhan"
BREVO_DAILY_LIMIT=300
BREVO_SEND_TEST_EMAILS=false
```

The recipient must be a Firebase-verified email identity. Email delivery uses a shared Firestore outbox and lease in production and is handled by the background worker or an external scheduler. Email failures do not undo payment or recharge status.

To protect an external worker:

```dotenv
EMAIL_WORKER_TOKEN="at-least-32-random-characters"
```

The external process should call `POST /api/internal/email/process` with `Authorization: Bearer <token>` at a conservative interval.

## Optional Gemini plan assistance

Gemini assistance is disabled unless both `GEMINI_FREE_ENABLED=true` and `GEMINI_FREE_API_KEY` are configured.

The key must belong to a separate Google project with no linked billing account. The server verifies key ownership and billing status before a model request. No fallback is made to legacy Gemini keys or paid models.

```powershell
npm run ai:check-free
```

When verification, quota or provider configuration prevents AI use, Browse Packs displays constrained catalog matches instead.

## New connections

The application includes a separate new-connection flow with:

- Public and protected catalog views.
- Brand, package, validity and channel comparison.
- Booking quotes and installation-date validation.
- Optional test-only Razorpay or local provider payments.
- Owner-authenticated order tracking.
- Cancellation requests and administrator review.
- Public status timelines with internal notes excluded.

New-connection payment settings are separate from recharge `PAYMENT_MODE` and Razorpay's live recharge configuration.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Recharge launch/home |
| `/recharge` | Recharge checkout |
| `/plans` | Browse packs |
| `/connections` | Saved set-top boxes |
| `/new-connection` | New-connection catalog |
| `/account/bookings` | New-connection booking history |
| `/account` | Account/profile |
| `/history` | Recharge history and receipts |
| `/help` | Support request help |
| `/service-request` | Redirect alias for `/help` |
| `/support` | Redirect alias for `/help` |
| `/my-tickets` | Customer tickets |
| `/auth/email-link` | Passwordless email-link callback |
| `/admin` | Redirect to `/admin/customers` |
| `/admin/:tab` | Administrator tabs |

Policy route paths are generated from `POLICY_ROUTES`. Unknown application routes use the configured 404 response.

## Project structure

- `src/`: React application, components and client utilities.
- `server/`: Express routes, middleware, controllers and models.
- `server.ts`: server entry point and Vite integration.
- `public/`: static assets.
- `scripts/`: migrations, imports and validation utilities.
- `tests/`: Vitest unit and integration tests.
- `docs/`: implementation guides and reports.
- `data/`: ignored/local file-persistence data.
- `artifacts/` and `tmp/`: generated review and temporary files.
- `dist/`: production build output.

## Validation and tests

```powershell
npm run lint
npm run check:i18n
npm run test:unit
npm test
npm run build
```

- `lint`: TypeScript type-check.
- `check:i18n`: English/Tamil key, interpolation and UTF-8 validation.
- `test:unit`: focused unit tests.
- `test`: complete Vitest suite.
- `test:rules`: Firestore rules tests without emulator setup.
- `test:emulator`: starts the Firebase emulator and runs rules tests.
- `build`: creates frontend assets and `dist/server.cjs`.

Run the Firestore emulator suite on a machine with Java and the Firebase CLI:

```powershell
npm run test:emulator
```

## Production build

```powershell
npm run build
$env:NODE_ENV = "production"
$env:PERSISTENCE_DRIVER = "firestore"
npm start
```

The process must have access to Firestore and all required server environment variables.

Firebase Hosting configuration is in `firebase.json`. Static assets are built to `dist/`, API/page requests are forwarded to the configured Cloud Run service, and Express renders metadata and error responses.

Before deployment:

1. Build and run the complete tests.
2. Verify Firestore rules and indexes.
3. Configure server-only credentials.
4. Verify Razorpay webhooks and test/live key mode.
5. Configure Brevo and the email worker if required.
6. Configure App Check and Firebase providers.
7. Deploy the backend before relying on Hosting API rewrites.
8. Exercise sign-in, checkout, fulfillment, history and PDF downloads.

`npm run preview` serves only frontend assets and cannot provide Express API routes.

## Demo and local fixtures

The application does not seed demo customers or orders during normal startup.

Fixture export scripts require `NODE_ENV=development` and explicit confirmation flags. Exported files belong under `.local-fixtures/` and must not be committed.

## Storage and security notes

- Browser state must not be treated as administrator authorization.
- Firebase ID tokens and server registry records are used for authorization.
- Firestore rules restrict users to their own UID-owned data.
- Server-only collections must not be exposed through public client configuration.
- Rate limits, validation, App Check and security headers provide defense in depth but do not replace provider abuse controls.
- `.env`, `data/` and `.local-fixtures/` must remain excluded from Git.

## Documentation

- [Documentation index](docs/README.md)
- [Database usage](docs/database-usage.md)
- [New-connection implementation](docs/new-connection-management.md)
- [Payment and recovery](docs/youpi-payments.md)
- [DTH lookup](docs/dth-lookup.md)
- [Unified help](docs/unified-help.md)
