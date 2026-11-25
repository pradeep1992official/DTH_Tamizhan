> Current support: YouPI checkout and settings have been retired. Razorpay and configured payment-free bookings remain. Any YouPI references below describe historical records or legacy reconciliation only.

# Part 4 QA, manual checks and go-live

## Automated verification

Run from the repository with Windows commands:

```powershell
npm.cmd run lint
npm.cmd run type-check
npm.cmd run check:i18n
npm.cmd run build
npm.cmd test
```

Latest full-suite result: **121 test files passed, 1 skipped; 862 tests passed, 7 skipped**. Lint, type-check, localization and production build pass. No live gateway or email delivery was exercised.

New tests cover every new admin route for guest/customer/unapproved/revoked identities; owner isolation; bounded pagination/prefix filtering; status map/schedule validation; cancellation acceptance/rejection safeguards; private notes and customer/CSV/email projection; decimal/cap/idempotency enforcement; concurrent UPI/bank reference claims; partial legacy capture normalization; manual/gateway refunds; pending reservations; ambiguous retry keys; duplicate/wrong-amount/delayed refund outcomes; disabled/live Razorpay rejection; notification retry/failure isolation; account route metadata and English/Tamil tracking/cancellation UI. Parts 1–3 tests are retained; provider tests deliberately extend refund coverage and rule tests extend the existing deny-write/private-collection assertions.

Firestore emulator tests are skipped without `FIRESTORE_EMULATOR_HOST`; Java was unavailable in the environment previously. Run the existing emulator test command with Java installed before go-live. No emulator assertions are represented as executed here.

The production build retains the earlier large-chunk warning. It is not a build failure. Browser automation reported its host unavailable. The native read-only Chrome fallback then stopped because it could not determine the current browser URL with enough confidence to enforce policy. **No visual/mobile/browser-console certification is claimed.** UI tests, styling review and the manual checklist below supplement that limitation; finish the browser checks before launch.

## Findings in earlier parts — reported, not silently rewritten

1. **Activated SAMPLE rows are customer-reachable.** Seeding defaults to inactive and labels names SAMPLE, but `visibleCatalog` checks active brand/pack rather than excluding `sampleData`. An explicit `--activate-sample` can make fictional offers browsable/bookable. Keep all SAMPLE rows inactive or wipe them before launch; add a separate production-only exclusion guard in an agreed earlier-part follow-up. This task did not activate, seed, wipe or read live sample records.
2. **Part 3 create-booking history queries are uncapped.** They fetch the previous 24 hours for UID and phone before filtering unpaid/duplicates. The time window and booking limits reduce normal volume, but do not impose a hard result cap on historical paid/cancelled data. Replace with filtered bounded/aggregate checks in a separate Part 3 change while retaining its transaction fence.
3. **Catalog reads grow with the entire catalog.** Server booking/config helpers load all catalog collections, and the public client loads all active brands/packs/channels/equipment. Part 2 caches these for five minutes. This is suitable for the current small catalog but can be costly as channel/catalog volume grows. The new orders table does not load all orders or fetch the entire catalog for its brand picker.
4. **Five-minute storefront cache can show stale prices/activation.** The existing server price-change guard rereads the authoritative catalog/settings and rejects mismatched quotes before creation; inactive/incompatible selections are rejected. The old browser cache itself is not invalidated by an admin edit. Keep the existing explicit quote reconfirmation; a cache invalidation/refresh UX improvement belongs to Parts 2–3.
5. **Disabled provider verification is deliberately still possible for existing attempts.** New checkout/refund creation is flag-gated; existing captured payments still need reconciliation after a flag is turned off. Do not treat a read/verification endpoint for an existing attempt as permission to create another checkout. No live Razorpay key is accepted by the new-connection adapter.
6. **Receipt loading depends on catalog availability.** The Part 3 receipt is nested under the catalog loader. A catalog outage can therefore block the receipt route even when an order exists. My Bookings loads independently through the owner API, but the requested reused print route retains this earlier dependency.
7. Existing sample price warnings and business policy content need an operator review. No broad earlier-page rewrite or payment-provider policy change was made here.

## Manual acceptance checklist

Use a staging dataset or clearly identified test bookings. Never run gateway tests with live keys. Confirm both desktop and a narrow (~360px) mobile viewport, keyboard navigation, English and Tamil.

- [ ] None mode: enabledProviders=[], defaultProvider=none, advanceMode=none. Sign in with Google, submit a real-looking **test** request with no online payment. Verify booking received, zero net paid, full balance and one admin/customer notification event.
- [ ] Admin → New Connections: loading/error/empty states; filter by each status/provider/brand/district/date, search name/phone/booking prefix, next/previous with identical timestamps, clear filters and refresh. Counters are server values; test bookings are excluded from collected totals.
- [ ] Drawer: customer details and original price breakdown; call/WhatsApp draft targets the customer and includes booking ID/confirmed slot. Opening a draft sends nothing.
- [ ] received → contacted → scheduled with confirmed date/slot → installed. Missing schedule/invalid jumps are rejected. Verify installed with balance is allowed and flagged.
- [ ] Public message versus Internal only: save different text, inspect the owner API, My Bookings, receipt, CSV and emails. Only public text appears. Add an internal-only note after installation without changing public history.
- [ ] Record cash/UPI/bank collection: 300 then 700 against a 1,000 total. First shows partial/700 balance; second paid/0. Replay the same request/key, then try changed payload/same key, overpayment, negative/three-decimal amount and a concurrent final collection. No duplicate/overpayment occurs.
- [ ] Reference uniqueness: use the same UPI/bank reference simultaneously on two bookings and against a previously bank-confirmed YouPI UTR. Only one new claim succeeds.
- [ ] Manual refund: record only after an outside transfer; select the correct payment source, enter amount/method/reference/private reason/public note. Test partial then full, duplicate request, cap violation and missing fields. No gateway call; only recorded refunds reduce totals; policy reminder is visible.
- [ ] Razorpay test refund: captured test payment → partial refund pending → signed refund.processed. Replay webhook; wrong amount/payment/currency must fail. Test refund.failed and ambiguous network response with the **same key**. Check one refund ledger entry, correct reservation release, original booking status restoration and refund email. Test multiple outstanding partial refunds.
- [ ] Disabled/live gateway: disable new-connection Razorpay flag or use a live-prefixed test fixture key. New refund initiation is rejected before reservation. Existing refund status reconciliation remains test-key-only. No production refund is exercised.
- [ ] Mixed sources: test gateway deposit plus offline balance; cannot refund more through Razorpay than its source payment. Refund offline source manually and gateway source through the test gateway separately.
- [ ] YouPI queue: Catalog Settings link opens the new filtered table. Pending timeouts remain visible. Exact amount, unique 12-digit UTR, private bank note and checked-bank box are still required; observation/redirect/forged callback cannot mark paid. Recorded UTR appears as one payment ledger entry.
- [ ] Email failure: mock/disable Brevo, commit a collection/status/refund, verify business mutation succeeds and failure flag/event appear. Retry once automatically; manual retry after recovery clears flag. Confirm no private reasons/raw gateway content and bilingual public copy. Test emails require BREVO_SEND_TEST_EMAILS=true.
- [ ] My Account → My Bookings: own paginated list, amounts/refunded totals, confirmed slot, public timeline, payment-verification warning and print link. Sign out/switch accounts; no old owner's rows remain.
- [ ] Cancellation: owner request in received/contacted, second open request rejected, scheduled/installed request rejected. Admin decline leaves booking unchanged and optional public message visible. Admin accept requires private cancel reason and never automatically refunds.
- [ ] Security: guest/customer/unapproved/revoked admin cannot use **each** new admin route. Revoke an already signed-in admin, then retry mutations with the existing session. Cross-owner detail/list/cancellation cannot expose data; direct Firestore writes to ledger/cancellation/private collections are denied.
- [ ] Export: filters match visible results across pages; values beginning with =,+,-,@ or leading whitespace plus formula marker are inert; no private notes. Over 5,000 matches requests narrower filters.
- [ ] Accessibility/mobile: visible focus, drawer focus trap/Escape/focus return, labelled controls, alert/loading announcements, horizontal table scroll within its container, no body overflow or clipped Tamil text. Check browser console for errors and broken network calls.
- [ ] Legacy migration: dry run first, review normalized partial advances, backup, then explicit write in staging. Repeat and verify no duplicates. Review any unexpected legacy refunded record manually.

## Go-live checklist

- [ ] Keep no providers enabled and advanceMode=none for the initial offline-payment launch. Booking, scheduling, ledger and tracking work in this mode.
- [ ] Review/deactivate or remove all active SAMPLE data. Confirm real brand/pack/equipment prices and service areas with the business; price-verified timestamps current.
- [ ] Finish browser/mobile/Tamil checks and run the Firestore emulator security suite; review new Enterprise query plans/costs with realistic data.
- [ ] Backup and review/run the ledger migration before launch so stored filter values/direct reads match derived totals. Do not run migrations from a customer browser.
- [ ] Review/apply the documented rules/indexes deployment separately. **No deployment was performed in this task.**
- [ ] Confirm approved-admin registry, revoked-session behavior, least-privilege server credentials, email sender and private collection denial. Review daily email capacity shared with existing receipt delivery.
- [ ] Monitor notificationFailed, awaiting confirmation, initiated/failed refunds, outstanding balances, worker health and gateway delivery failures. Document how staff retain an ambiguous request's idempotency key and reconcile it before retrying.
- [ ] Razorpay remains test-only. Merchant verification alone is insufficient: this implementation intentionally rejects live keys. A separately reviewed live-mode change is required before accepting real Razorpay money or issuing live refunds.
- [ ] YouPI remains experimental and off by default. Real use requires an explicit business decision, audited external hosting/observers, enabled server flag **and** catalog provider configuration, authenticated callbacks, independent bank checking and staffed reconciliation/manual refunds. Enabling flags does not certify it as production-ready or permit automatic paid transitions.
- [ ] Offline collections/manual transfers are staff actions outside the gateway. Train staff to verify actual money received/returned before recording it, use references and distinguish public messages from internal reasons.
- [ ] Business content updates are required on `/terms` (new hardware/installation obligations and scheduling), `/refund-policy` (equipment/installation cancellation, manual transfers and eligibility/timelines), `/privacy-policy` (installation address/contact, order/ledger retention and any approved YouPI processing), and `/contact` (installation/service-area/cancellation support). Update the corresponding Catalog terms/refundPolicy/serviceNote/disclaimer with approved copy. These pages were **not** rewritten.

No GST/tax invoice, live payment/refund, YouPI hosting or observer setup is included.
