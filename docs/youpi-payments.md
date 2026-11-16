# Temporary YouPI payments

Upstream reference: https://github.com/youpi-pg/YouPI-PG at commit 405327c27d78ae9d0dccdb1e2d2426cefc359477.

Deploy YouPI separately using its deployment instructions. It describes itself as experimental. Configure its receiving UPI account, observers and official bank-statement reconciliation before enabling payments.

Set server-only environment variables:

- PAYMENT_MODE=youpi
- YOUPI_API_URL: HTTPS API origin
- YOUPI_CHECKOUT_URL: HTTPS public checkout origin
- YOUPI_MERCHANT_ID: configured merchant ID
- YOUPI_MERCHANT_API_KEY: merchant API key
- YOUPI_WEBHOOK_SECRET: separate webhook signing secret
- APP_URL: storefront return URL

Configure the merchant webhook URL as https://YOUR_STOREFRONT/api/payments/youpi/webhook. On YouPI, allow the exact storefront origin in YOUPI_ALLOWED_RETURN_ORIGINS and YOUPI_ALLOWED_ORIGINS. Its public checkout URL must match YOUPI_CHECKOUT_URL. Never expose merchant credentials in VITE variables or use demo merchants.

The server calculates catalog prices and persists owner-bound checkout attempts in the existing payments ledger. Browser session retries reuse the order ID. After paying, return to the checkout and check status. Do not start another payment while a debit is unconfirmed.

Signed webhooks trigger a server-to-server lookup. Only matching UPI sessions with status RECONCILED and settlementState RECONCILED enter the paid recharge queue. SUCCESS, OBSERVED_SUCCESS and MANUAL_REVIEW remain pending. Import the official bank statement in YouPI to reconcile; SMS/email alerts and browser callbacks cannot approve payment. Operator recharge fulfillment remains a separate admin action.

Before launch, test a controlled payment, repeated checkout, delayed notifications, mismatched amounts and statement reconciliation. Confirm fulfillment stays blocked before reconciliation.

This adapter covers DTH recharge checkout. Complaint-assistance checkout remains on Razorpay. YouPI refunds require separate bank handling; automatic refunds and payment receipt emails are not implemented for YouPI. Razorpay sync applies only to Razorpay records.

To switch back, configure approved Razorpay keys and set PAYMENT_MODE=production. Keep YouPI and its secrets available until pending attempts resolve; its status and webhook routes remain available after the switch. PAYMENT_MODE=sandbox retains the simulator.
