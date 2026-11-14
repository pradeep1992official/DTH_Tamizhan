# Unified Get Help

Customer entry point: `/help`. `/support` and `/service-request` redirect here, preserving prefill state. `/my-tickets` remains a tracker with replies and receipts, not a second intake form. Header (desktop/mobile), footer, Account, failed checkout/recharge history, and assistant cards all link to Get Help.

## Server routing and lifecycle

`src/lib/help.ts` is the fixed chip configuration. The server validates the submitted chip against this whitelist; client-supplied route/type/status/payment fields are rejected. Named chips never call Gemini. Only `other` invokes the existing audited `recommend_support_option` tool. Its strict result is `{route: "free" | "dth_service", confident, category, summary}`. Failed provider/key checks, invalid output and uncertainty fall back to free/other. Summary text is stripped of HTML and collapsed to one line.

- Free chips: recharge failed, money deducted, refund, website/app, account/login.
- DTH chips: no signal/box not working, wrong pack, missing channels, company billing/balance.
- Both paths initially create an `open` unpaid ticket. Free is `type=support`; a DTH issue is `type=dth_service`, also free with `payment.required=false` and amount zero.
- Customer-care choice records an event and keeps the ticket free (`type=support`). No gateway call or charge occurs. The DTH classification remains available for later assistance.
- Optional assistance upgrades the same ID and ticket number to `service_request/pending_payment` in a transaction, checking owner, brand, subscriber, duplicate lock and paid daily cap. No second ticket is created. Terms require a separate customer checkbox/click.
- Provider order creation attaches to that ticket through the existing Razorpay library. Signature/provider checks, signed raw webhook, receipt generation, paidAt-based 24-hour refund worker and admin queue are reused. Live service checkout remains blocked by the existing test-key gate.
- Unpaid expiry is 30 minutes from `checkoutStartedAt` on upgrade, not the original free-ticket date. The 24-hour placement clock still starts only after verified captured payment.
- Admins can reclassify open unpaid tickets with a reason and can mark the same ticket upgraded, awaiting customer payment. Admin actions do not assert payment. Classification, customer-care choice and upgrades append statusHistory entries with event/type/actor/time.
- Existing records remain readable; new fields/history metadata are optional. No rule broadening or data migration is required. Private notes stay outside owner-readable ticket documents.

## Existing protections

Firebase token checks, App Check on customer writes, persistent 20/user/minute and 40/IP/minute limits, honeypots, sanitization, owned-order linking and server-only financial fields remain. Support intake stays capped at 3/day; unpaid DTH intake is capped at 5/day, and actual paid upgrades have their own 5/day cap. Duplicate locks are per signed-in user + brand + subscriber and are reused across free DTH intake and upgrade. Idempotent retries neither allocate another ticket nor consume another paid-upgrade slot.

Old route-specific creation POSTs return 410, preventing a client from selecting its own route or creating a paid request outside the unified intake. Existing verify/resume/webhook paths remain available for older tickets.

## Customer care config

`customerCarePhone` is editable in Admin > Operators > Service request brands. Missing phone fields on existing standard-brand configs inherit the verified default; explicit admin values, including an intentionally empty phone, are respected. Unknown/custom brands never get guessed numbers. The UI shows a phone only when configured. Customer-care service has no assistance fee; network charges may apply.

Initial numbers were checked against the [TRAI operator directory](https://www.trai.gov.in/sites/default/files/2025-07/DTH_Operators_30072025.pdf) and [Dish TV contact page](https://www.dishtv.in/get-help/contact-us.html). Recheck them when editing brand settings.

## How to test

Requires configured Firebase credentials, App Check site key, test Razorpay credentials and the existing scheduler/webhook/Storage/Brevo setup for real integration checks. Unit tests use mocks and do not send email, make calls, collect payments or issue real refunds.

| Route/action | Test | Expected result |
|---|---|---|
| Free chips | Submit each of recharge failed, money deducted, refund, website/app, account/login | Open free ticket, number and My tickets tracking; no checkout or subscriber input. Optional linked orders must belong to the caller. |
| DTH chips | Select each of no signal/box, wrong pack, missing channels, billing/balance; enter valid brand/subscriber | Open unpaid DTH ticket, then assistance details and the free-help disclaimer. Gemini is not called. |
| Other, confident DTH | Enter a clear DTH issue with Gemini available | Open DTH ticket with cleaned summary. If brand/subscriber is missing, collect it in the options card before upgrade. |
| Other, free/uncertain/outage | Describe a website issue; mock uncertain output, malformed JSON, or unavailable Gemini | Open free ticket; admin can reclassify. Never reuse a paid suggestion or silently charge. |
| Free-help disclaimer | Open the DTH assistance card | Small note directs the customer to their DTH provider for free help. No call card, WhatsApp/email links or no-payment-taken text. |
| Paid assistance | Accept fee/refund terms and tap assistance; complete test checkout | Same ticket ID AND number; pending_payment then paid only after verification; paidAt, receipt, timer and admin queue follow existing flow. Retry creates no second ticket/order. |
| Resume/expiry/refund | Close checkout, resume via My tickets; upgrade a two-day-old free ticket; force 24h-overdue paid ticket in a test fixture | Resume reuses order; old creation date does not immediately expire a new upgrade; signed webhook/worker reconciles capture/refund and receipt status. |
| Admin reclassification | As approved admin reclassify an open free ticket, then mark it upgraded with valid brand/subscriber | Same ticket/history; payment still unconfirmed until customer checkout. Customer/guest calls to admin endpoints get 401/403. |
| Security | Forge route/type/UID/status/amount; link another user's order; repeat subscriber; omit App Check; fill honeypot; exceed caps | Rejected server-side; no change to permissions/payment state. |
| Navigation/languages | Visit old URLs, header/mobile menu, footer, failed recharge screen and assistant; switch Tamil/English | One /help intake, preserved editable prefills, no auto-submit, no preselected payment consent, short translated page copy. |

Automated checks cover all named chips, Gemini fallback/uncertainty, same-ticket upgrades, owner/duplicate restrictions, call choice/history, admin gates, late upgrade expiry, UI/prefills, and existing payment/refund/receipt/abuse paths. 73 focused checks across 15 files pass. TypeScript and production build pass. Wider suite still has the six previously documented baseline failures (savings expectations, error-boundary retry URL, checkout localization mock and policy paragraph parity); emulator checks remain skipped without Java.

## Files changed

- [docs/unified-help.md](../docs/unified-help.md)
- [server/models/help.ts](../server/models/help.ts)
- [server/models/serviceBrands.ts](../server/models/serviceBrands.ts)
- [server/models/servicePayments.ts](../server/models/servicePayments.ts)
- [server/models/serviceSchedule.ts](../server/models/serviceSchedule.ts)
- [server/models/ticketAdmin.ts](../server/models/ticketAdmin.ts)
- [server/models/ticketNotifications.ts](../server/models/ticketNotifications.ts)
- [server/models/tickets.ts](../server/models/tickets.ts)
- [server/routes/adminTickets.ts](../server/routes/adminTickets.ts)
- [server/routes/servicePayments.ts](../server/routes/servicePayments.ts)
- [server/routes/tickets.ts](../server/routes/tickets.ts)
- [server/utils/assistantPrompt.ts](../server/utils/assistantPrompt.ts)
- [server/utils/supportRouting.ts](../server/utils/supportRouting.ts)
- [src/App.tsx](../src/App.tsx)
- [src/components/AccountPage.tsx](../src/components/AccountPage.tsx)
- [src/components/Admin/ServiceBrandsPanel.tsx](../src/components/Admin/ServiceBrandsPanel.tsx)
- [src/components/Admin/TicketsPanel.tsx](../src/components/Admin/TicketsPanel.tsx)
- [src/components/AssistantDraftCard.tsx](../src/components/AssistantDraftCard.tsx)
- [src/components/AssistantSupportCard.tsx](../src/components/AssistantSupportCard.tsx)
- [src/components/CustomerHistoryPage.tsx](../src/components/CustomerHistoryPage.tsx)
- [src/components/Header.tsx](../src/components/Header.tsx)
- [src/components/HelpAddressFields.tsx](../src/components/HelpAddressFields.tsx)
- [src/components/HelpPage.tsx](../src/components/HelpPage.tsx)
- [src/components/PaymentModal.tsx](../src/components/PaymentModal.tsx)
- [src/components/RazorpayCheckout.tsx](../src/components/RazorpayCheckout.tsx)
- [src/components/RechargeAssistant.tsx](../src/components/RechargeAssistant.tsx)
- src/components/ServiceRequestPage.tsx (removed)
- [src/components/ServiceTicketPaymentButton.tsx](../src/components/ServiceTicketPaymentButton.tsx)
- [src/components/SupportTicketsPage.tsx](../src/components/SupportTicketsPage.tsx)
- [src/lib/assistantActions.ts](../src/lib/assistantActions.ts)
- [src/lib/assistantDraftCopy.ts](../src/lib/assistantDraftCopy.ts)
- [src/lib/help.ts](../src/lib/help.ts)
- [src/lib/pageMetadata.ts](../src/lib/pageMetadata.ts)
- [src/lib/serviceBrands.ts](../src/lib/serviceBrands.ts)
- [src/lib/supportRouting.ts](../src/lib/supportRouting.ts)
- [src/lib/tickets.ts](../src/lib/tickets.ts)
- [src/workspace.css](../src/workspace.css)
- [tests/assistantDrafts.test.tsx](../tests/assistantDrafts.test.tsx)
- [tests/help.test.ts](../tests/help.test.ts)
- [tests/helpAdminApi.test.ts](../tests/helpAdminApi.test.ts)
- [tests/helpPage.test.tsx](../tests/helpPage.test.tsx)
- [tests/supportRouting.test.tsx](../tests/supportRouting.test.tsx)
- [tests/supportTickets.test.ts](../tests/supportTickets.test.ts)
- [tests/tickets.test.ts](../tests/tickets.test.ts)


## Full address for DTH-service issues

The DTH section collects a full address (door/street, locality, city, state and PIN), with Tamil/English labels. Text is sanitized and limited to 15-500 characters. Deterministic DTH intake requires it server-side. If free text is classified as DTH after ticket creation, the options card collects the address before customer-care follow-up or a paid upgrade. Free support does not require or retain an address. Admin upgrades also validate the full address, and ticket details display it. Older records without the field remain readable; no data migration or rule broadening is needed. Address is not sent to Gemini for classification.

Tests: select a DTH chip and try an empty/short address (blocked); submit a complete address (stored); classify Other as DTH then upgrade without address (blocked); add address and retry (same ticket upgraded). Free website/account support still works without an address.

PIN code is a separate required input (six digits, starting with 1-9), stored as pinCode. The address textarea no longer requires PIN text. Both fields show individual errors directly beneath the control, on blur or submission, with aria-invalid/aria-describedby and suppressed native validation popups for these controls. Missing, five/seven-digit, zero-prefixed and letter-attached PIN codes are rejected server-side for DTH intake, customer-care follow-up and paid/admin upgrades. Older records may prefill PIN from their saved address when no separate pinCode exists. This validates PIN format, not postal deliverability.

Latest customer-page copy: the direct customer-care call card and network-charge note are removed. The page uses a small free-help disclaimer, keeps the fee/refund terms, and sends customers to My tickets for tracking. WhatsApp/email links and the no-payment-taken sentence are removed from this page. Existing backend customer-care handling remains available for compatibility.
