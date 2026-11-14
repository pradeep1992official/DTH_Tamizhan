# Admin AI panel

Open `/admin/ai` or choose **AI assistant** in the admin console. All `/api/admin/ai/*` routes independently verify a Firebase bearer token and the existing root/approved-admin registry policy, including current registry status and email binding. This project does not currently use an admin custom claim. UI role fields, cached emails and client claims do not grant this API access. Revoked admins are rejected on their next request.

## Imported tickets

The source is `server_support_tickets` in the app's existing named Firestore database (`firebase-applet-config.json`). Firestore creates the collection when a trusted operator imports its first document. No live documents were created as part of this change. Existing customer contact/refund submissions continue to use email; they do not automatically enter this collection.

Use a trusted Admin SDK importer or Firebase Console to import each ticket with a unique document ID of 1?128 letters, digits, underscores or hyphens. Map external fields to this strict contract; the ID is the document ID, not a data field:

```json
{
  "kind": "refund",
  "status": "open",
  "category": "recharge_failed",
  "subject": "Recharge not completed",
  "message": "Please review the recharge status.",
  "replyEmail": "customer@example.com",
  "createdAt": "2026-11-13T09:00:00.000Z",
  "orderId": "order_example"
}
```

`kind` is `contact` or `refund`; `status` is `open` or `closed`. Categories are `recharge_failed`, `wrong_operator`, `refund`, `account`, `other`. Subject is 1?120 characters; message is 1?2000 characters. `replyEmail` is a valid email address; `createdAt` is a UTC ISO string (not a Firestore Timestamp), matching the app's date representation. `orderId` is optional. Extra fields are rejected. Only trusted imports should set the reply address. Malformed records fail closed rather than silently creating an incomplete ticket queue.

The existing default-deny Firestore rules block direct browser access to this server collection, including direct admin-browser access. The panel reads through its authorized server API; no security-rule changes were needed. Do not add client write rules for imports.

## Summaries, replies and approval

The panel initially loads up to 20 oldest open tickets; a tool query may request up to 50. The result limit is shown, so a loaded subset is not presented as a complete backlog. Summarization returns one validated suggestion per loaded ticket, with high/normal/low priority, a short summary and reason. Priorities are advisory and are not stored. Draft reply generation is per ticket and returns only subject/body fields, never a send action. Contact emails and long numeric identifiers are redacted from bounded ticket excerpts before model input; the reply address is never sent to Gemini. Ticket content remains untrusted data.

An administrator edits the reply, checks **I reviewed and approve this reply**, then clicks **Approve & open email**. Editing resets approval. The server reauthorizes the admin, rechecks that the ticket remains open, validates the edited reply, and uses only the current imported ticket's recipient. This reuses the site's email-app handoff: the admin must press Send in their email app. The app does not claim delivery, close the ticket, execute a refund, change an order, or write draft/approval data.

## Fixed query tools

- `query_recharges(status, start_date, end_date, limit)`: fixed `server_recharges` collection, exact recharge status (`failed`, `pending`, `processing`, `completed`), `testMode == false`, inclusive creation-date range in Asia/Kolkata, maximum 31 calendar days and 100 rows. ISO UTC boundary parameters are computed by server code. Returned fields are only order ID, operator, amount, status and creation date.
- `list_open_tickets(kind, limit)`: fixed `server_support_tickets` collection and open status; kind is `all`, `contact` or `refund`, maximum 50 rows.

For example, **failed recharges yesterday** maps to `query_recharges` with yesterday as both dates in Asia/Kolkata. These queries use order creation time; the project has no separate failure-transition timestamp. Results are bounded rows, not aggregate totals. The model cannot select collection names, fields, operators, raw SQL, scripts, query text, writes or destructive actions. Unknown tools, multiple calls, additional arguments, invalid dates and oversized ranges are rejected before database execution. Clarification responses are text only and are never executed.

## Runtime configuration and verification

Uses the existing server-only `GEMINI_FREE_API_KEY`, billing verification and shared generation allowance, plus per-admin request throttling. AI setup/provider failures are reported without sending a reply; ticket reading remains available without a Gemini call. Business data is read-only; existing AI usage/rate-limit counters still update. No payment code or existing receipt-delivery code was changed.

Unit/API tests cover authorization and revocation, fixed predicates/limits, timezone boundaries, rejected raw queries and model tool calls, redaction, invented ticket IDs, approval requirements and recipient tampering. No live Firestore deployment, import or real email sending is performed by these tests.

## Overall pending backlog

The **Overall pending recharges** button and pending queries without a historical date range read all paid unfinished recharges (live and test) through the end of today in Asia/Kolkata. This includes both `pending` and `processing`, across all prior dates, with no start-date or 31-day restriction. Completed, failed and unpaid orders are excluded. Test orders are included and labeled TEST - No real recharge. The query reuses the payment-backed Pending Orders reader, including captured payments with no saved fulfillment record, and respects the configured local/Firestore persistence mode. The registered `list_pending_recharges(limit, cursor?)` tool and authenticated `/api/admin/ai/pending` endpoint share this fixed query. Pages scan at most 100 captured payment records, returning their pending fulfillments; **Load more pending recharges** continues through the backlog with a validated cursor. This is a paginated live list, not an aggregate count or frozen snapshot. Explicit historical queries retain their date filters.

The panel announces loading/searching/drafting, completion and errors. Requests time out after 45 seconds with an explicit retry message. It states that orders/tickets were not changed so a completed query cannot be mistaken for completed recharges.

## Total recharge queries

`get_recharge_totals()` is a separate strict, read-only tool using the existing payment-backed admin-report source. **Total recharges** maps directly to it instead of a pending-only list. It counts all recorded recharge statuses through today and returns separate live/test totals and completed/pending/failed/other breakdowns. Processing is counted with pending. Test orders are not presented as real recharges, and total orders are not presented as successful recharges.

`get_revenue_totals()` answers overall revenue/collection requests with monetary totals from the payment ledger, separately for live and test mode. It includes only captured, paid INR payments through today, excludes refunded/failed/pending payments, and sums integer paise. This represents recorded collections, not accounting profit. Test amounts are explicitly not real revenue.
