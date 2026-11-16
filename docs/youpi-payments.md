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

Signed webhooks trigger a server-to-server lookup. Under the merchant-selected policy, matching UPI sessions with OBSERVED_SUCCESS enter the paid recharge queue immediately. RECONCILED with settlementState RECONCILED is also accepted. SUCCESS and MANUAL_REVIEW remain pending. The server still validates payment ID, order ID, amount, currency and UPI method. Browser callbacks cannot approve payment. Observer acceptance relies on bank-alert detection rather than proof of settlement; independent bank reconciliation remains advisable. The original outcome is retained in youpiOutcome. Operator recharge fulfillment remains a separate admin action.

Before launch, test a controlled payment, repeated checkout, delayed notifications, mismatched amounts and statement reconciliation. Confirm observed payments enter the queue and mismatched or unobserved payments remain blocked.

This adapter covers DTH recharge checkout. Complaint-assistance checkout remains on Razorpay. YouPI refunds require separate bank handling; automatic refunds and payment receipt emails are not implemented for YouPI. Razorpay sync applies only to Razorpay records.

To switch back, configure approved Razorpay keys and set PAYMENT_MODE=production. Keep YouPI and its secrets available until pending attempts resolve; its status and webhook routes remain available after the switch. PAYMENT_MODE=sandbox retains the simulator.
