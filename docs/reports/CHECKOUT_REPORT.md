# Checkout correction report — QA-02 / QA-03

## Result

QA-02: Removed every prefilled card number, expiry and CVV, and removed local card collection entirely. Production explains that hosted provider checkout is required; sandbox explicitly labels card simulation and requests no card credentials.

QA-03: The mock QR illustration is displayed only in sandbox, with “Mock QR illustration - cannot be scanned or paid” and the visible “Test mode - no real payment will be taken” banner. Production displays an unavailable-provider/QR error and retry, with no substitute QR. The countdown uses the server expiry timestamp, clamps at zero and hides the illustration when expired. “Session expired, generate a new QR” offers a new mock session; the server also rejects expired sessions.

The former endpoint unconditionally set paymentStatus=paid and rechargeStatus=completed from client input. That implementation has been removed. No real payment provider integration exists in this repository. Production payments are therefore disabled until that integration is implemented; this change does not claim to make live payments operational.

## Single mode switch

Set `PAYMENT_MODE=sandbox` or `PAYMENT_MODE=production` in the server environment and restart the server. Missing, invalid or differently cased values select production and fail closed. The browser fetches `/api/payments/config`; it has no independent environment flag or mode override. `.env.example` defaults to production. Merely setting a gateway key does not enable payments.

Sandbox sessions use a bounded, process-local map, have TEST-prefixed UUID references and expire after three minutes. They never enter the real order arrays, disk persistence, Firestore, receipt callbacks or saved-box updates. The UI displays the server quote, provider name, reference, amount and factual next steps; decorative security and instant-activation claims were removed from checkout.

## Payment-flow review

| Area | Finding and correction | Remaining production work / decision |
| --- | --- | --- |
| Server-side prices | Before: amount, pack name and validity were trusted from the request. Now: catalog plan ID resolves to the server catalog; amount is converted to integer paise, with invalid prices and cross-operator/missing plans rejected. Client amount/name/validity cannot replace the quote. | Confirm the authoritative catalog source and any fees/taxes before integrating capture. |
| Amount tampering | Catalog price ignores arbitrary client amount fields. Custom top-up has an explicit face-value field, validated as finite positive INR, at most two decimals, safe integer paise and minimum INR 10. The displayed quote is the same server session amount used for simulation. | Confirm the maximum custom recharge and any operator-specific limits. A customer-selected top-up value is intentional, rather than a catalog-price override. |
| Signature / webhook verification | No provider SDK, order creation, signature verification or authenticated webhook handler exists. The unsafe automatic success path was removed; production creation/completion return 503. | Choose a provider and supply integration details through the approved secret mechanism. Verify provider signatures, merchant account, order ID, INR amount and captured/settled status before any paid transition. |
| Callback / redirect handling | No redirect or callback is treated as payment proof. Sandbox completion stays in the dialog and does not call App's real success/receipt handler. Stale responses after closing/changing checkout are ignored and requests are aborted. | Choose hosted checkout flow and return URLs. Implement server status lookup/reconciliation; treat return URLs as navigation only. |
| Duplicate clicks / idempotency | A synchronous UI lock prevents double clicks; requests use a stable random idempotency key for retries. Sandbox returns the same session for the same intent, rejects key reuse with changed intent, and returns the same terminal result for repeated completion. Conflicting results return 409. | Implement durable, owner-bound idempotency with database uniqueness/atomic transitions and provider idempotency. Current protection is deliberately process-local and sandbox-only. Decide whether guest payment is supported. |
| Webhook replay | No webhook endpoint accepts provider success, so no webhook can currently credit a recharge. Production remains blocked. | After provider selection, verify raw-body signatures and persist unique event/payment IDs; enforce atomic monotonic transitions, replay deduplication and provider-specific timestamp/reconciliation rules. |
| Success | Sandbox explicitly says no real payment or recharge was made. It creates no production order or receipt. | Real success must follow server verification, then enqueue recharge separately from payment capture. |
| Failure | Sandbox failure says no money was taken; API errors remain visible with retry. | Add provider decline/cancel details and reconciliation for ambiguous results. |
| Pending | Explicit sandbox pending state says it is not success and no recharge started. | Add durable status polling/webhook updates and customer recovery after closing the dialog. |
| Timeout / expiry | Requests have a 15-second timeout. Retrying keeps the same session/key; server enforces expiry. QR disappears at expiry and a new-session action appears. Countdown uses wall-clock deadlines, so background throttling does not extend server validity. | Provider QR expiry and production status reconciliation depend on the chosen provider. |

Administrative order imports/status updates remain administrative capabilities outside payment verification; no payment callback was added to them. Firestore rules and production infrastructure were not changed or deployed.

## Files changed for this task

- `.env.example`: one runtime mode flag and accurate gateway-key comment.
- `server.ts`: mount payment routes.
- `server/payments.ts`: mode policy, server calculation, isolated sandbox sessions, expiry and idempotency.
- `server/routes/payments.ts`: config, session preparation and sandbox completion endpoints with validation/rate limiting.
- `server/routes/orders.ts`: remove old recharge-creation route.
- `server/controllers/ordersController.ts`: remove automatic paid/completed order creation.
- `src/components/PaymentModal.tsx`: factual checkout, sandbox labeling, no credential collection, retry, expiry and result states.
- `tests/payments.test.ts`: mode, tampering, quote calculation, expiry and duplicate-request tests.
- `tests/paymentInstrument.test.tsx`: production/sandbox card and QR rendering regressions.
- `CHECKOUT_REPORT.md`: this report.

Earlier subscriber-validation corrections remain in the working tree and were not reverted. No data files, real customer records, orders or secrets were modified.

## Verification

- Lint (`npm run lint`), explicit type check (`npx tsc --noEmit`) and production build passed.
- 19 new checkout tests passed, using injected fixture catalogs/clocks and server-rendered UI. No payment API or live provider was contacted.
- Full suite: 106 passed, 3 failed. The same three savings tests from the preceding task still fail at calculateSavings.test.ts:97, :128 and :142 (expected oneMonthRate 300/200/200, received 0). Savings code was left unchanged.
- Build retains large-bundle and CommonJS/import.meta warnings.
- Existing Firestore tests skip live assertions without the local emulator. No emulator or production server was started.
- No interactive browser verification was performed. Tests cover instrument markup and server/service behavior; network-timeout and modal focus/click behavior were reviewed in source.

Before live checkout can be enabled, the required decisions are provider/merchant integration, hosted checkout and return URLs, allowed top-up limits/fees, guest-versus-authenticated ownership, and durable payment/idempotency/event storage. Provider verification and reconciliation must be implemented and tested before removing the production block.
