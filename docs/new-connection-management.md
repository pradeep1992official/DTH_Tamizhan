> Current support: YouPI checkout and settings have been retired. Razorpay and configured payment-free bookings remain. Any YouPI references below describe historical records or legacy reconciliation only.

# New connections — Part 4

Implemented without deployment, live gateway calls, real bookings, bank transfers, outgoing emails or database migrations. No libraries or environment variables added. The Firebase database remains the configured named Enterprise database in `firebase-applet-config.json`.

## Entry points

- Admin: `/admin/new-connections`. Catalog → Settings links to `/admin/new-connections?awaiting=true`.
- Customer: Account → My Bookings, `/account/bookings` (noindex).
- Existing receipt: `/new-connection/book?order=<order-document-id>`.

The admin table uses server filtering and 50-row keyset pages. Search matches a **prefix** of name, phone or booking ID, case-insensitive for names/IDs. Filters include booking/payment status, provider, brand, district, IST date range, cancellation requests and payment review. Brand options return at most 200 brands, with an ID fallback if unavailable/limited. CSV export applies the same filters, quotes cells and prefixes formula-like values with an apostrophe. Exports are capped at 5,000 rows; exceeding that returns an error, never an incomplete export.

Counters aggregate in Firestore instead of loading all orders: today, awaiting contact/scheduling/online confirmation, installations this month, and ledger receipts minus refunds this month. Dates use Asia/Kolkata. Financial totals exclude `testMode: true` bookings; other counters include them. A legacy-capture aggregate covers unmigrated Part 3 payments. Monthly financial aggregation first filters non-test orders updated during the month; all ledger mutations update this timestamp. Arbitrary filters/search/aggregation can still scan records inside Enterprise Firestore; monitor query plans/billing before increasing volume. No combinatorial set of filter indexes was added.

## Ledger and privacy

The immutable accepted quote stays unchanged. `ledger` entries contain id, payment/refund type, positive two-decimal INR amount, method, reference, actor ID, server timestamp and public note. Refunds also identify the original payment entry. Gateway actors are `system:verified_provider` when no human recorded the capture; admin collections/confirmations/refunds use the Firebase **UID**, never email.

`amountPaid` means **net collected**: payments minus completed refunds. `amountRefunded` is gross completed refunds; `balance = total - amountPaid`. Zero net without a refund is pending, intermediate collections display “Partially paid”, full net is paid, and refunds produce partially_refunded/refunded. A confirmed partial gateway advance therefore remains a partial booking payment; its recorded gateway entry prevents another checkout. An installed booking can retain a balance and displays a balance-due flag.

All mutations use Admin SDK transactions and the existing `server_runtime/newConnectionOrders` fence. Offline payment input cannot set provider, gateway fields, totals, or payment status. Outstanding online attempts must first be reconciled/confirmed before recording an offline collection, avoiding a later double collection. Collections on cancelled/refunded/refund-initiated bookings are rejected.

UPI and bank references normalize whitespace/case and share Part 3's `server_new_connection_payment_refs/SHA256(youpi:<reference>)` namespace. A reference cannot be reused for another operation, including across bookings, payment methods and manual refunds. Cash/other collection references are optional; every manual refund requires a reference. Existing YouPI UTR claims remain effective.

Internal notes, cancellation/refund reasons and bank-check notes stay in `server_new_connection_private`. Owner-readable `adminNotes` remains empty. Public history, customer responses, CSV and email bodies use explicit public projections. Admin status operations retain actor/status/public message in a server-private operation record as well. Public history shows the latest 100 events, following the order document's bounded history model. Ledger and pending refund arrays are bounded to 500; outstanding gateway refunds reserve ledger capacity. Private notes stop at 500 instead of discarding earlier notes. Larger histories need an archival/subcollection design before these limits are reached.

## Status and cancellation

Server map: received → contacted/cancelled; contacted → scheduled/cancelled; scheduled → installed/cancelled. Installation is allowed with unpaid balance. Scheduling requires a real date and slot. Installed/cancelled/refunded states have no ordinary forward status transitions; refund state is server-managed. “Keep status / add note” allows notes after installation. An internal-only note does not add text or an event to the public timeline.

Cancelling requires a private reason of at least five characters; the customer-visible message is optional. Customers can request cancellation only in received/contacted, once while a request is open. The owner-authenticated, rate-limited endpoint never cancels or refunds automatically. Admin accept follows the cancel flow; decline preserves booking status and can add a public message. WhatsApp is an explicitly opened draft addressed to the customer; no message is automatically sent.

## Refunds

Choose the original payment entry. Both its unrefunded remainder and the order's net paid amount, less outstanding refund reservations, cap the refund. Mixed gateway-deposit/offline-balance bookings require separate refund operations for the respective payment sources.

- Razorpay source: test-only provider creates an idempotent normal refund using the shared HTTP transport. Existing service-request refunds reuse that transport too; installed SDK 2.9 filters out the required idempotency header. Private reasons never enter the new-connection gateway request. Disabled flags/live keys are rejected before new reservations. Pending refunds reserve the amount and show refund_initiated; processed refunds append exactly one ledger entry. Failed refunds release the reservation. Ambiguous responses keep the reservation and return `REFUND_VERIFICATION_PENDING`: retry **the identical request/key**, never invent another request for an uncertain debit/refund. Keep the key/request in the staff incident record if a browser refresh loses the form state.
- YouPI/cash/UPI/bank/other sources: **record only after staff transferred money outside the website**. No refund API is called for a provider without refund support. Manual refunds require amount, method, reference, private reason and optional public note.

Full net refunds set booking status refunded. Partial gateway refunds restore the original booking status after all outstanding gateway refunds resolve. Only completed/recorded refunds reduce collected totals; initiated refunds do not.

The existing raw signed Razorpay endpoint `/api/webhooks/recharges` now dispatches new-connection `refund.processed` and `refund.failed`. Provider-side refund retrieval must match operation, payment ID, order ID, INR and amount before applying it. Other feature refunds keep their previous dispatch. Configure these two test webhook events in addition to Part 3's captured/paid/failed events, using the existing `RAZORPAY_RECHARGE_WEBHOOK_SECRET`. See [Razorpay idempotency](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md) and [refund events](https://github.com/razorpay/markdown-docs/blob/master/payments/refunds/subscribe-to-webhooks.md).

## Notifications

Uses existing Brevo configuration/transport module, with a server-private transactional outbox. Booking received and payment recorded go to admin and customer (when customer supplied an email); needs-confirmation goes to admin. Contacted, scheduled, installed, cancelled, cancellation-declined and refunds go to customer. Copy includes English/Tamil and public amounts/status/messages, without private reasons or raw gateway data.

Delivery runs after mutations and through a 30-second worker. Failure retries once, logs only booking/event identifiers, sets `notificationFailed` plus failed event types, and never reverses the business mutation. Admin retry reuses provider idempotency keys. A durable lease prevents concurrent sends; expired exhausted attempts become failed. This feature has a maximum 50 email-attempt daily allowance, additionally bounded by `BREVO_DAILY_LIMIT`; the existing receipt-email worker has its own allowance. Brevo's account-wide limit still needs monitoring across both workers. Manual retries can resend an email after the provider's idempotency retention expires.

No new environment variables. Reuse `BREVO_ENABLED`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, optional `BREVO_SENDER_NAME`, `BREVO_DAILY_LIMIT`, and `BREVO_SEND_TEST_EMAILS`. Test booking notifications require `BREVO_SEND_TEST_EMAILS=true`; disabled/unconfigured delivery is surfaced as a failure for staff review. Recipients are the existing root business admin address and the booking's optional customer email. Supporting configurable multiple admin recipients is outside this change.

Razorpay continues to require `NC_RAZORPAY_TEST_ENABLED=true`, `RAZORPAY_KEY_ID=rzp_test_…`, `RAZORPAY_KEY_SECRET`, and the existing webhook secret. YouPI keeps all Part 3 configuration unchanged: see [YouPI notes](new-connection-youpi-notes.md) and [Part 3 configuration](new-connection-booking.md). No live-key path was added.

## Legacy backfill

Reads gracefully derive deterministic gateway entries for Part 3 verified paid records. An unexpected legacy refunded state fails closed for review because Part 3 did not implement refunds. Before launch, persist normalized ledgers so filters and direct owner Firestore reads also use the new derived fields. Unmigrated partial advances can otherwise retain their old stored `paid` filter value even though the UI correctly derives a partial payment.

```powershell
# Read-only dry run; requires configured Admin SDK credentials. No writes by default.
npm.cmd run backfill:connection-ledger -- --project gen-lang-client-0168639596
# Explicit migration, after reviewing the dry run and taking a backup:
npm.cmd run backfill:connection-ledger -- --write --project gen-lang-client-0168639596
```

The script uses bounded 100-order pages, transactionally rereads each order under the existing fence, preserves references/prices/timestamps, creates no notifications and performs no gateway calls. Repeating it creates no duplicate ledger entries. It has **not** been run against the database.

## Security and API

All `/api/admin/new-connection/orders` endpoints share fresh canonical approved-admin authorization plus revoked-token verification: list, options, counters, export, detail, `/:id/status`, `/:id/collections`, `/:id/refunds`, `/:id/retry-notification`. The existing approved-admin YouPI confirmation endpoint/API and exact amount/12-digit UTR/bank-checkbox/private-note requirements remain.

Owner-only additions: `GET /api/new-connection/orders?cursor=…` and `POST /api/new-connection/orders/:id/cancellation`. Owner list accepts only a cursor, never an arbitrary UID or admin filters. New admin mutations reject unknown input fields and use UUID idempotency keys; the server fingerprints payloads and rejects reusing a key with changed input.

`firestore.rules` is unchanged: owner/admin reads, all client writes denied, private collections default-denied. Added indexes: order createdAt+id; notification status+createdAt+id; notification orderId+status+createdAt+id; non-test orders by updatedAt for monthly aggregates. Existing uid+createdAt and provider indexes remain. Exact diff: [new-connection-management-rules.diff](new-connection-management-rules.diff).

**Not executed:**

```powershell
npx.cmd firebase-tools deploy --only "firestore:rules,firestore:indexes" --project gen-lang-client-0168639596
```

## Files

Created: `server/models/newConnectionManagement.ts`, `newConnectionRefunds.ts`, `newConnectionNotifications.ts`; `src/components/Admin/tabs/NewConnectionsTab.tsx`, `new-connections.css`; `src/components/NewConnection/MyBookings.tsx`; `src/lib/newConnectionTrackingCopy.ts`; `scripts/backfill-new-connection-ledger.ts`; `tests/newConnectionManagement.test.ts`, `newConnectionTracking.test.tsx`, `newConnectionRefundWebhook.test.ts`; this report, rules diff and [QA/checklist](new-connection-management-qa.md).

Modified: shared order models on server/client; provider abstraction and shared Razorpay transport; service-refund transport call site; new-connection routes and existing Razorpay webhook dispatch; existing email-delivery module and worker startup/shutdown; admin tab/routing/types/metadata, Catalog Settings link and extracted YouPI confirmation form; Account card, printable receipt and customer CSS/translations; package scripts/indexes; provider and Firestore-rule tests.

## Assumptions and limits

- One order can be funded by several methods; `provider` continues to identify its original online checkout, not its later offline collections.
- A partial collection is a derived UI label, avoiding a seventh payment status. `amountPaid` is net, not lifetime gross receipts.
- Explicit staff action is the authority for offline collections/manual refunds; bank execution cannot be verified by this website. YouPI still always requires bank-checked admin confirmation.
- A requested appointment is distinct from the admin-confirmed date/slot. Backdated confirmed dates are allowed for staff recording completed work.
- CSV is bounded, history is bounded, financial counters exclude test bookings, and new monthly financial aggregates use ledger **recording** timestamps.
- No GST invoice, live refund, YouPI hosting/observer, new gateway, policy rewrite, deployment or live migration is included.

## Exact changed-file inventory

- docs/new-connection-management-qa.md
- docs/new-connection-management-rules.diff
- docs/new-connection-management.md
- firestore.indexes.json
- package.json
- scripts/backfill-new-connection-ledger.ts
- server.ts
- server/emailDelivery.ts
- server/models/newConnectionManagement.ts
- server/models/newConnectionNotifications.ts
- server/models/newConnectionOrders.ts
- server/models/newConnectionRefunds.ts
- server/models/serviceRefunds.ts
- server/newConnectionPaymentProviders.ts
- server/razorpay.ts
- server/routes/newConnectionOrders.ts
- server/routes/rechargeRecovery.ts
- src/App.tsx
- src/components/AccountPage.tsx
- src/components/Admin/NewConnectionPaymentReview.tsx
- src/components/Admin/tabs/CatalogTab.tsx
- src/components/Admin/tabs/NewConnectionsTab.tsx
- src/components/Admin/tabs/new-connections.css
- src/components/AdminPortal.tsx
- src/components/NewConnection/BookingPage.tsx
- src/components/NewConnection/MyBookings.tsx
- src/components/NewConnection/new-connection.css
- src/lib/newConnectionOrders.ts
- src/lib/newConnectionTrackingCopy.ts
- src/lib/pageMetadata.ts
- src/lib/translations.ts
- src/types.ts
- tests/newConnectionCatalog.rules.test.ts
- tests/newConnectionManagement.test.ts
- tests/newConnectionProviders.test.ts
- tests/newConnectionRefundWebhook.test.ts
- tests/newConnectionTracking.test.tsx
