# Subscriber validation: QA-01 and QA-17

QA-01: Recharge validates before invoking checkout, reports errors beside the ID in English and Tamil, and focuses the field. Checkout submission independently validates, and App guards checkout opening. No payment was triggered during verification.

QA-17: One shared module supplies validation, labels, placeholders and help text for Recharge, Add/Edit Box, Browse Plans, saved-box selection, checkout and Express request validation. Spaces/dashes are normalized, UI filtering remains digits-only, and server requests containing letters or other symbols are rejected. Existing invalid boxes remain visible with “Please update this ID”; Edit preserves the record ID and metadata.

## Rules and evidence

No operator documentation files were found in the repository. Existing contracts were read in server/models/store.ts, src/types.ts and ApplyPlanModal.tsx. Sun Direct's conflicting 11–12 rule was replaced by the 11-digit server contract and explicit QA requirement.

| Operator | Implemented rule | Evidence / unresolved details |
| --- | --- | --- |
| Sun Direct | 11 digits | Existing server pattern and QA requirement. Prefix 4/7 appears only in hints and is unconfirmed, so it is not enforced. Independent operator confirmation of length is still outstanding. |
| Tata Play | 10 digits | [Official subscriber ID instructions](https://www.tataplay.com/dth/help/videos/how-to-find-your-subscriber-id). Prefix 1 is unconfirmed and not enforced. |
| Airtel DTH | 10 digits | [Official recharge instructions](https://www.airtel.in/digital-tv/faqs/recharge-modes). Prefix 3 is unconfirmed and not enforced. |
| Dish TV | 11 digits, 015/025 prefix | [Official troubleshooting](https://www.dishtv.in/get-help/quick-help/do-it-yourself.html) confirms length. Prefixes preserve existing Dish/D2H routing in src/types.ts; their completeness is not independently confirmed. |
| D2H | 8–11 digits | Preserves existing server pattern; independent operator confirmation is outstanding. No prefix restriction invented. |

The existing combined Dish TV/D2H selector still resolves 015/025 to Dish TV and other IDs to D2H. This ambiguity is preserved rather than inventing a new routing rule. A wrong prefix is rejected for explicit Dish TV API requests; other prefixes in the combined selector can identify D2H.

## Incompatible records

Read-only inspection of data/customers.json (7 records) and data/recharge_orders.json (8 records) found no incompatible IDs. Source demo saved IDs also meet the rules. No data files were changed.

The user-reported Sun Direct “Home Hall” box with a 12-digit ID is incompatible and will be flagged at runtime. Its exact record ID/value is not present in the repository. Browser local storage and live Firestore saved boxes were not accessed, so this is not a complete production inventory. No production data was modified or deleted.

## Files changed

- src/lib/subscriberValidation.ts: shared rules, help, normalization and bilingual errors.
- src/components/RechargeFlow.tsx: prefill warnings, validation, focus and shared field guidance.
- src/components/SavedConnections.tsx: Add/Edit validation and incompatible-record warnings.
- src/components/BrowsePlans/ApplyPlanModal.tsx: replace independent validation and flag invalid saved boxes.
- src/components/PaymentModal.tsx: checkout validation and guidance.
- src/App.tsx: guard checkout and preserve stable IDs when editing saved boxes.
- server/middleware/validation.ts: shared operator validation for recharge, subscriber lookup and customer creation.
- server/routes/orders.ts: validate subscriber lookup requests.
- server/controllers/ordersController.ts: reject incompatible order sync payloads before mutation.
- server/models/store.ts: operator metadata derives from shared rules.
- tests/subscriberValidation.test.ts: valid, short, long, empty, prefix, formatting, bilingual errors, combined selection and mocked HTTP rejection.
- SUBSCRIBER_VALIDATION_REPORT.md: this report.

## Verification

- Lint (`npm run lint`) and explicit type check (`npx tsc --noEmit`) pass.
- Production build passes, with large bundle and existing CommonJS/import.meta warnings.
- All 17 new validation tests pass.
- Full suite: 87 passed, 3 failed. Failures are in unchanged calculateSavings.test.ts at lines 97, 128 and 142 (oneMonthRate returns 0 instead of 300/200/200). Savings code was left outside this correction.
- Existing Firestore tests skip live assertions when the local emulator is unavailable; no emulator or production database was started.
- No browser interaction/focus automation was run. Focus behavior was implemented and checked in source; regression tests exercise the shared validator and mocked Express boundary.

Server enforcement is through Express API validation. Firestore rules were not changed or deployed. Direct saved-box writes can still contain legacy invalid IDs; those records are flagged by the UI and cannot pass the recharge API validator.
