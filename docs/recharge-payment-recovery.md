# Recharge payment recovery and production CSP

Recharge captures no longer depend on a browser callback. The callback, signed webhook and scheduled recovery all validate provider-side order/payment data before updating the same idempotent payment ledger. Capture queues a request; it never confirms operator fulfillment.

## Razorpay setup

1. Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for the intended test or live environment.
2. In that environment's Razorpay dashboard, register `https://YOUR_DOMAIN/api/webhooks/recharges` for `payment.captured` and `order.paid`.
3. Put the webhook's independent signing secret in `RAZORPAY_RECHARGE_WEBHOOK_SECRET`. It is not the API key secret and is separate from the service-ticket webhook secret.
4. Keep the existing service-ticket webhook configured separately. Recharge and ticket orders are distinguished using provider-side order notes.

Signatures cover the exact raw request body. The route is mounted before the JSON parser and rejects invalid signatures. Duplicate deliveries are safe: ledger upserts retain captured/refunded state, and completed recovery intents are not requeued. Invalid payment/order/owner/amount/currency metadata is not recorded as a recharge.

See [Razorpay signature verification](https://github.com/razorpay/razorpay-node/blob/master/documents/paymentVerfication.md) and [payment webhook events](https://github.com/razorpay/markdown-docs/blob/master/webhooks/payments.md).

## Durable recovery

Before a provider checkout is returned to the browser, its order ID, mode, expected amount/currency, owner and retry state are persisted in `server_recharge_payment_intents` (Firestore in production). Local development uses `data/recharge_payment_intents.json`.

Long-running servers check up to 50 due intents every minute when `RECHARGE_RECONCILIATION_ENABLED` is not `false` and provider keys are configured. Retries use backoff, with pending records ordered by next-check time, so older failures do not starve records beyond the first 100. Records from a different key mode are not queried.

For serverless deployments, configure an external scheduler to POST `/api/internal/recharges/reconcile` every minute, with `Authorization: Bearer <RECHARGE_SCHEDULER_SECRET>`. Use a strong, independent secret. An in-process interval is not a reliable serverless scheduler.

This recovers orders created after pending-order persistence is enabled. Existing historical payments without pending intents still require provider-history backfill; the existing admin recent-payment sync remains explicitly limited to the latest 100 payments. No historical backfill was run as part of this change.

## Production CSP rollout

Production now sends `Content-Security-Policy-Report-Only` by default. Development leaves CSP disabled for Vite HMR. Required origins cover Firebase authentication, App Check/reCAPTCHA, Razorpay checkout and Google Fonts; scripts do not allow `unsafe-eval` or general inline execution. Inline styles remain allowed for the current React styling.

Reports POST to `/api/csp-report`, behind the API rate limiter. Logs contain only the effective directive and blocked origin/category, not full page URLs, scripts or query strings. Check browser developer tools and these reports while exercising sign-in, phone verification, App Check, checkout, fonts and receipt downloads in staging. Set `CSP_MODE=enforce` only after that review; report-only does not yet block violations.

## Catalogue deletion and reporting

Deletion now uses the authenticated server endpoint alone. A Firestore transaction deletes the plan and writes the deletion marker, initialization marker and audit with the stored plan's actual metadata. A failed or unconfirmed HTTP response is surfaced; the client does not independently delete Firestore records or fabricate a success audit. Retrying a committed deletion returns its existing audit.

Local development atomically records deletion IDs and audit entries together in `deleted_plan_ids.json`; the reader accepts the old array format and the new `{ deletedIds, auditLogs }` envelope. Seed/migration scripts support both. Existing bad audit rows are preserved and labelled as legacy/unverified in Reports rather than guessed from an ID.

Reports default to live paid amounts and distinct live paying customer UIDs, with connection count and test totals shown separately. Legacy unassigned records are not invented customer accounts.

## Validation still required

Regression tests were added for endpoint retirement, strict server-priced order requests, HTTP/network deletion failures, atomic deletion/audit consistency, capture recovery without browser verification, retry fairness above 100 pending orders, key-mode isolation, exact-byte webhook signatures, payment matching, reporting counts and CSP defaults.

Run in an isolated sandbox with dummy credentials and mocked providers:

```text
npm run lint
npx vitest run tests/legacyLookupRetired.test.ts tests/rechargeRecovery.test.ts tests/catalogDeletion.test.ts tests/catalogDeletionAtomic.test.ts tests/rechargeReport.test.ts tests/securityHeaders.test.ts tests/razorpay.test.ts tests/freshPaymentQuote.test.ts tests/catalogBatch.test.ts
npm run build
```

Do not copy live `.env` files, account data or credentials into the validation sandbox. Provider/dashboard configuration and production browser compatibility have not been exercised by these source changes.
