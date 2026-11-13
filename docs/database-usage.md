# Database usage

The application uses the existing named Firestore Enterprise Native database. Queries use server-side pipelines for filtering, grouping and pagination. No new database or billing plan is required by these code changes.

## Receipt delivery

- Captured payment and completed recharge events create deterministic receipt jobs immediately. Existing accepted jobs are not overwritten on verification retries.
- A `receiptPending` marker is stored alongside the financial event. A failed enqueue leaves that marker for the recovery worker; the payment/recharge is not rolled back by an email failure.
- The worker checks at most five due pending/sending jobs before acquiring a lease. An empty outbox causes no lease writes. Active retries use timers; the recovery fallback runs every 15 minutes instead of scanning all financial records every 30 seconds.
- Processing reads only each job's payment and one compact rolling-allowance document. The allowance is bootstrapped once from recent jobs and updated under the shared lease. Receipt attachments remain separate from job metadata. Provider idempotency keys remain in place.
- Manual retry selects at most 25 failed jobs. Existing review/accepted jobs are never automatically requeued. The status panel uses grouped counts.
- Older captured records created before `receiptPending` existed are not automatically backfilled. Already queued receipts continue to process. A deliberate historical backfill should be reviewed separately to avoid emailing old customers unexpectedly.

## Shared reads and conversations

- Catalog reads are cached for 60 seconds; operator settings for 30 seconds. Concurrent requests share one load. Failed reads are not cached. Successful administrative writes immediately invalidate that process's cache. Other server instances expire their entries within the TTL.
- Payment creation bypasses both caches, checks current operator availability, and reads only the selected plan. Custom top-ups do not read the catalog. Prices and pack/operator validation remain server-authoritative.
- Assistant saved-box lists are cached by verified customer UID for 60 seconds, bounded to 200 customers. Confirmed box IDs remain in the UI conversation, and parsed preferences are retained in a bounded, 15-minute server memory cache. Explicit short follow-ups do not require another Gemini quota-counter write.
- Cache entries are never used to bypass token verification. An account switch unmounts the customer's chat. Newly edited saved boxes may take up to 60 seconds to appear in the assistant.

## Lists

- Customer history queries only the authenticated UID's payments, then reads the corresponding recharge records by document key. Receipt download uses owner-checked payment keys, not a global ledger scan.
- Customer history and admin customer/payment/order lists load 25 records at a time, with an explicit Load more action. Cursors use the timestamp and a stable ID to handle equal timestamps. API page size is capped at 100; client-provided account flags cannot broaden personal-history queries.
- The admin customer directory groups captured paid records in the database before pagination, preserving per-connection spend/recharge totals. Customer detail queries are restricted to that operator/subscriber/test-mode identity. Admin report totals continue to use all qualifying records so pagination cannot silently shrink totals.
- Filters and search in the current UI apply to loaded records. Load more to include older records. Counts on paginated lists describe the loaded page, not an all-time total.

## Deployment

`firestore.indexes.json` contains Enterprise dense indexes for these query paths, and `firebase.json` targets the existing named database. Deploy the indexes and wait until they are ready before evaluating scan/read-unit reductions:

```powershell
npx firebase-tools@latest deploy --only firestore:indexes --project gen-lang-client-0168639596
```

The changes and index definitions are prepared locally; no indexes have been deployed. Enterprise queries can execute without indexes but may scan far more data, so filtering alone does not guarantee low billed read units. Existing database-wide quota exhaustion is not fixed by deploying code: it must reset or be resolved separately. Index creation uses database resources and should be monitored.

After deployment, compare idle reads/writes, one chat conversation, one history page, and one verified payment in the usage dashboard. Production usage reductions have not yet been measured.
