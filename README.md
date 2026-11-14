# DTH Tamizhan

English and Tamil DTH pack browsing, recharge checkout, saved set-top boxes and administration for Sun Direct, Tata Play, Airtel Digital TV, Dish TV and D2H.

Built with React, TypeScript, Vite, Express, Firebase Authentication and Firestore. Several server datasets use local JSON files.

**Razorpay Standard Checkout is integrated; the current configuration uses test keys. DTH recharge fulfillment is manual.** After payment capture, the request appears in Pending Orders. An administrator recharges the subscriber through their operator/distributor portal, confirms success, then clicks **Mark Successful**. Automatic operator dispatch is outside the intended scope.

The separate local sandbox simulator does not collect money or credit an operator account.

Subscriber verification follows the manual workflow: customers enter their subscriber ID and contact details, and the administrator checks the ID in the operator/distributor portal before recharging. The app can search locally saved customer records; it does not retrieve live operator balances or account details. Live provider lookup is optional and outside the current scope.

## Project structure

- `src/`: React application, components, styles and client utilities.
- `server.ts` and `server/`: Express entry point and backend code.
- `public/`: static assets served by Vite.
- `scripts/`: maintenance, import, migration and validation utilities.
- `tests/`: automated tests and fixtures.
- [docs/](docs/README.md): documentation index, implementation reports and audit results.
- `data/` and `.local-fixtures/`: ignored local runtime data and fixtures.
- `artifacts/` and `tmp/`: generated review output and temporary working files.
- `dist/`: generated production build.

## Local setup

Use Node.js 22 (matching CI) and npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:3000`. Express serves the API and Vite frontend. `PORT` overrides the default port.

Configure Firebase in `firebase-applet-config.json`, including `firestoreDatabaseId`. Enable Google and Email/Password sign-in and authorize the application domain in Firebase Authentication. Phone OTP is supported but requires separate provider, billing/domain/region setup and the opt-in server flag described below. Server Firebase operations require Application Default Credentials available to the Firebase Admin SDK. Do not commit credentials.

| Variable | Current behavior |
| --- | --- |
| `PORT` | Server port, default `3000` |
| `NODE_ENV` | `production` serves built assets; other values use Vite middleware |
| `PAYMENT_MODE` | Only `sandbox` enables simulated checkout. Missing/other values select production mode, where payments currently return provider unavailable |
| `APP_URL` | Public origin for server-rendered metadata and canonical links |
| `GEMINI_FREE_API_KEY`, `GEMINI_FREE_ENABLED` | Optional free-tier plan ranking in Browse Packs; requires verified unbilled key ownership. Catalog suggestions work without a key. |
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

### Recharge assistant

Signed-in customers can open **Ask AI to recharge your box** on Recharge or Saved Boxes and enter, for example, `Recharge 6 month HD for hall box`. The box must already be saved in their account with the nickname `Hall` or `Hall Box`. The assistant asks for missing duration/quality or a box choice, then lists matching catalog packs with their actual prices. **Continue to payment** opens the existing checkout; the customer completes payment there. Verified paid recharges follow the existing manual administrator fulfillment workflow.

`POST /api/ai/recharge` requires a Firebase bearer token and queries only that UID's saved boxes. Gemini extracts preferences from up to 12 customer messages; server code resolves boxes and validates catalog plans. It cannot create paid orders or mark a recharge complete. The existing `GEMINI_FREE_*` configuration, billing verification and quotas also apply to this assistant. When AI is unavailable, a limited English command matcher supports the example syntax and clearly labels that fallback. Flexible English/Tamil interpretation requires configured Gemini credentials. Messages (including box nicknames typed by the customer) are sent to Gemini when enabled; subscriber IDs and saved-box records are resolved locally on the server and are not included in the model request. Chat history stays in page memory and clears on account change or **New request**.

- English/Tamil interface, operator-specific subscriber ID validation and custom recharge amounts.
- Recommended HD/SD packs, duration selection, catalog filtering, comparison and supplied channel details.
- Sandbox checkout sessions with simulated success/failure/pending outcomes, expiry and retry handling.
- Google and email/password sign-in (the default Email option), with registration, password reset and optional passwordless email links. Phone OTP sign-in/linking is implemented with reCAPTCHA and a resend cooldown; SMS is off by default until configured.
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
| `/history` | Signed-in customer's recharge history, payments and PDF receipts |
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
- Production uses shared Firestore persistence for payments, fulfillment, the email outbox, plans, operator settings, customer lookup records, admin access requests and installation requests. Local JSON is an explicit development option. Sandbox simulator sessions remain process-local and never persist financial orders.
- `.env` files, `data/` and `.local-fixtures/` are ignored by Git.

This is not a complete security audit. Firebase authentication is the source of truth for account state: refresh restores the Firebase session, auth changes synchronize across tabs, and sign-out ends that session before clearing account UI and local connection cache. Saved profile name/phone fields load from the UID-keyed Firestore user document and synchronize without being overwritten by Google login. Stored profile roles are not used to authorize admin access.

## Incomplete workflows

| Feature | Remaining work |
| --- | --- |
| Live payment readiness/refunds | Activate and configure live Razorpay keys when ready; add verified webhooks, automatic reconciliation and refund execution. Orders, hosted checkout and server signature/capture verification are implemented. |
| Installation fulfillment | Not applicable: SMP Enterprises offers DTH recharges only; no installation services or quotations |
| Plan recommendations | Browse Packs → Help me choose calls `/api/ai/recommend-plans`. Free-tier Gemini ranking is optional and blocked unless its key belongs to a verified unbilled project; catalog suggestions remain available. See Free-tier plan suggestions below. |
| Optional notifications | Manual WhatsApp drafts are available in Admin Payments → View for captured payments and Recharge history → View for completed recharges, plus after Mark Successful. The administrator reviews and presses Send in WhatsApp. Brevo receipt/confirmation emails are implemented; configure server credentials to activate them. SMS and automated WhatsApp delivery are not implemented. |
| Business information | Business and grievance details populated in English/Tamil; policy effective date to be decided after launch |
| Production persistence | Implemented with the existing named Firestore database. Configure server credentials and migrate any local records before deployment; see Shared production storage below. |

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

Verified Razorpay payments are recorded transactionally in Firestore `server_payments` (`data/razorpay_payments.json` only in local file mode) and shown in Admin → Payments. Test records are labeled and excluded from live totals. A super administrator can use **Sync recent Razorpay payments** to import the latest 100 provider payments from the configured account and key mode, including older payments and payments completed after the browser closed. Older orders without DTH metadata show unavailable subscriber/plan details; new checkout orders include that metadata. This sync does not initiate or capture payments. Production reads and writes the shared Firestore database; a failed database operation never falls back to server-local files.

Admin → Pending Orders and customer order history derive captured recharge requests from this same durable ledger. Only payments with a valid operator, subscriber ID, and plan enter the queue; standalone or legacy payments without that metadata stay in Payments. Administrators can mark captured-payment orders successful, including test orders; completion is saved transactionally to Firestore `server_recharges` (`data/recharge_orders.json` in local file mode). Test markers are retained, and completed test orders are excluded from customer recharge totals. Marking an order successful records the administrator's confirmation and does not call an operator recharge API. Payment authorization alone does not queue a recharge. Repeated verification/sync does not duplicate the request or reset an existing fulfillment status.

The manual recharge workflow is implemented: captured payment → Pending Orders → administrator recharges through the operator/distributor portal → administrator confirms success with **Mark Successful** → completed recharge history. An automatic DTH recharge API is not required for this workflow. Before accepting live payments, configure live credentials and add durable reconciliation/webhooks for reliable background payment updates. No database tables were added.

## Sign-in methods

The sign-in dialog supports **Google**, **Email** (email/password by default, with **Use a sign-in link instead** as an alternative), and **Phone number** (Firebase SMS OTP). Firebase manages passwords and verification codes; they are not stored in application profile documents or browser storage. Saved profile edits and the authenticated UID continue to drive the account, boxes, checkout and private history.

Passwordless flow: enter an email → **Email me a sign-in link** → open the email → confirm that address at `/auth/email-link` → continue to Your account. No password is required, and Firebase verifies the email during completion. New email-link users are registered automatically. Opening the link on another device prompts for the same email address. The app stores only a short-lived email/flow hint (up to 24 hours), never the action code or link; it does not take an email address from URL parameters. Expired, invalid or used links show a recovery message. The callback route is `noindex`, uses `no-referrer`, and removes the action code from the address bar after success.

Manual Firebase Console setup is required; adding frontend code does not activate providers on the Firebase project:

1. Open Firebase Console → project `gen-lang-client-0168639596` → Authentication → Sign-in method. Enable **Email/Password**, then enable **Email link (passwordless sign-in)** in that provider and save. Firebase requires the Email/Password provider enabled even for email-link sign-in. Keep Google enabled.
2. Add your deployed hostname under Authentication → Settings → Authorized domains. Confirm the project's password policy and Firebase verification/reset email templates. Email verification and password resets use Firebase's own email service, separate from Brevo receipt emails.
3. For phone sign-in, explicitly enable the **Phone** provider, configure SMS region policy for your customer regions, and use an authorized deployed HTTPS domain. Real verification SMS requires the **Blaze** billing plan and can incur per-SMS charges; this is not an unlimited free login method. See [Firebase authentication limits](https://firebase.google.com/docs/auth/limits) and [phone authentication setup](https://firebase.google.com/docs/auth/web/phone-auth).
4. Only after that setup, set `FIREBASE_PHONE_AUTH_ENABLED=true` in the server environment and restart/redeploy. It defaults to `false`; the app displays an unavailable message instead of attempting SMS. This app flag does not replace Firebase's billing, quota, region and abuse controls. No billing plan was upgraded by this code change.
5. For no-SMS-cost testing, configure fictional phone numbers and fixed codes in Firebase Console → Authentication → Sign-in method → Phone → Phone numbers for testing. Do not put test numbers/codes in source, bypass reCAPTCHA in production, or send real SMS during automated tests. Firebase does not allow localhost as a hosted domain for phone authentication; test the phone flow on an authorized deployed HTTPS domain.

Phone OTP flow: choose **Phone number**, enter a mobile number (Indian 10-digit numbers get `+91` automatically), complete reCAPTCHA, then enter the six-digit SMS code. Resend has a 60-second cooldown; **Change number** starts again. Firebase checks the code, and the app uses the resulting authenticated session for checkout and private history. The dialog discloses SMS consent, possible standard rates and Google's handling of the number. Phone possession can change; Google and email remain available as alternative sign-in methods. reCAPTCHA is recreated after send/render failures and cleaned up when leaving the dialog.

Existing customers should sign in using their original method, then open **Your account → Manage sign-in methods** to add a password or link a verified phone number. Linking retains the same UID, boxes and recharge history. Accounts are not automatically merged based on matching names, phone profile fields or email strings. If a credential is already linked to another Firebase account, sign-in shows an error instead of merging records. A profile contact number alone is not a phone-login credential; it must be linked through OTP verification.

The same account-management dialog can email a passwordless linking link, including for a phone-only account adding an email. Complete it while signed in to the original account; on another device, sign in to that original account before confirming the link. Existing email providers are reauthenticated rather than linked twice. Using the normal email-link sign-in with an existing email relies on Firebase's identity handling, rather than creating or copying application records.

**Free-plan limit:** Firebase currently allows only **5 email-link sign-in emails per day on Spark**, versus 25,000 on Blaze. This quota is separate from Brevo's 300 receipt emails/day, and this implementation uses Firebase's official `sendSignInLinkToEmail` service. No billing change is made. Google sign-in and password sign-in remain alternatives if the link quota is reached. See [Firebase email-link documentation](https://firebase.google.com/docs/auth/web/email-link-auth) and [authentication limits](https://firebase.google.com/docs/auth/limits).

Password-created email accounts receive a verification email. Open that link, then use **Manage sign-in methods → Check verification** (or sign out/in) to refresh verification before expecting automatic receipt email delivery. Passwordless email-link sign-in verifies the email when the link is completed. Phone-only accounts can sign in and pay, but need to link and verify an email to receive emailed receipts. Only Firebase-verified email identities qualify for super-administrator email-based access.

## Automatic receipt email (Brevo)

Customer self-service history is available at **`/history`**, through **Your recharge history** in the account menu and **View history** on the account page. Signed-in customers can view their own recharge requests across all boxes, filter by connection/status, inspect order/payment references, and download PDF receipts for captured payments. A completed order downloads a recharge confirmation. Guests are prompted to sign in; data and receipt downloads are restricted server-side to the authenticated UID, including for administrators using this personal page. Internal admin notes are excluded. The page is marked `noindex` and its API responses use `Cache-Control: no-store`. Administrators retain the separate Customers → View page.

Brevo sends two transactional emails per eligible order: a payment receipt after provider-confirmed capture, then a recharge confirmation after an administrator clicks **Mark Successful**. Emails include the customer, subscriber ID, operator, pack, validity, amount and payment/order references, plus a customer-friendly PDF receipt attachment with embedded English/Tamil fonts and operator branding. The recipient is the verified Firebase sign-in email, saved server-side when creating the Razorpay order. Client-supplied recipient addresses are ignored. Older transactions without a recorded verified email do not send automatically.

Receipt formats:

- **Email attachments:** new payment receipts and recharge confirmations are attached as `.pdf` files that customers can open directly on their phone or computer. English and Tamil names are supported, and available operator logos appear on the receipt.
- **Checkout download:** the existing **Download payment receipt** button still downloads an HTML receipt, which can be opened and printed or saved as PDF through the browser.
- **Previously sent emails:** existing HTML attachments cannot be changed retroactively. Make a new test transaction to check the PDF attachment. Already-attempted delivery retries preserve their original attachment to avoid changing an in-flight request; accepted emails are not resent automatically.

Setup for local development and deployment:

1. Create a Brevo Free account, verify/approve your sender email or domain, and ensure transactional email is activated. Domain authentication may be required by Brevo for your sender.
2. Generate a Brevo **API key** (not an SMTP password).
3. Set these **server-only** environment variables in `.env` locally and in your deployed backend's environment:

   ```dotenv
   BREVO_ENABLED=true
   BREVO_API_KEY=your_brevo_api_key
   BREVO_SENDER_EMAIL=your_approved_sender@example.com
   BREVO_SENDER_NAME="DTH Tamizhan"
   BREVO_DAILY_LIMIT=300
   BREVO_SEND_TEST_EMAILS=false
   ```

4. Run `npm install` after pulling dependency changes, then restart/redeploy the Express server. Do not use a `VITE_` prefix for any Brevo credentials. Brevo delivery uses Node's built-in `fetch`. PDF receipts use `pdf-lib`, `@pdf-lib/fontkit`, `regenerator-runtime` for Tamil font shaping, and bundled OFL-licensed Noto fonts. Keep `public/assets/fonts` and the operator logo assets (or their copied `dist/assets` versions) in the deployment. PDF generation runs locally on the server without an external paid conversion service.
5. To test with the existing Razorpay test keys, temporarily set `BREVO_SEND_TEST_EMAILS=true`, sign in with a verified email you control, and make a **new** checkout order. After capture, wait about 30 seconds for the payment receipt and open its `.pdf` attachment. Check the customer name, subscriber ID, pack, amount and references. Mark the pending request successful and check the confirmation email's PDF too. Test emails are clearly labeled and still consume the email allowance. Turn the test-email flag off afterwards.

The free plan currently includes 300 email sends per day; verify current limits in [Brevo's plan documentation](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans). The app caps unique delivery attempts at a maximum of 300 per rolling 24 hours, deferring additional jobs. Two emails per order means roughly 150 orders per day if the account sends no other emails. Other apps sharing your Brevo account also consume the provider allowance. Hosting/domain costs are separate. The application does not upgrade your plan or purchase credits.

The production outbox is Firestore `server_email_outbox`, with PDF payload chunks in `server_email_payloads`. A renewable transactional lease in `server_runtime` permits one sender across all instances and shares the rolling daily cap. Local file mode uses `data/email_outbox.json` and is limited to one development process. A worker runs every 30 seconds; retries reuse a stored idempotency key and frozen email body, and accepted jobs are not resent after restart or repeated payment verification. Network/server errors retry within a conservative 14-minute window; uncertain old sends require checking Brevo logs before resending. Rate limits defer retries. Explicit rejections can be requeued by the super administrator after fixing the sender/credentials.

Check **Admin → Payments → Receipt emails** for configuration, queued, accepted, rejected and review counts. “Accepted” means Brevo accepted the request; inbox delivery/bounces must be checked in Brevo transactional logs. Email failures never undo a payment or saved recharge status. Existing manual receipt downloads remain available. No email is sent until credentials are configured and `BREVO_ENABLED=true`.

For hosts that sleep or pause background CPU, use an external scheduler to `POST /api/internal/email/process` every minute. Set a random `EMAIL_WORKER_TOKEN` of at least 32 characters and send it in the `Authorization: Bearer <token>` header; the endpoint is disabled without that secret. This keeps processing active for the scheduler request. Scheduler requests and background workers use the same shared Firestore lease, outbox and sending allowance. Do not rely solely on an in-process timer on serverless or ephemeral hosting.

Razorpay webhooks remain separate work: the email worker can only email captured payments already recorded by callback verification or administrator sync. Set up payment webhooks before relying on unattended updates when customers close checkout.

Checks: `npm run lint`, `npx vitest run tests/razorpay.test.ts tests/payments.test.ts tests/copyLocalization.test.tsx`, and `npm run build`.




## Shared production storage

The existing database `ai-studio-dthtamizhan-ab9bf4ab-c166-4e84-a763-9f8a48360247` in project `gen-lang-client-0168639596` is Firestore Enterprise in native mode. Server collection reads use Enterprise pipelines; document transactions protect payment upserts, fulfillment updates, email-worker leases and access-request deduplication. This migration does not create a new database or change the billing plan.

Set `PERSISTENCE_DRIVER=firestore` on your host. It is also the default when `NODE_ENV=production`; production refuses `file` mode and fails startup when its Firestore access check fails. For isolated local development only, `PERSISTENCE_DRIVER=file` keeps the JSON workflow. Do not run multiple file-mode processes against the same files.

Provide server Application Default Credentials using the hosting service account or a protected `GOOGLE_APPLICATION_CREDENTIALS` file outside the repository. Grant that server identity Firestore data read/write permissions on this project (for example, Datastore User). Never expose service-account keys through frontend environment variables. The existing rules deny browser access to unmatched collections, including all `server_*` collections. Admin SDK access uses IAM; existing user/profile/admin authorization remains in place. No rules deployment is needed for these server-only collections.

Before switching an existing installation, stop payment/admin writers and the old email worker for the cutover, retain a backup of `data/`, then run:

```powershell
npm run storage:migrate
npx tsx scripts/migrate-persistence.ts --apply
```

The first command is a dry run. Apply creates missing documents only, verifies imported records, retains existing cloud values, and leaves all local source files intact. Review any retained conflicts before cutover. Plan deletion markers are preserved; local plans cannot revive a cloud tombstone. Recharge updates must match a provider payment. Old seeded customer lookup rows without matching provider connections are skipped; legacy admin JSON is never imported as authorization. Email status, keys and frozen attachment payloads are preserved so previously accepted emails are not sent again. Source-file changes detected during migration stop the command and require rerunning with writers stopped.

After setting the storage driver, run `npm run storage:check`, then restart/redeploy the server. The check reads counts without sending emails or creating payments. Restart and check Payments, Pending Orders, Recharge history, Receipt emails and the customer History page. Keep any scheduler configured for hosts that pause background CPU.

Storage collections: `server_payments`, `server_recharges`, `server_email_outbox`, `server_email_payloads`, `server_customers`, `server_admin_requests`, `server_installation_requests`, `server_deleted_plans`, and `server_runtime`. Catalog and operator settings reuse `plan_catalog` and `operator_settings`; account/admin profiles already use Firestore. Production does not need a persistent local disk for business records. Preserve static fonts and logo assets for PDF generation. Firestore usage is subject to the project's quotas and billing; monitor it as records grow. The current listing/reporting APIs read complete small-business datasets; pagination should be added before high-volume growth.


## Free-tier plan suggestions

Browse Packs ? **Help me choose** lets a signed-in customer enter a monthly budget, operator, HD/SD quality, duration and optional content preferences. **Find my plans** calls the authenticated backend, which returns up to three real catalog packs. Cards show the full pack price and the monthly equivalent separately; **Choose this pack** opens the existing apply-to-box flow. No packs, prices, validity or channel facts are generated by AI.

Optional Gemini ranking uses only `gemini-3.1-flash-lite`, one provider attempt, no tools/grounding and a 768-token response cap with minimal thinking and a constrained JSON schema. The old multi-model fallback was removed. The server sends at most 12 short plan names/genre tags and the customer's optional preferences; it does not send Firebase identities, email addresses, phone numbers, subscriber IDs or payment details. Customers should not type personal information into preferences. Google's free-tier data-use terms apply.

A model with a free tier can still incur charges when its key belongs to a paid project. The server therefore requires a dedicated `GEMINI_FREE_API_KEY`: before every generation it looks up the key's actual owning project using Google's API Keys API and checks Cloud Billing. Missing permissions, unknown billing status, an enabled billing account, or any linked billing account blocks generation. It never falls back to `GEMINI_API_KEY`, `GOOGLE_API_KEY`, Vertex AI or a paid model. It does not alter any project's billing settings.

To activate optional free AI:

1. Create/use a separate project in Google AI Studio that has **no Cloud Billing account linked**, and create a Gemini API key there. Keep your existing Firebase project's billing intact; disabling its billing could affect phone SMS and other services.
2. Put that key in the server-only `GEMINI_FREE_API_KEY` environment variable and set `GEMINI_FREE_ENABLED=true`. Do not use a `VITE_` prefix. Enable the Google API Keys API for the relevant verification project if needed.
3. Grant the server's ADC identity `apikeys.keys.lookup` on the key's project and `resourcemanager.projects.get` to inspect its billing status (for example, appropriate API Keys Viewer and Project Viewer roles, or a custom role with those permissions). Enable API Keys API (`apikeys.googleapis.com`) and Cloud Billing API (`cloudbilling.googleapis.com`) on the verification consumer project, which defaults to the Firebase project and can be set with `GEMINI_VERIFICATION_PROJECT_ID`. The server identity also needs `serviceusage.services.use` there. This metadata-routing header does not change the key's owning project or enable Gemini billing. Both older `AIza` keys and newer `AQ.` authorization keys are supported. If verification cannot complete, the feature deliberately uses catalog suggestions.
4. Run `npm run ai:check-free` to verify configuration without generating content, then restart/redeploy. No model call is made by that check.

The app's additional ceiling defaults to **500 generation attempts/day**, at most **15/minute globally**, and a configurable per-customer ceiling that defaults to the app daily allowance. Set `GEMINI_FREE_DAILY_LIMIT` lower if needed, or use `GEMINI_FREE_CUSTOMER_DAILY_LIMIT` for a smaller per-customer allowance; the hard application maximum is 500/day. Failed provider attempts consume an app slot, and there is no automatic retry or model switch. Counters are reserved transactionally in Firestore `server_runtime` across all production instances, with daily boundaries in America/Los_Angeles, matching Gemini's documented daily reset. Google can impose lower or changing limits; the app ceiling does not grant provider quota. Local file mode uses process-local development counters.

When setup, billing verification, app allowance or provider quota prevents AI, the backend returns clearly labelled **catalog matches** from budget/operator/quality/duration filters instead. An empty match set does not call Gemini. Catalog fallback has no Gemini token charge; normal hosting and Firestore usage still applies. Free-tier access and Google model availability are controlled by Google, so verify them in AI Studio before activation. See [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [billing](https://ai.google.dev/gemini-api/docs/billing) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

Explicit regional-language preferences restrict suggestions to packs identified by catalog names or language tags. When matching packs exceed the monthly budget, the closest alternatives display an Above budget label and their actual prices. Missing channel totals are marked unavailable; counts are never invented.

To repair older catalog packs that omit both channel totals, run npx tsx scripts/repair-catalog-metadata.ts for a dry run, then add --apply. It marks counts as unavailable only when that change resolves every validation issue. Prices, durations, supplied counts and deletion markers are preserved.

The 404 recovery page uses a Signal Lost set-top-box screen, links to home/popular packs and operator-filtered browsing. Report Broken Link submits only the page path (no query string or contact details), with rate limiting. Reports are grouped in server_broken_links in Firestore and reviewed under Admin > Reports > Broken link reports. Local file mode uses data/broken_links.json. Direct missing-page requests retain HTTP 404 and noindex; the recovery UI and native report form also render without JavaScript.

The 500 page uses a server-rendered rain-fade OSD with a dish illustration, reduced-motion support and native retry/home/history/support links. It preserves HTTP 500 and noindex, works without the application bundle, and does not claim measured signal percentages or verified payment outcomes. Retry targets are restricted to local paths with query strings removed.

Policy timing references reviewed on 13 November 2026: Razorpay normal refunds (https://razorpay.com/docs/payments/refunds/normal/) currently states 7-10 working days after initiation, with payment-method variations. Late authorisation checks (https://razorpay.com/docs/payments/payments/late-authorisation/) may run for 3 days from payment creation; this is not a bank-refund deadline. Merchant refund eligibility review and approval-to-submission timing are not prescribed by Razorpay; refunds remain manually initiated by SMP Enterprises. Complaint acknowledgement/resolution commitments follow the consumer grievance framework (48 hours/one month), rather than Razorpay's own complaint policy. Razorpay pricing (https://razorpay.com/pricing/) identifies GST on merchant processing fees; no additional customer surcharge or recharge GST calculation was introduced. Netlify is the selected host; the processor list includes Firebase/Google, Razorpay, Brevo and optional Gemini. Installation is not applicable: recharges only. Policy effective date remains pending launch.

Retention schedule: account/profile data while needed for the service, subject to verified deletion requests and legal exceptions; closed support correspondence for 2 years (a business policy, not a statutory period); GST-related payment/recharge/refund accounting records for 72 months from the relevant annual-return due date. Proceedings/investigation records are retained until one year after final disposal or the statutory period, whichever is later (CGST Act section 36: https://cbic-gst.gov.in/pdf/CGST-Act-Updated-01082021.pdf). Staff must manually review and remove/anonymise expired records, including provider copies where applicable, after checking legal holds. There is no automatic retention/deletion job. Confirm deployment regions and provider retention/backup settings before launch; the policy does not promise India-only processing.

### AI endpoint request protection

Both `POST /api/ai/recommend-plans` and `POST /api/ai/recharge` verify Firebase ID tokens (including revocation) before processing. They share a per-UID sliding limit of 20 requests per 60 seconds; excess requests return HTTP 429 with `Retry-After: 60`. Production uses atomic Firestore transactions in `server_runtime`; local development uses in-memory counters. Storage failures reject requests with HTTP 503. Existing provider quotas remain in place. Preferences and each recharge message are limited to 500 characters before trimming; recharge history remains limited to 12 messages.

Gemini runs only in the Express server, using `GEMINI_FREE_API_KEY`. Supply it through the deployment's secret/environment configuration, or an ignored local `.env`; never prefix it with `VITE_` or commit its value. No Gemini secret is required in the browser.

The recharge assistant also supports Gemini function calling through `server/utils/assistantTools.ts`. Only `navigate(page)` and `get_plans(operator, max_price)` are registered. Their strict JSON schemas are generated from the same Zod schemas used for server validation; unknown tools, extra arguments, invalid routes and multiple calls are rejected. Navigation maps public page names to actual React routes; plan browsing reads the existing catalog, filters total pack price, and returns at most 20 matches. The client validates structured actions, uses React Router for navigation and displays catalog matches with assistant text and an action notice. Recharge preparation retains its existing flow; no payment tool is exposed. Each model attempt consumes the existing provider allowance.

Assistant history tools: `get_recharge_status(order_id)` and `get_my_history(limit)` (integer 1?20) read Firestore `server_recharges` using the UID verified by Firebase Auth. Neither request nor tool schemas accept a UID. Ownership filters run in the database before limits; responses project only order ID, simplified status, amount, pack name, date and test-mode label. Unknown or other-account IDs produce the same not-found result. Failed recharges offer to start a refund request through the existing Support page, subject to review; no refund/payment write is performed. Local `firestore.rules` already default-denies browser reads of server collections and restricts legacy order reads to owners/authorized admins. Live deployment rules were not verified (Firebase access denied); emulator assertions require Java and a running Firestore emulator.

Assistant support drafts: `draft_contact_message(category, subject, message)` and `draft_refund_request(order_id, reason)` only return in-memory confirmation cards with Edit and Submit controls. Draft creation never stores support requests or changes financial records; existing AI usage/rate-limit counters still apply. Contact categories are `recharge_failed`, `wrong_operator`, `refund`, `account`, and `other`. Submit reuses the existing support mailto destination and opens a prefilled email; the customer must send it in their email app, and the chat does not claim delivery. No Firestore support-request collection is introduced.

The merchant-specified refund-request cutoff is **before recharge is marked completed**, with no separate time deadline. Eligibility requires an owned, non-test pending/processing/failed recharge and a matching owned captured payment that has not been refunded. Missing/unverified records fail closed. Eligibility is shown in the card and rechecked through authenticated `POST /api/ai/refund-draft-check` on Submit; completed, already-refunded, and test orders are blocked. Eligibility permits a request for Support review; it never approves or executes a refund. No payment code is changed.
