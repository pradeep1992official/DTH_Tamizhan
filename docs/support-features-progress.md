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
- Business details reuse BUSINESS_DETAILS; set website there or APP_URL on server. Optional TICKET_STORAGE_BUCKET overrides the configured Firebase bucket. Existing BREVO_ENABLED/API_KEY/SENDER_EMAIL/SENDER_NAME settings remain server-only.
- Added storage.rules and firebase.json storage mapping: default deny direct bucket access; owner/admin downloads use the server. These prototype rules require review before deployment; no rules or bucket changes have been deployed.
- 7 receipt/payment tests and TypeScript passed. Storage, email and real PDFs are not live-tested by mocked unit checks; the existing PDF renderer is reused.
