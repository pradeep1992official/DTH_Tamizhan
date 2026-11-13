# DTH Tamizhan

English and Tamil DTH pack browsing, recharge checkout, saved set-top boxes and administration for Sun Direct, Tata Play, Airtel Digital TV, Dish TV and D2H.

Built with React, TypeScript, Vite, Express, Firebase Authentication and Firestore. Several server datasets use local JSON files.

**Live payments and operator recharge dispatch are not implemented.** Sandbox checkout simulates outcomes without taking money, creating financial orders or crediting an operator account.

## Local setup

Use Node.js 22 (matching CI) and npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:3000`. Express serves the API and Vite frontend. `PORT` overrides the default port.

Configure Firebase in `firebase-applet-config.json`, including `firestoreDatabaseId`. Enable Google sign-in and authorize the application domain in Firebase Authentication. Server Firebase operations require Application Default Credentials available to the Firebase Admin SDK. Do not commit credentials.

| Variable | Current behavior |
| --- | --- |
| `PORT` | Server port, default `3000` |
| `NODE_ENV` | `production` serves built assets; other values use Vite middleware |
| `PAYMENT_MODE` | Only `sandbox` enables simulated checkout. Missing/other values select production mode, where payments currently return provider unavailable |
| `APP_URL` | Public origin for server-rendered metadata and canonical links |
| `GEMINI_API_KEY` | Backend AI recommendations; no frontend integration yet |
| `PAYMENT_GATEWAY_KEY` | Reserved, currently unused; does not enable live payments |
| `WHATSAPP_API_TOKEN` | Currently unused; automatic messaging is not implemented |
| `DISABLE_HMR` | `true` disables Vite HMR and watching |

### Production build

```powershell
npm run build
$env:NODE_ENV = 'production'
npm start
```

The build creates frontend assets in `dist/` and the Express bundle at `dist/server.cjs`. Run from the project directory with runtime configuration available. `npm run preview` previews frontend assets only; use Express for API-backed flows.

## Implemented features

- English/Tamil interface, operator-specific subscriber ID validation and custom recharge amounts.
- Recommended HD/SD packs, duration selection, catalog filtering, comparison and supplied channel details.
- Sandbox checkout sessions with simulated success/failure/pending outcomes, expiry and retry handling.
- Google sign-in. Phone OTP login is not implemented.
- My Account with profile/contact details, name/mobile editing, saved-box preview and support/recharge links. Profile editing is part of My Account rather than a separate header option.
- Saved-box add/edit/remove, operator logos, compact cards, saved expiry/status and prefilled recharge. Invalid IDs offer Update ID instead of Quick Recharge. Balance display is removed because live retrieval is unavailable.
- Admin customer directory, pending queue, recharge history, pack management, payment reports, reports/audit views, operator settings and administrator approvals.
- Excel catalog import/export and installation-request submission to a local JSON file.
- Support, refund, privacy and terms pages in English/Tamil. Business details still contain placeholders.

Expiry reflects saved information or recharge-duration calculations, not a live operator response. The checkout summary shrinks while pinned and expands in its normal position. Desktop header/footer content uses 16px edge padding; the footer includes quick links and policies. Frontend em dashes are replaced with hyphens, including unavailable-price placeholders.

## Sitemap

| Route | Page |
| --- | --- |
| `/`, `/recharge` | Recharge |
| `/plans` | Browse packs |
| `/connections` | Saved set-top boxes |
| `/account` | Account and profile editing |
| `/contact` | Contact/support |
| `/refund-policy` | Refund and cancellation policy |
| `/privacy-policy` | Privacy policy |
| `/terms` | Terms of use |
| `/admin/customers` | Customer directory |
| `/admin/pending` | Pending orders |
| `/admin/recharges` | Recharge history |
| `/admin/packs` | Pack management |
| `/admin/payments` | Payment reports |
| `/admin/reports` | Reports and audits |
| `/admin/operators` | Operator availability/settings |
| `/admin/approvals` | Administrator access |
| `/500` | Service-error page |

`/admin` redirects to Customers. `/worker` and `/dealer` redirect to Pending Orders. Unknown routes return a 404. `/security` has been removed.

## Data ownership and storage

- Firestore rules restrict ordinary users to their own profiles and saved boxes. Authorized admins retain reads permitted by their role.
- Saved boxes use per-user browser keys: `dth_tamizhan_connections:<uid>`. The legacy shared cache migrates by recorded owner; guest entries are excluded.
- Logout clears boxes and recharge details from view. Account switches filter visible records and ignore stale remote-loading results.
- Profile editing checks the Firebase session and writes editable fields without cached role/privilege fields.
- Several server datasets use in-memory collections and JSON under `data/`, rather than shared database storage. Sandbox sessions are process-local and do not persist financial orders.
- `.env` files, `data/` and `.local-fixtures/` are ignored by Git.

This is not a complete security audit. Firebase sign-out/auth-state synchronization is unfinished: logout currently clears local application state without signing out the Firebase session.

## Incomplete workflows

| Feature | Remaining work |
| --- | --- |
| Live payments/refunds | Gateway orders, hosted payment/QR, verified webhooks, reconciliation and refund execution |
| Actual DTH recharge | Operator/distributor dispatch and confirmation |
| Order fulfillment | Status-update endpoint currently returns a verification-not-configured error |
| Subscriber lookup | Endpoint searches local customer records; no live provider lookup |
| Payment-to-receipt flow | Receipt UI, printing and manual WhatsApp sharing exist, but checkout does not invoke the completed-payment callback |
| Installation fulfillment | Admin request management, assignment, scheduling and status tracking |
| AI recommendations | Backend `/api/ai/recommend-plans` exists; frontend does not call it |
| Automatic notifications | SMS, WhatsApp and email delivery; receipt sharing currently opens WhatsApp manually |
| Account lifecycle | Firebase session synchronization/sign-out; load saved profile edits on login rather than rebuilding from Google data |
| Customer order history | Backend listing exists without a dedicated customer history page |
| Business information | Replace `[FILL IN]` values in `src/lib/trustContent.ts` and `src/lib/policyTranslations.ts` |
| Production persistence | Durable shared storage instead of server-local files where required |

## Checks and tests

```powershell
npm run lint
npm run check:i18n
npm run test:unit
npm test
npm run test:emulator
npm run build
```

`lint` checks TypeScript. `check:i18n` checks language-key parity, interpolation tokens, policy coverage and damaged text. `test:unit` runs selected savings, filtering and Excel-parser tests. Firestore rules tests require the emulator; `test:emulator` starts it and requires Java and the Firebase CLI.

Recent regression suites:

```powershell
npx vitest run tests/connectionCache.test.ts tests/accountProfile.test.ts tests/savedConnectionDialog.test.tsx
npx vitest run tests/copyLocalization.test.tsx tests/paymentLocalizationStates.test.tsx tests/pageMetadataAssets.test.ts tests/pageResponses.test.ts
```

CI in `.github/workflows/ci.yml` installs dependencies, checks TypeScript, runs selected unit tests and Firestore emulator tests, then builds. It does not run every Vitest suite or the localization command.

Current build warnings concern large frontend chunks and `import.meta` in the CommonJS server bundle. A successful build does not verify deployed credentials, live payments or operator integration.

## Deployment

`firebase.json` serves static assets from `dist/`, excludes `index.html` from static Hosting uploads, and forwards API/page requests to Cloud Run service `dth-tamizhan` in `asia-south1`. Express supplies page-specific metadata and error responses.

Deploy the backend before relying on Hosting rewrites. Deploy Firestore rules separately when changed. Local builds do not deploy the app or rules. Cloud Run's local filesystem is not durable shared application storage.

## Demo fixtures

Runtime reads do not create demo customers, orders, connections or catalog records. For isolated fixture export, set `NODE_ENV=development`, run `npx tsx scripts/seed-demo-admin.ts`, and enter the requested confirmation phrase. Files export to `.local-fixtures/` without contacting a database.
# Razorpay checkout

Customers must sign in before opening checkout. Order creation, signature verification, and simulator endpoints require a server-verified Firebase ID token. Razorpay orders store the authenticated customer's UID in server-written notes, and verification rejects orders belonging to another account. Legacy payments without customer ownership metadata remain available to authorized administrators through provider sync but cannot be claimed by customers.

Run `npm install`, copy `.env.example` to `.env` when setting up a new machine, and set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and optionally `VITE_RAZORPAY_KEY_ID` (public key only). Set `PAYMENT_MODE=production` to use Razorpay Standard Checkout; `sandbox` selects the existing local simulator. Razorpay test keys still use Razorpay's test environment in production mode. The browser receives the public key from the order endpoint so it always matches the backend key.

Run `npm run dev` and open http://localhost:3000. Choose an operator, enter a valid subscriber ID, select a plan or custom top-up, review checkout, and click **Pay securely**. Complete the Razorpay test flow, cancel the modal, and try a failed payment. Success is shown only after server verification. If verification fails after payment, retry verification instead of paying again. Use test payment details from [Razorpay's integration guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

`POST /api/create-order` accepts either a catalog selection (`packId`, `operator`, `smartCardNumber`, optional `customAmount` in rupees), or `{ "amount": 100, "currency": "INR", "receipt": "optional-reference" }` with amount in paise. Catalog prices are calculated server-side. `POST /api/verify-payment` accepts `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`; it verifies the HMAC and provider order/payment and returns `paid: true` only for a captured payment. The generic amount endpoint does not purchase a catalog plan or authorize fulfillment.

Set the server environment variables in your deployment, serve the unified Express backend (`npm run build` then `npm start`), and configure automatic capture in the Razorpay Dashboard. Static-only hosting and `npm run preview` do not provide these API routes. Never publish `.env` or prefix the secret with `VITE_`. No credentials belong in tracked files.

Verified Razorpay payments are recorded atomically in `data/razorpay_payments.json` and shown in Admin → Payments. Test records are labeled and excluded from live totals. A super administrator can use **Sync recent Razorpay payments** to import the latest 100 provider payments from the configured account and key mode, including older payments and payments completed after the browser closed. Older orders without DTH metadata show unavailable subscriber/plan details; new checkout orders include that metadata. This sync does not initiate or capture payments. Disk storage requires a persistent volume and a single server process; use a shared durable store before deploying multiple instances.

Admin → Pending Orders and customer order history derive captured recharge requests from this same durable ledger. Only payments with a valid operator, subscriber ID, and plan enter the queue; standalone or legacy payments without that metadata stay in Payments. Administrators can mark captured-payment orders successful, including test orders; completion is saved to `data/recharge_orders.json`. Test markers are retained, and completed test orders are excluded from customer recharge totals. Marking an order successful records the administrator's confirmation and does not call an operator recharge API. Payment authorization alone does not queue a recharge. Repeated verification/sync does not duplicate the request or reset an existing fulfillment status.

This integration confirms payments but does not fulfill DTH recharges. Before live fulfillment, connect verified payments to your order workflow and add durable reconciliation/webhooks. No database tables were added.

Checks: `npm run lint`, `npx vitest run tests/razorpay.test.ts tests/payments.test.ts tests/copyLocalization.test.tsx`, and `npm run build`.

