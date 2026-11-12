# Trust and legal content — QA-07

## Implemented

Added four public React Router routes with distinct headings and document titles:

- `/contact` — Contact / Support.
- `/refund-policy` — Refund & Cancellation Policy.
- `/privacy-policy` — Privacy Policy.
- `/terms` — Terms of Use.

The pages are plain-language English drafts for this DTH recharge service. Headings, navigation and support labels follow the app language. Footer destinations display both English and Tamil together. The body text is explicitly marked as English, rather than presented as a Tamil translation.

All four destinations are visible in the header, footer and checkout. Checkout includes “By paying you agree to the Terms of Use and Refund & Cancellation Policy” and a privacy link. Opening a checkout policy link closes the modal and navigates to the real page. The links and support block are also visible while production payment is unavailable.

Footer, checkout and contact page share `BUSINESS_DETAILS` in `src/lib/trustContent.ts`. Unknown values are visibly marked `[FILL IN]`; no phone, address, business identity or timeframe was invented. Placeholder phone/email values are plain text, not broken `tel:` or `mailto:` destinations. The contact draft explicitly explains that unfilled contact details are not working channels.

## Details the owner must supply

Complete the shared values in `src/lib/trustContent.ts`:

- Registered business name and registered/correspondence address.
- Support phone, email and support days/hours/time zone.
- GSTIN, or confirmed non-applicability.
- Grievance officer name/designation, email and correspondence address.
- Support/grievance acknowledgement and resolution targets.
- Pending-payment reconciliation and refund-review timeframes.
- Approved-refund initiation and expected bank/provider credit timeframes.
- Actual fees, taxes and invoice treatment.
- Policy effective date, data-retention periods and processor/hosting details.
- Installation availability and quotation details if installation requests remain offered.

The refund draft distinguishes cancellation, a completed recharge, failed/debited transactions, duplicate payments, pending status and approved refunds. It preserves applicable statutory remedies rather than imposing a blanket no-refund rule. No operational timeline is represented as final.

The privacy draft describes the existing account/saved-box data, browser storage, Google/Firebase authentication and Google-hosted fonts. Provider/retention details remain unresolved. The terms explain that sandbox results are simulations and live payments are currently unavailable; a redirect or debit alone does not establish recharge success.

Reference material reviewed for consumer disclosures, grievance contact and refund information: [Department of Consumer Affairs — Consumer Protection (E-Commerce) Rules](https://consumeraffairs.nic.in/sites/default/files/E%20commerce%20rules_0.pdf), [official consumer-protection publication index](https://consumeraffairs.gov.in/pages/consumer-protection-acts). Privacy framework reference: [MeitY — Digital Personal Data Protection Rules, 2025 publication hub](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025). These are drafting references, not a claim that the incomplete policies certify legal compliance. The completed business policies still require owner/legal review against actual operations and applicable law.

## Unsupported claims removed

- “#1”, instant activation/recharge, generic encryption and 256-bit transaction guarantees.
- Unverified authorized-service/technician affiliation and 24x7 support claims.
- Unverified operator leadership/zero-buffer marketing descriptions.
- “Includes 18% GST / Zero Service Fee” and the receipt's inferred 18% GST split.
- The unsupported official tax-invoice label and unconditional receipt-success wording; receipts now show recorded statuses and unresolved invoice details.
- Fixed installation prices, bundled free benefits, next-day/wide-area availability and guaranteed hardware/cabling claims; these now require a quotation/confirmation.
- A hardcoded post-payment ₹150 balance; a previously recorded balance is preserved instead of inventing a new one.

Source review found no customer testimonial/review sections or fabricated social-proof counters. Counters derived from actual catalog/administrative records were retained. Operator trademarks are described without implying endorsement or partnership. No existing customer/order/catalog data was edited to change these claims.

## Files changed for this task

- `src/lib/trustContent.ts`: shared business placeholders, route metadata and all draft policy content.
- `src/components/PolicyPage.tsx`: public policy page layout and route-specific document titles.
- `src/components/TrustContent.tsx`: reusable policy links, support details and checkout agreement block.
- `src/App.tsx`: real routes, bilingual footer links/support and removal of invented post-payment balance.
- `src/components/Header.tsx`: visible policy/support navigation.
- `src/components/PaymentModal.tsx`: checkout policy/support block and close-on-navigation behavior.
- `src/lib/translations.ts`, `src/lib/theme.ts`, `index.html`: remove unsupported marketing/security/authorization claims in copy and metadata.
- `src/components/RechargeFlow.tsx`: factual labels and unresolved tax/fee disclosure.
- `src/components/NewConnectionModal.tsx`: quotation/availability placeholders instead of fixed promotional offers.
- `src/components/ReceiptModal.tsx`: recorded status, unresolved GST information and removal of invented tax split.
- `tests/trustContent.test.tsx`: public route, heading/title, bilingual destinations, placeholder, checkout and receipt regressions.
- `TRUST_LEGAL_REPORT.md`: this report. Earlier correction-task changes remain in the working tree.

## Verification

- Lint, explicit type-check, build and whitespace checks pass.
- All 12 new tests pass. Full suite: 166 passed, 3 failed.
- The same pre-existing savings-baseline tests fail at `calculateSavings.test.ts:97`, `:128`, `:142`; this correction leaves savings calculation unchanged.
- Build retains the existing large-bundle and CommonJS/import.meta warnings. Existing Firestore tests skip live assertions without a local emulator.
- Route/link/placeholder verification used server-rendered React tests. No interactive browser/layout or deployed-site verification was performed.
- No real payment, production-data change, deployment or external support message was made.

The pages and support information remain visibly draft/incomplete until the owner supplies the marked values. No fake contact values were substituted to make them appear operational.
