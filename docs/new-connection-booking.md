# New connection booking and provider integration — Part 3

No deployment, production payment, bank-observer connection or sample-data mutation was performed. Defaults are **no enabled provider**, default provider `none`, and advance mode `none`: an authenticated customer can submit a complete installation request without paying online.

## Files created

- `src/lib/newConnectionOrders.ts`: validated customer/booking/order models, IST dates, Tamil Nadu districts, service-area validation and compatible selection lookup.
- `src/lib/newConnectionPricing.ts`: the single integer-money price rule, advance calculation and price-change comparison.
- `server/newConnectionPaymentProviders.ts`: the `PaymentProvider` interface and Razorpay/YouPI/none/manual implementations. Razorpay wraps the existing client and signature code; YouPI reuses the existing HTTP transport.
- `server/models/newConnectionOrders.ts`: named-database persistence, booking counters, transactional duplicate/rate guards, checkout reservation, verification, webhook recovery and admin bank confirmation.
- `server/routes/newConnectionOrders.ts`: customer configuration/create/status/retry/verify APIs and approved-admin payment-review APIs.
- `src/components/NewConnection/BookingPage.tsx`: the three-step bilingual form, consent, authoritative price updates, refresh-safe draft, provider UI, verification states, printable receipt and business WhatsApp link.
- `src/components/Admin/NewConnectionPaymentReview.tsx`: the small payment-verification queue in Catalog → Settings. This is not a full admin orders tab.
- `src/lib/newConnectionBookingCopy.ts`: English/Tamil booking messages and district names.
- `tests/newConnectionPricing.test.ts`, `tests/newConnectionProviders.test.ts`, `tests/newConnectionOrdersApi.test.ts`, `tests/newConnectionBookingFlow.test.tsx`: pricing, compatibility, provider contracts, mocked persistence/API, none-mode form flow and adverse confirmation coverage.
- `docs/new-connection-youpi-notes.md`: reviewed upstream contract and limits.
- `docs/new-connection-booking-rules.diff`: exact rules/index changes.
- This document.

## Files modified

- `src/lib/newConnectionCatalog.ts`: provider settings, payment-free defaults and two-decimal INR validation. An old settings document without enabled providers is interpreted as payment-free, even if it contains the old `advanceMode: full` value.
- `src/lib/newConnectionBrowse.ts`: the Part 2 first-time estimate calls the same price function as booking. Its compatibility selection behavior is unchanged.
- `server/models/newConnectionCatalog.ts`: validates/normalizes settings on read as well as save.
- `src/lib/translations.ts`: includes the new copy using the existing i18n approach.
- `src/components/NewConnection/NewConnectionPages.tsx` and `src/App.tsx`: replace the booking placeholder and pass the existing user/sign-in context.
- `src/components/NewConnection/new-connection.css`: responsive booking/receipt/print styles.
- `src/components/Admin/tabs/CatalogTab.tsx`, `catalog.css`: provider settings editor and payment review section.
- `server/middleware/auth.ts`: exposes the verified token's sign-in provider for the Google requirement; existing authorization decisions are unchanged.
- `server/middleware/rateLimiter.ts`: a separate 60/minute status/config limiter, avoiding double-counting the global limiter's store.
- `server/razorpay.ts`, `server/routes/rechargeRecovery.ts`: reusable raw webhook signature helper and new-connection dispatch on the existing Razorpay endpoint.
- `server/youpi.ts`: exports its existing gateway transport/config unchanged and dispatches new-connection callbacks before the existing recharge branch.
- `server.ts`: mounts the new API router. Existing raw webhook mounting remains before JSON parsing.
- `firestore.rules`, `firestore.indexes.json`: owner/admin order reads, no client writes, and four indexes.
- `.env.example`: disabled-by-default new-connection flags and optional return origin.
- `tests/newConnectionCatalog.test.ts`, `tests/newConnectionCatalog.rules.test.ts`, `tests/rechargeRecovery.test.ts`, `tests/freshPaymentQuote.test.ts`: updated default expectation, order-rule coverage and complete mocks for shared payment dependencies.

## Order data and price contract

Orders live at `newConnectionOrders/{id}` in the configured named Enterprise database. `id` is an owner-bound SHA-256 digest of the uid/idempotency key. `bookingId` is `DTH-NC-YYMMDD-XXXX`, using the IST date and a transactionally incremented four-character base-36 daily counter. A full counter fails closed rather than reusing a number.

Each order stores the requested selection/count, customer details, immutable names/prices, due-now/balance/advance mode, consent with server time, payment provider and references, sanitized provider status, booking/payment status/history and ISO timestamps. Razorpay aliases remain populated for Razorpay records. `awaiting_admin_confirmation` is a first-class payment status. `createdAt`/`updatedAt` follow the existing server ISO-string convention used by Enterprise pipeline queries.

Actual internal bank-check notes are stored in `server_new_connection_private/{id}`. The public order's `adminNotes` is always empty, following the existing ticket/private-note pattern: Firestore cannot redact private fields from an owner-readable document. Admin bank-check notes, actor and timestamp commit atomically with the paid transition. Raw gateway payloads, secrets, bank messages and customer payment instruments are never copied into `providerRaw`; only bounded status/test/reference fields are retained.

V1 pricing is defined once in `calculateNewConnectionPrice`:

```text
perConnectionTotal = pack price for the selected validity + hardware + installation
total = perConnectionTotal × connectionCount
```

Each connection is a full set; `connectionCount` is 1–3. `includedFirstPackId` remains informational: **no discount or starter-pack credit** is applied. Breakdown component amounts are per connection; `total` is for all connections. Input/catalog prices must have at most two decimal places. Calculations use bounded integer hundredths and return rupee amounts. Razorpay receives integer paise only at its provider boundary; YouPI receives an exact decimal INR string and its amount-in-paise response is checked against the same integer representation.

Full mode charges the total. Partial mode charges `min(partialAmount, total)` once per booking, with the remaining balance at installation. None mode charges zero now, records status `received` / payment status `pending`, and displays **Booking received**, never **Payment verified**. A free quote also uses provider `none`.

Every new reservation reads current Firestore catalog/settings under the catalog transaction guard, rejects inactive/incompatible selections, computes its own quote and compares every displayed amount/mode. A mismatch returns HTTP 409 `PRICE_CHANGED` with the new quote before creating anything. The form displays it and resets both consent checkboxes; the customer must explicitly confirm again. A retry of an already-created booking uses its immutable, previously accepted quote; it does not silently change the amount under an existing gateway order.

## Form, authentication and abuse controls

- Brand/pack/box/validity prefill from URL; an invalid combination shows the existing unavailable-selection state. Compatible equipment reuses Part 2's logic: HD/4K boxes can serve lower formats; Regional/Add-on has no encoded box requirement.
- Details are trimmed/capped, mobile numbers require 10 digits starting 6–9, email/alternate phone are optional, district is a Tamil Nadu dropdown, and the preferred date is tomorrow through +14 days in **Asia/Kolkata**.
- A configured pincode list and district list are conjunctive: each non-empty list must match. Both empty means all declared Tamil Nadu districts. No geocoding or pincode-to-district database is added.
- Confirmation requires a Firebase session whose **current sign-in provider is Google**. A linked Google identity alone is not enough if the current sign-in used a different provider. The existing sign-in modal and ID-token headers are reused.
- Form drafts are scoped to uid/guest in sessionStorage for at most 24 hours; they are not written to localStorage. Guest drafts can migrate on Google sign-in. Account changes remount the form under the new owner's key. Consent is deliberately not remembered across refresh.
- Honeypot must be empty. The supplied form-start timestamp must be at least three seconds old and at most 24 hours old. This lightweight fill-time signal is client supplied, not a cryptographic bot attestation; durable user/phone limits and authenticated/rate-limited APIs are the server controls.
- A transaction guard serializes daily per-uid/per-phone checks: at most three unpaid pending/review bookings in 24 hours. Same phone + brand + pack + pincode returns an existing same-owner pending booking for explicit review. Another owner receives a generic duplicate response, never that customer's order.
- Reusing an idempotency key with different input is rejected. Concurrent identical creates share one record and counter value. New gateway creation has a persistent private claim; an ambiguous external failure is never automatically repeated.
- Creation/retry/verify reuse the existing 30/minute IP limiter, with the global 120/minute API limiter still active. Configuration/status additionally use a separate 60/minute limiter. These are IP limits; shared-network users share the allowance.

## Provider configuration and environment variables

Persist through **Admin → Catalog → Settings**, using the existing approved-admin API:

```json
{
  "enabledProviders": [],
  "defaultProvider": "none",
  "advanceMode": "none",
  "partialAmount": 0
}
```

`enabledProviders` can contain `razorpay` and/or `youpi`; defaultProvider is one enabled provider or `none`. With no enabled providers, settings normalize to `advanceMode: none`, including old full-mode documents. `manual` is an interface/order-model value reserved for later server-managed workflows; customers cannot choose it to bypass online payment. Admin bank confirmation of a YouPI order preserves provider `youpi`.

Customer payment choices are the intersection of enabled settings and server flags/configuration. In an explicitly configured paid mode with no available gateway, confirmation is blocked with an unavailable message; it is never silently converted to a free booking. Missing initial provider configuration uses the safe none defaults.

| Variable | Required for | Value / behavior |
|---|---|---|
| `NC_RAZORPAY_TEST_ENABLED` | New-connection Razorpay checkout | Defaults `false`; set `true` for testing only |
| `RAZORPAY_KEY_ID` | Razorpay | Existing shared SDK key, **must start `rzp_test_`** |
| `RAZORPAY_KEY_SECRET` | Razorpay | Matching test secret, server-only |
| `RAZORPAY_RECHARGE_WEBHOOK_SECRET` | Razorpay callbacks | Existing shared raw webhook secret, server-only |
| `NC_YOUPI_ENABLED` | New-connection YouPI checkout | Defaults `false`; experimental/manual-reconciliation flow only |
| `YOUPI_API_URL` | YouPI | Existing HTTPS API base |
| `YOUPI_CHECKOUT_URL` | YouPI | Existing allowed HTTPS hosted checkout origin |
| `YOUPI_MERCHANT_ID` | YouPI | Existing explicitly configured merchant; no demo merchant |
| `YOUPI_MERCHANT_API_KEY` | YouPI | Existing server-only merchant API key |
| `YOUPI_WEBHOOK_SECRET` | YouPI callbacks | Existing server-only merchant signing secret |
| `APP_URL` | YouPI config | Existing storefront origin |
| `NC_APP_URL` | Optional YouPI return override | Storefront origin; falls back to APP_URL |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local Admin SDK when no ambient credential | Existing service-account file location; never commit its contents |

No secret uses a `VITE_` prefix. In development, only localhost/127.0.0.1 may use HTTP; production YouPI URL configuration requires HTTPS. The return location is built on the server as `/new-connection/book?order=<owner-bound-id>` and is not client-configurable.

**Shared Razorpay keys:** do not replace an existing live recharge key pair just to test this feature. Use an isolated test deployment. This feature rejects live Razorpay keys even when its flag is true, without changing the recharge flow's existing key-mode behavior. `PAYMENT_MODE` still belongs to existing recharge flows; it is not a bypass for the new feature's flags/settings.

## Exact webhook and callback setup

### Razorpay — test dashboard only

1. Select the Razorpay **test** dashboard/account and matching `rzp_test_` keys.
2. Reuse the existing endpoint: `https://YOUR_DOMAIN/api/webhooks/recharges`.
3. Subscribe to `payment.captured`, `order.paid`, and `payment.failed`.
4. Set the dashboard secret to the server's `RAZORPAY_RECHARGE_WEBHOOK_SECRET`.
5. Keep raw-body routing before JSON parsing. The shared helper validates `X-Razorpay-Signature` over exact bytes. New orders carry `purpose: new_connection`, internal order ID and uid in provider notes; the same route dispatches by order type. No third Razorpay webhook endpoint is added.
6. For creation, enable `razorpay` in settings, select it as default, choose full/partial mode, and set `NC_RAZORPAY_TEST_ENABLED=true`.

The adapter validates stored order identity/uid, expected amount and INR against server-fetched provider records. Checkout signatures reuse the existing verifier. A signature alone never marks a booking paid: the provider API must report a captured payment with the exact amount. Authorized-only payments stay pending and cannot open another checkout. A capture event whose API lookup is not captured yet returns 503 so delivery is retried; it is not prematurely consumed as a successful event. Duplicate captures are idempotent and older/failure events cannot downgrade paid records.

### YouPI — separate self-hosted gateway

Read [the integration notes](new-connection-youpi-notes.md) before enabling anything.

1. Configure the existing merchant callback URL as `https://YOUR_DOMAIN/api/payments/youpi/webhook` and match `YOUPI_WEBHOOK_SECRET` on both servers.
2. Allow the exact storefront origin in YouPI's return-origin/CORS configuration (`YOUPI_ALLOWED_RETURN_ORIGINS` / `YOUPI_ALLOWED_ORIGINS`) and set its public checkout origin to `YOUPI_CHECKOUT_URL`.
3. Keep the gateway API, checkout portal and bank observers on their separately managed host. Merchant keys stay on this application's server. No gateway/observer process is launched by this application.
4. The existing callback route dispatches merchant order IDs beginning `nc_` to the new booking logic; old recharge behavior stays separate.
5. The new adapter verifies the raw-body HMAC in `X-Gateway-Signature`, requires the signed payload's `deliveryId` to match `X-Gateway-Delivery-Id`, checks order/payment IDs, UPI, INR and exact amount, then fetches the session using merchant credentials. Delivery IDs are persistently deduplicated. Delayed authenticated deliveries remain acceptable for **manual review**; a fresh timestamp is not treated as bank evidence. V2 signatures exist upstream but are not claimed as an independently authenticated settlement feed here.
6. `OBSERVED_SUCCESS`, `RECONCILED` and `MANUAL_REVIEW` can only set `awaiting_admin_confirmation`. Expired, failed, cancelled and unobserved sessions remain pending. A browser return/callback cannot approve payment.
7. Only an approved admin can enter/check a **12-digit UPI reference**, exact due amount, explicit bank-checked checkbox and private note. A reference cannot pay two new-connection orders. Paid transition/reference claim/private audit commit together. Check the receiving bank independently; YouPI's signed observer result is insufficient.

Timeouts and ambiguous creations appear in **Catalog → Settings → Payment verification queue**, which queries online pending/review records before limiting results so payment-free bookings do not hide them. Razorpay pending entries are visible for investigation but have no manual paid button. YouPI refunds are **manual bank transfers outside this feature**; supportsRefund is false. No automatic refund API or refund UI is implemented. Razorpay's supportsRefund value describes gateway capability only, not a new refund workflow.

## Pending, expiry and recovery behavior

Customer status reads reconcile known provider sessions and return only the caller's order. The page polls five times per pending/review state and offers a manual check afterwards. Provider outages retain the last honest state and show that verification is unavailable. Closing the tab does not prevent a signed webhook from marking a captured Razorpay test payment paid or queuing a YouPI observation for admin review.

Unpaid application checkouts cannot be reopened at/after 24 hours; the UI points to creating a new booking after checking for a debit. This application cannot retract a copied UPI address or an already-open external gateway session. Late confirmed payments are still recorded rather than discarded. Fulfilment/cancellation/refund handling beyond the stored payment state belongs to later work.

Retries reuse an existing valid provider order. An authorized Razorpay payment or a terminal/expired YouPI session is held for verification, not another debit. If provider creation was ambiguous and no checkout identifier was persisted, staff must inspect the provider using the booking reference before any new attempt is authorized. This is an intentional safe hold, not an automatic retry with a new payment order.

Customer errors, refresh, cancellation and payment failures never mark an order paid. None-mode status remains pending because there was no online payment; `received` confirms the request, not payment or a guaranteed installation date.

## Rules, indexes and deployment commands

Exact diff: [new-connection-booking-rules.diff](new-connection-booking-rules.diff).

Rules allow only owner or approved-admin reads on `newConnectionOrders`. All client create/update/delete operations are denied, including client admin mutations. Private metadata/counters/events/payment-reference collections remain under the existing default deny. All authoritative changes use the server's Admin SDK, which validates input and authorization independently.

Indexes added for `newConnectionOrders`: `(uid ASC, createdAt DESC)`, `(customer.phone ASC, createdAt DESC)`, `(providerOrderId ASC)`, and `(provider ASC, paymentStatus ASC, createdAt DESC, id DESC)`. The existing configuration targets the named database.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner/admin booking reads and server-only order/payment mutations, with internal bank notes excluded from customer-readable records. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

Nothing was deployed. After review, from PowerShell:

```powershell
npx.cmd firebase-tools deploy --only "firestore:rules,firestore:indexes" --project gen-lang-client-0168639596
```

This does not deploy the Express server or frontend. Deploy those together using the repository's existing application workflow. Storage rules are unchanged in Part 3. Firebase CLI login alone is not an Admin SDK runtime credential.

## Validation and manual test checklist

Commands:

```powershell
npm.cmd run lint
npm.cmd run type-check
npm.cmd run check:i18n
npm.cmd run build
npm.cmd test
npm.cmd run test:emulator
```

The tests use provider mocks and mocked Firestore. Coverage includes integer pricing/counts/partial/none, existing compatibility and Part 2 estimates, IST date boundaries, validation/serviceability, every provider contract, test-only keys, raw signatures, callback attribution, wrong amounts, forged/delayed/duplicate confirmations, webhook lag/idempotency, owner/admin access, concurrent duplicate prevention, 24-hour expiry, ambiguous creation, reference reuse, payment-free HTTP flow, all three payment-free form steps, Google requirement and explicit price-change re-consent. No live or test gateway API was exercised with real merchant credentials. Live emulator/browser visual QA is separate; the existing browser-access host was unavailable in this environment and live rules tests explicitly skip without an emulator.

Final repository test run: **838 passed, 7 skipped** across 119 files (118 passed, one skipped). The 24 new Part 3 tests are included. Lint, explicit type-check, English/Tamil checks and build pass. The build retains the existing large-chunk warning. Java was not available on PATH, so live rules-emulator assertions were not run. An initial broad test discovery also found the temporary upstream reference checkout; that run was stopped, the reference was moved outside application discovery, and the complete repository suite was rerun successfully.

1. **None mode:** leave both providers disabled and advance none. Activate a real/test catalog, choose box/pack/validity/count, fill valid details, sign in with Google and confirm both checkboxes. Expect Booking received, amount paid zero, full balance at installation, and no checkout script/request.
2. **Refresh/auth:** refresh during details/review, sign in after filling as guest, change/sign out accounts, and reload `?order=<id>`. Draft fields should persist only for the appropriate session; consent resets. Another uid must get 404 for the order. Password/phone sign-in cannot submit until Google is used.
3. **Validation:** invalid/empty phone, optional alternate/email, long strings, missing address/district, past/today/+15-day date, honeypot and a submit under three seconds. Check inline errors and focus on the first invalid field. Check the IST boundary around 00:00.
4. **Service area:** test an allowed pincode/district, disallowed pincode and disallowed district. If both lists are populated both must match. Empty lists allow all declared TN districts.
5. **Price/availability:** change pack, box, installation, validity price, quantity or advance settings after the page loaded. Expect 409/new review, both consent checkboxes cleared and no provider order created. Deactivate brand/pack/offer and expect the unavailable message.
6. **Razorpay test success:** enable settings and test flag with test credentials. Complete a test capture. Expect server-verified paid state, due amount as paid and correct partial/full balance. Never enter a live card/UPI transaction for this task.
7. **Failure/abandon:** dismiss checkout, simulate failed/authorized payment and provider timeout. Never show paid from client events. Close the tab after test capture, deliver the signed webhook and reopen the order URL. Repeat events and deliver failure after capture; expect one paid history entry and no downgrade.
8. **Duplicates/limits:** double-click/submit from two tabs with the same key; expect one booking/checkout. Try another key for the same phone/brand/pack/pincode; require review of the old order. Try another uid with that phone; do not reveal old customer data. Create three distinct unpaid requests, then a fourth; expect 429. Exercise create/status IP limits and localized rate-limit messages.
9. **Expiry:** move an unpaid record beyond 24 hours in an isolated test environment. Check retry is blocked and the UI says to check debits before creating another request. A late verified capture must still be recorded.
10. **YouPI mocks only:** leave the real flag off. Exercise ACTIVE/EXPIRED/FAILED, OBSERVED_SUCCESS, RECONCILED, duplicate/delayed deliveries, wrong amount/order/payment/method/currency and forged signatures. No event may set paid automatically. Timeout remains pending in the admin queue.
11. **Admin bank confirmation:** customer/unapproved/revoked admin attempts must fail. Approved admin enters a bank-checked exact amount, 12-digit reference and note. Test wrong amount, invalid reference, duplicate confirmation and reusing a reference on another booking. Only the valid operation sets paid; private notes never appear in customer reads.
12. **Receipt/WhatsApp:** check booking ID, quantity/validity, names, price breakdown, amount paid/balance and TEST marker. Print a plain receipt with no GST fields; only receipt content should print. WhatsApp opens a draft to the existing business number with the requested details and sends nothing automatically.
13. **Mobile/Tamil:** test 320/375/768px and desktop, date/select controls, summary, checkboxes, busy/double-submit states, keyboard focus, Tamil district/slot/error/receipt copy and browser console/network errors.
14. **Rules emulator:** owner/admin reads succeed; other customers/guests fail; every client write fails, even from an admin. Private bank metadata, counters and processed-event records must remain unreadable.

## Go-live checklist and remaining assumptions

- Shipping **booking requests without payment** needs enabledProviders `[]`, defaultProvider `none`, advanceMode `none`, `NC_RAZORPAY_TEST_ENABLED=false` and `NC_YOUPI_ENABLED=false`. Configure actual catalog/service areas/terms/policies and server Firebase credentials. Keep SAMPLE catalog inactive outside testing.
- `NC_RAZORPAY_TEST_ENABLED=true` plus enabled provider `razorpay` only enables **test payments**. There is no flag in this implementation that accepts real Razorpay money: live keys are rejected. Wait for merchant approval and a separately reviewed live-mode change before accepting it.
- YouPI can open a real UPI checkout only when **both** `NC_YOUPI_ENABLED=true` and settings enable `youpi` in a non-none mode, with all merchant credentials/HTTPS origins/callback secret configured. Keep it **off** until the receiving-bank permission, independent security review, exact attribution/reconciliation tests, staff confirmation workflow, support and manual-refund procedures are established. Do not call the experimental gateway certified or production-ready. Even when enabled, every YouPI paid transition requires bank-checked admin confirmation.
- Verify raw webhook URLs/secrets/events, provider-account isolation, pending-order recovery, reference deduplication and runtime IAM before enabling any payment flow. Do not rotate/disable credentials while outstanding attempts still need reconciliation.
- The existing site's business/policy content currently says installation services are not offered. Review/update that business statement and publish accurate new-connection terms/service coverage before offering real installation bookings. This task does not rewrite unrelated policy pages.
- Partial amount is per booking and capped at the total. Prices have two-decimal INR precision. Included starter packs receive no discount. Box compatibility follows Part 2's existing assumptions, which actual operators must confirm.
- UPI references are assumed to be 12-digit numeric references, unique across this feature's bookings. No independent bank API, SMS/Gmail observer hosting, automatic refunds, fulfilment-status admin console, notifications or My Bookings page is added.
- Server-private bank notes are deliberately separated from owner-readable order records. Future Part 4 admin APIs must preserve that boundary and the shared mutation/reference guards.
