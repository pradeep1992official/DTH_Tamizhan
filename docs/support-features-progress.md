# Support feature implementation progress

Build order: 1, 2, 3B, 3, 4, 5, 6, 7, 8. Commit and push each before proceeding.

## Prompt 1
- Added strict ticket input/record schemas and atomic Firestore counter + creation transaction.
- Kept the existing token + approved-admin registry policy (no custom admin claim exists).
- Rules: owners/admins may read tickets; ALL mutations, including admin actions, go through server endpoints. This reconciles the plan's admin-update requirement with its server-only lifecycle/payment requirement.
- Actual internal notes belong in server_ticket_private; adminNotes in owner-readable tickets remains empty.
- Existing imported server_support_tickets remains separate and unchanged.
- TypeScript and 4 unit checks passed. Emulator ownership/write tests added; skipped because Java is not installed. No live rules deployed.

Rules addition:
```text
match /tickets/{ticketId} {
  allow read: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin());
  allow create, update, delete: if false;
}
match /server_ticket_counters/{counterId} { allow read, write: if false; }
match /server_ticket_private/{ticketId} { allow read, write: if false; }
```

## Prompt 2
- Added /support and /my-tickets, reachable from Account. Free-ticket creation, owned-order validation, paginated owner-only lists and server-mediated reply threads.
- WhatsApp opens an encoded draft to the existing business support number; no message is sent automatically.
- Strict server input prevents changing UID/type/payment/status. Responses omit private notes and use no-store. Existing email support remains available.
- 7 focused tests and production build passed (existing chunk-size/CJS warnings remain). No live tickets created.

## Prompt 3B
- Added validated, admin-editable service brand config in server_service_config/brands, defaulting to the five requested brands only when the config document is absent.
- Admin > Operators > Service request brands edits formats/enabled brands without deployment; server verifies existing admin authority.
- Shared schema/validation exports are used by the next service form/server. Assistant get_service_brands reads the same persisted source; no model-defined formats.
- TypeScript and brand/assistant tests passed; database failures fail closed. Config uses default-deny direct Firestore rules and a public read-only server projection.

## Prompt 3
- Added /service-request with the requested disclosure, dynamic brand formats, refund-terms checkbox and existing Razorpay Checkout loader/library.
- New isolated service APIs do not change recharge checkout. Price fixed at 5000 paise INR. Service payments require rzp_test_ keys; live service checkout is deliberately blocked pending end-to-end merchant testing.
- Atomic ticket/duplicate locks and client request keys prevent duplicate requests. Ambiguous provider order creation is never blindly retried; admin recovery is required to avoid duplicate charges.
- Checkout signature plus fetched order/payment ownership, amount/currency/capture checks; raw-body signed webhook; transaction-backed payment deduplication; durable paid event for subsequent receipt/email work. Late capture after expiration is reconciled as paid.
- Unpaid expiry runs via POST /api/internal/tickets/run. Configure Cloud Scheduler every 5 minutes, Authorization Bearer TICKET_SCHEDULER_SECRET. This service uses Cloud Run, so no separate Firebase Functions library was added. Scheduler creation/deployment has not been performed.
- Environment: existing RAZORPAY_KEY_ID (test), RAZORPAY_KEY_SECRET; new SERVICE_RAZORPAY_WEBHOOK_SECRET and TICKET_SCHEDULER_SECRET (server secrets only).
- Razorpay test Dashboard webhook: /api/webhooks/service-requests, enable payment.captured and order.paid. Use the exact webhook secret above. Test checkout, close/reload, duplicate webhook, wrong amount/signature, late capture after expiry, and forced refund after Prompt 6 before any live rollout.
- 11 focused tests, TypeScript and production build passed. Live-provider E2E requires merchant test credentials and reachable webhook; it was not simulated as a real payment.
- Provider references: https://github.com/razorpay/markdown-docs/blob/master/webhooks/validate-test.md and https://github.com/razorpay/markdown-docs/blob/master/payments/payment-gateway/web-integration/custom/best-practices.md

## Prompt 4
- Added atomic financial-year receipt allocation, repeatable PDF generation using the existing PDF renderer, masked subscriber IDs and private Firebase Storage files. Allocation commits counter + ticket together, retaining reserved numbers through upload retries; no deleted receipt numbers or PDF-failure gaps.
- Owner/admin authenticated downloads, My tickets Download bill, Admin > Payments service receipts/date-range CSV (max 500; narrower range required above this). Formula-safe quoted CSV.
- Receipt emails use existing Brevo configuration, queued paid events and explicit BREVO_SEND_TEST_EMAILS=true; verified account email required. Ambiguous old send attempts enter review rather than risk duplicate mail.
- Business details reuse BUSINESS_DETAILS through server/serviceBusiness.ts; set APP_URL on the server for the website. Optional TICKET_STORAGE_BUCKET overrides the configured Firebase bucket. Existing BREVO_ENABLED/API_KEY/SENDER_EMAIL/SENDER_NAME settings remain server-only.
- Added storage.rules and firebase.json storage mapping: default deny direct bucket access; owner/admin downloads use the server. These prototype rules require review before deployment; no rules or bucket changes have been deployed.
- 7 receipt/payment tests and TypeScript passed. Storage, email and real PDFs are not live-tested by mocked unit checks; the existing PDF renderer is reused.

## Prompt 5
- Added /admin/tickets and Tickets navigation: support/service tabs, fixed server-side filters, exact phone/subscriber/ticket search and pagination.
- Detail view, copy phone/subscriber, company reference, private internal notes, status history, customer reply posting and WhatsApp draft updates.
- All endpoints enforce existing server admin policy. Lifecycle transitions, reference requirement, pre-24h placement deadline and refund-in-progress exclusion are checked inside the update transaction.
- Internal notes never enter owner-readable ticket documents. Paid requests under 6 hours from deadline are highlighted; countdown refreshes every minute.
- 11 focused tests, TypeScript and build passed; no customer messages, WhatsApp messages or status changes sent to live systems.

## Prompt 6
- Added ticket-created, payment/receipt, placed-with-company/reference, resolved/closed and confirmed-refund email templates in one place using the existing Brevo transport approach. HTML escapes dynamic values. No new email service/library.
- Scheduled overdue refunds scan unplaced paid requests older than 24h. Per-ticket transaction lease excludes placement, keeps stable refund reason/body, reconciles existing provider refunds, stores returned refund IDs, and uses X-Refund-Idempotency. The installed SDK strips this header, so only the refund POST uses native fetch; SDK is reused for reads/reconciliation.
- Pending refunds stay processing; only provider-confirmed processed refunds become auto_refunded, invalidate the cached PDF status, release duplicate locks and trigger confirmation email. Late failed/pending webhooks cannot regress a processed refund.
- Third failure flags refund needs attention; retries reconcile safely. Admin manual refunds use the same path with reason + explicit confirmation. Customer view explains status and typical bank-credit timing; service test payments/refunds are labelled honestly.
- Add refund.processed and refund.failed to the service webhook subscriptions. /api/internal/tickets/run handles expiry/receipts/email and overdue refunds; schedule at least hourly (every 5 minutes recommended for unpaid expiry). Cloud Scheduler/webhook/secrets deployment remains an operator step.
- 15 focused tests and TypeScript passed, including concurrent refund calls, existing refunds, stable idempotency after network failure, deadline/placed exclusion. No real refunds or emails were sent.
- Refund contract reference: https://raw.githubusercontent.com/razorpay/markdown-docs/master/api/refunds/normal-refunds-idempotent.md

## Prompt 7
- All customer ticket/service POSTs require Firebase ID token plus an App Check token for this exact web app. No production bypass. Public GET config and signed provider webhooks are appropriately separate.
- Register this web app with reCAPTCHA Enterprise in Firebase App Check, authorize deployment domains, set public VITE_FIREBASE_APPCHECK_SITE_KEY at build time and rebuild. No App Check registration tool is connected, and no site key was present, so actual Firebase-console registration/enforcement rollout is not falsely claimed complete. The new APIs fail closed without valid attestation.
- Persistent transactional rate limits: 20 writes/user/minute and 40/IP/minute. Daily caps are in the ticket-creation transaction: 3 support tickets and 5 service requests per Asia/Kolkata day. Idempotent requests return before counter increments. Existing duplicate-open subscriber locks are atomic.
- Both forms have hidden honeypots; server rejects filled honeypots, strips HTML/control characters, applies strict schemas/size limits, and logs blocked attempts without raw submitted bodies. Admin Tickets > Blocked attempts loads latest 100 logs.
- Optional Firestore TTL housekeeping: expiresAt on server_ticket_limits and server_ticket_daily_caps; correctness does not depend on TTL. Decide retention for server_ticket_blocks before rollout.
- Test: omit/forge X-Firebase-AppCheck or use another app's token (403); fill website honeypot (400); fourth support/sixth unique service request same day (429); 21st user or 41st IP POST/minute (429); same brand/subscriber open request (409); HTML descriptions stored as text. Next India day resets caps. Use Firebase's registered debug provider locally, never a production bypass token in source.
- 16 focused tests and TypeScript passed. .env.example lists new public/site and server-only settings.
- References: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider and https://firebase.google.com/docs/app-check/custom-resource-backend

## Prompt 8
- Added recommend_support_option, prefill_support_form and prefill_service_request to the existing audited customer tool registry.
- Constrained Gemini classification chooses a free ticket or optional paid DTH-company assistance; strict code validation rejects invalid category/option combinations. Current brand config and linked-order ownership are checked server-side for prefills.
- Assistant cards explain free customer care versus the Rs.50 convenience option and offer Review (plus free-support alternative). Only a customer click opens the chosen form; no tool can create a ticket, accept terms, start checkout, pay or submit. Safe route state carries editable fields, never URL query PII or authority fields.
- Forms consume validated draft state, leave payment acceptance unchecked, and still pass through all server/App Check validation. Tamil/Tanglish explanation support retained.
- 26 assistant/routing tests and build passed. Full suite: 657 passed, 6 failed, 2 skipped; the same six failing tests reproduce at starting commit 542655f (savings one-month-rate expectations, global-boundary retry URL expectation, checkout localization mock, policy terms paragraph parity). Removed an empty website translation introduced during receipts; business details now reuse a server config wrapper and APP_URL. Existing unrelated failures were not edited.
- Live Gemini, Firebase, Storage, Brevo and Razorpay test E2E remain deployment checks; mocks are not reported as real provider verification.


## Final recovery checks
- Added owner-verified resume/check-payment action for existing requests from My tickets. It reuses the same provider order, reconciles captured late payments before showing checkout, and blocks a second payment while authorization awaits capture.
- Late captures preserve a newer subscriber lock and flag the older request for admin review rather than overwriting it.
- Final focused run: 37 support/payment/receipt/abuse/routing tests passed; production build passed with existing chunk-size and CJS import.meta warnings. TypeScript passed.
- Other simultaneous workspace edits to refund drafting and admin presentation were preserved and excluded from this recovery commit.

## Rollout still required
1. Register App Check/reCAPTCHA Enterprise and set the public build-time site key; custom ticket POSTs fail closed until attested.
2. Provision backend Firebase credentials/database/bucket permissions; review and deploy Firestore/Storage rules. Java is missing locally, so emulator integration tests remain skipped.
3. Set server-only test Razorpay, webhook and scheduler secrets; configure auto-capture and the four webhook events listed above.
4. Configure Cloud Scheduler for the protected maintenance endpoint. Enable Brevo and explicitly opt in to service test emails; use verified customer emails.
5. Run the real test checkout/webhook/PDF/email/forced-refund flow in a deployed test environment. Live service keys remain blocked in code until this is verified.
6. The document's accounting/CA review and real brand-format review remain merchant decisions.
