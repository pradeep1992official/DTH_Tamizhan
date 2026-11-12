# Copy update and Tamil localization — QA-11 / QA-12

**Tamil status: draft; native-speaker review required.** New Tamil messages have review comments in `src/lib/customerMessages.ts`; the Tamil section in `src/lib/translations.ts` and all Tamil business/policy content in `src/lib/policyTranslations.ts` are also marked for review. Policy translations need legal review as well. No business contact, GST number or operational timeframe was invented.

## Complete string ledger

- [Every changed source/string line, with file and before/current line numbers](COPY_STRING_CHANGES.md).
- [Machine-readable before/current text and line numbers](COPY_STRING_CHANGES.json).

The ledger uses the source snapshot taken at the start of this correction, rather than earlier conversation versions. Some requested original phrases, including the ranking and zero-hidden-fees claims, had already been removed in previous tasks. Their current replacements were updated to the newly requested wording. Imports and control-flow context are included so multiline strings and moved translation entries are not accidentally omitted.

## Requested copy

| Location | Applied English copy |
| --- | --- |
| Header tagline | DTH recharge and support for Tamil Nadu. |
| Hero description | Choose your DTH operator, enter your customer ID, and check the total before paying. |
| Hero/checkout guidance | Track your recharge status after payment. |
| Payment review guidance | Review your payment details before continuing. |
| Custom top-up title | Recharge with your own amount |
| Custom top-up description | Enter a recharge amount of Rs. 10 or more. |
| Empty search | No matching packs. Try another search or clear your filters. |
| Loading | Loading available recharge packs… |
| Receipt contact copy | Mobile number for your recharge receipt |
| Footer | Helping Tamil Nadu households keep their favourite channels on. |

The requested currency convention takes precedence over the rupee symbol in the example top-up sentence. The existing minimum remains Rs. 10. The receipt-contact translation keys are updated, but the present mock checkout does not have a receipt-phone collection/delivery workflow; no SMS functionality or guarantee was added.

## QA-11: localization and consistent terminology

- Centralized 225 additional English/Tamil customer message pairs in `src/lib/customerMessages.ts`, merged into the existing `translations` object. Updated recharge, pack cards, browsing, comparison, checkout, account, saved boxes, authentication, installation requests, error pages, header/footer, support/policy links and accessibility descriptions to consume translations.
- `PackCard` now receives the language. Recommended HD/SD, Flexible top-up and Selected no longer remain English in Tamil mode. Log out uses the translated action. Loading, ready, failed, pending, success, timeout/expired and provider-unavailable checkout feedback is translated; status enum values and server authorization contracts remain unchanged.
- Shared subscriber-label/help/placeholder functions choose the operator-specific term consistently across recharge, Add/Edit Box, pack application, checkout and receipts: Sun Direct Smart Card Number; Tata Play Subscriber ID; Airtel/D2H Customer ID; Dish TV Viewing Card. Dish TV/D2H's combined entry retains both terms where necessary. The validation rules were not changed.
- Receipt GST/business placeholders, payment methods and recorded statuses now follow the language setting. Added full Tamil policy drafts and language-specific server 404/500 recovery content. Legal `[FILL IN]` markers remain clearly visible on the relevant pages and checkout support section; they were not restored to the footer.
- Proper operator/channel/pack names and user-entered data are not automatically rewritten. Latin acronyms such as DTH, HD, SD, UPI, GSTIN and the requested Rs. notation remain where appropriate. Catalog names without an owner-supplied Tamil name may still appear in English; these are data values, not untranslated interface actions.

## QA-12: corrupted text and encoding

- Found literal `???? ??????` in the recharge pack-view group's Tamil accessible name, plus a question-mark-only All filter label. Replaced both at their source with shared translated messages. The group now announces “பேக்குகளைக் காணும் முறை”.
- Checked source as strict UTF-8. The application template already declared UTF-8; server-generated standalone error HTML now also declares it. Existing route/language effects set `html.lang` to `ta`, and server responses use the saved language cookie. HTTP tests cover Tamil 404/500 content and charset; existing metadata tests cover runtime language updates.
- Added `scripts/check-localization.ts` and `npm run check:i18n`. It fails for missing English/Tamil keys, blank Tamil values, damaged question-mark runs/replacement characters/mojibake, mismatched interpolation tokens, missing policy sections/paragraphs and invalid UTF-8. It also scans TSX string literals for damaged text. Fixed an existing missing `{brand}` token in Tamil.

## Currency, duration and factual copy

- Shared currency output uses `Rs.` in both languages. Updated customer amounts, quote totals, saved balances, receipt sharing, filters and translation labels. Spreadsheet display/export labels also use Rs.; import supports the new header and Rs. values while retaining compatibility with older rupee/INR inputs. ISO currency identifiers and parser patterns are not customer-facing copy and were intentionally preserved where needed.
- Structured duration displays use `1 month`, `6 months`, `12 months`, etc., with corresponding Tamil words. Recharge summaries, browsing/comparison and checkout use shared helpers. Older stored `6M`/month values are formatted on read; stored production records and identifiers were not rewritten. Corrected the server quote's `1 months` wording.
- Removed the named-person placeholder and hardcoded root display-name fallback. Removed clickable sample subscriber-ID filling and the default Home Hall/Living Room name assumptions from customer forms. Placeholders now instruct users to enter their own details.
- No public lorem ipsum, fake testimonials or fabricated customer counters were found. Real catalog/result counts remain. Development-only fixture catalogs remain isolated behind their existing explicit development guard and confirmation; they were not seeded or imported during this work.
- Removed the AI service's fabricated fallback pack recommendation. When unavailable it returns a clear unavailable response; when configured, the prompt is grounded in valid catalog records and prohibits invented pricing, statistics, testimonials and activation/security claims. No live model request was run.
- No SMS/email delivery implementation or customer email templates were found in these flows. Removed the SMS promise from receipt copy. WhatsApp sharing formats the recorded details only when the user chooses that existing action; it was not invoked during verification.

## 360px layout verification

Used the computer-use skill with the existing local Chrome session. Inspected Tamil browsing and recharge at a 360px emulated width, with an adjacent 359px check while adjusting the controls. Confirmed native glyphs, the corrected accessible group name, selected-state wording, header/account navigation and custom-card wrapping. DOM inspection showed `lang="ta"`.

Found a narrow price column squeezed by a long Tamil pack button. Added small-screen stacking for that card footer and reobserved the price on one line. Shortened Tamil navigation labels, increased Tamil line height, removed tight letter spacing, allowed labels/buttons to wrap, and isolated numeric spans. Existing colors and overall design were retained. Closed DevTools after verification.

This was a browser spot-check, not an exhaustive screenshot audit of every pack, all browser engines or all checkout states at 360px. Payment states, GST, operator labels, policies and accessibility copy also have rendered regression tests. No real customer ID or payment was submitted in the browser.

## Changed files and verification

The complete source-file list and exact line changes are in the ledger. Main groups:

- Copy/formatting: `src/lib/translations.ts`, `customerMessages.ts`, `policyTranslations.ts`, `catalog.ts`, `subscriberValidation.ts`, `topUpAmount.ts`, `catalogAvailability.ts`, `trustContent.ts`, `excelPlanService.ts` and display/audit text in `planCatalogService.ts`.
- Customer components: `src/App.tsx`, header, recharge, `PackCard`, brand-image accessibility descriptions, Browse Plans/application/comparison components, checkout, receipt, account/saved boxes, authentication/installation modals, support/policy/error/security pages, and `src/workspace.css`.
- Server copy: `server/pages.ts`, `server/payments.ts`, `server/controllers/aiController.ts`.
- Checks: `scripts/check-localization.ts`, `package.json`, new `tests/copyLocalization.test.tsx`, `tests/paymentLocalizationStates.test.tsx`, `tests/aiCopyFallback.test.ts`, and updated catalog/payment/policy/HTTP copy assertions.

Validation:

- Lint: passed.
- Explicit TypeScript check: passed.
- `npm run check:i18n`: passed.
- `git diff --check`: passed.
- Production build: passed; existing large-client-bundle and CommonJS/import.meta warnings remain.
- Full suite with `npm test -- --maxWorkers=4`: **316 passed, 3 failed** across 34 files. The same pre-existing `tests/calculateSavings.test.ts` failures remain at lines 97, 128 and 142 (`oneMonthRate` zero instead of 300/200/200). No new test failure remains. An earlier unconstrained run also timed out a seed-guard subprocess under contention; the bounded rerun passed that guard.
- Added 34 test cases, including English copy expectations, Tamil rendered controls/GST/payment states, missing-key/damaged-string detection, duration/currency formatting, translated image descriptions, unconfigured AI behavior and Tamil error HTTP responses.

No production catalog, account, permission record, order or payment was modified. No real payment, message, seed script, model request or deployment was performed. Local data files were not edited. Restart `npm run dev` to load server-copy changes, then refresh the site. Native Tamil and policy/legal review remain outstanding; no activation, security certification or SMS-delivery assurance has been inferred.
