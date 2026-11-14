# Admin AI panel

Open `/admin/ai` or choose **AI assistant** in the admin console. All `/api/admin/ai/*` routes independently verify a Firebase bearer token and the existing root/approved-admin registry policy, including current registry status and email binding. This project does not currently use an admin custom claim. UI role fields, cached emails and client claims do not grant this API access. Revoked admins are rejected on their next request.

## Imported tickets

The source is `server_support_tickets` in the app's existing named Firestore database (`firebase-applet-config.json`). Firestore creates the collection when a trusted operator imports its first document. No live documents were created as part of this change. Legacy customer contact drafts continue to use email. Assistant refund requests now recheck the signed-in customer's order and open a prefilled free-support form; the customer reviews and submits the ticket. This does not initiate a refund, and those new tickets use the separate `tickets` collection rather than entering this imported collection.

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

## Data questions and fixed tools

Natural-language data questions now use Gemini function calling, not keyword routing. Only these six strict tools are exposed to the data planner:

- `get_total_orders(from, to, status)` counts orders, separating live/test. Status: all, pending, processing, completed, failed. Pending includes processing.
- `get_total_revenue(from, to)` sums completed live recharges with matching captured, paid INR payments. Pending, failed, refunded and test records are excluded.
- `get_failed_recharges(from, to)` returns a computed count and up to 100 rows, with a subset flag.
- `get_top_plans(limit)` ranks successful live plans across all dates through today; limit 1 to 20.
- `get_orders_by_operator(from, to)` computes operator/status and live/test counts.
- `get_pending_refunds()` reads up to 50 open imported refund tickets, explicitly flagging a potentially incomplete backlog. It never executes refunds.

Dates are inclusive YYYY-MM-DD in Asia/Kolkata, based on recorded payment creation time, not completion/failure-transition time. `from: null` means all earlier dates. Future or reversed ranges and extra arguments are rejected. The system prompt includes today's India date; weeks start Monday. Firestore collection names, predicates, sorting and joins are fixed in server code. The existing payment-backed order merger matches the admin queue; local ledger fallback is for configured development storage. Aggregate scans fail instead of returning partial totals above 20,000 payment records. Monetary sums use integer paise. The model never calculates totals or rankings.

Each request sends at most 12 validated user/assistant history turns plus the current question. Gemini selects exactly one tool, the server reauthorizes and audits it, then a second generation receives the actual function response and phrases the already computed result. Unknown/multiple tools are rejected; no suitable tool returns a fixed cannot-answer response. Legacy internal queue/ticket helpers remain for existing direct endpoints and are not exposed to the data planner. There is no cross-question response cache; HTTP remains no-store. Editing the question clears the previous displayed answer.

### Repeated-answer diagnosis (before this change)

- `server/utils/adminAiModel.ts:20`: revenue/collections/income/earnings/sales regex bypassed Gemini and used all-time revenue. It did not honor "this week". Lines 24 and 28 similarly routed totals and pending questions.
- `server/utils/adminAiModel.ts:32`: only the current message was sent, without conversation history. Line 10 serialized the request object, not a fixed database snapshot.
- `src/components/Admin/AdminAiPanel.tsx:78`: changing the question retained the previous result until submission (line 72), displaying stale data under the new question.
- No response cache or fixed snapshot was found: client fetch line 32 and router line 13 already used no-store. The exact phrase "what is total revenue" would have matched the old revenue branch if submitted; repeated network responses for that exact phrase cannot be attributed to order routing without a captured request. The confirmed defects were stale display, keyword routing/date loss, and missing history.

These line numbers refer to the original source before this fix.

### Example: total revenue this week

Illustrative only; no production query was executed. On 2026-11-14:

```http
POST /api/admin/ai/query
Authorization: Bearer <Firebase-admin-ID-token>
Content-Type: application/json

{"message":"total revenue this week","history":[]}
```

Gemini selects `get_total_revenue({"from":"2026-11-09","to":"2026-11-14"})`. Example response when there are no successful live recharges:

```json
{
  "success": true,
  "requestId": "unique-per-request",
  "text": "Revenue from successful live recharges this week is Rs. 0.00.",
  "result": {
    "type": "analytics",
    "tool": "get_total_revenue",
    "parameters": {"from": "2026-11-09", "to": "2026-11-14"},
    "timezone": "Asia/Kolkata",
    "data": {
      "currency": "INR",
      "revenuePaise": 0,
      "revenue": 0,
      "formattedRevenue": "\u20b90.00",
      "successfulRecharges": 0,
      "testExcluded": true,
      "definition": "Completed live recharges with matching captured paid INR payments; excludes pending, failed, refunded and test records."
    }
  }
}
```

## Runtime configuration and verification

Uses the existing server-only `GEMINI_FREE_API_KEY`, billing verification and shared generation allowance, plus per-admin request throttling. AI setup/provider failures are reported without sending a reply; ticket reading remains available without a Gemini call. Business data is read-only; existing AI usage/rate-limit counters still update. No payment code or existing receipt-delivery code was changed.

Unit/API tests cover authorization and revocation, fixed predicates/limits, timezone boundaries, rejected raw queries and model tool calls, redaction, invented ticket IDs, approval requirements and recipient tampering. No live Firestore deployment, import or real email sending is performed by these tests.

## Overall pending backlog

The **Overall pending recharges** button and pending queries without a historical date range read all paid unfinished recharges (live and test) through the end of today in Asia/Kolkata. This includes both `pending` and `processing`, across all prior dates, with no start-date or 31-day restriction. Completed, failed and unpaid orders are excluded. Test orders are included and labeled TEST - No real recharge. The query reuses the payment-backed Pending Orders reader, including captured payments with no saved fulfillment record, and respects the configured local/Firestore persistence mode. The registered `list_pending_recharges(limit, cursor?)` tool and authenticated `/api/admin/ai/pending` endpoint share this fixed query. Pages scan at most 100 captured payment records, returning their pending fulfillments; **Load more pending recharges** continues through the backlog with a validated cursor. This is a paginated live list, not an aggregate count or frozen snapshot. Explicit historical queries retain their date filters.

The panel announces loading/searching/drafting, completion and errors. Requests time out after 45 seconds with an explicit retry message. It states that orders/tickets were not changed so a completed query cannot be mistaken for completed recharges.

## Total recharge queries

`get_recharge_totals()` is a separate strict, read-only tool using the existing payment-backed admin-report source. **Total recharges** maps directly to it instead of a pending-only list. It counts all recorded recharge statuses through today and returns separate live/test totals and completed/pending/failed/other breakdowns. Processing is counted with pending. Test orders are not presented as real recharges, and total orders are not presented as successful recharges.

`get_revenue_totals()` answers overall revenue/collection requests with monetary totals from the payment ledger, separately for live and test mode. It includes only captured, paid INR payments through today, excludes refunded/failed/pending payments, and sums integer paise. This represents recorded collections, not accounting profit. Test amounts are explicitly not real revenue.
