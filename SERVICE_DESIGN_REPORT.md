# Customer service design review

**Support/checkout follow-up:** Removed the front-page business/support block from `src/components/RechargeHelp.tsx`. Removed business/support details, policy links and the agreement text from checkout via `src/components/PaymentModal.tsx` and `src/components/TrustContent.tsx`. Updated `tests/serviceDesign.test.tsx`, `tests/trustContent.test.tsx` and `tests/paymentLocalizationStates.test.tsx`. Policy pages and footer links remain available. Screenshots below predate these removals.

**Follow-up:** At the user's request, reverted only the operator-neutral hero SVG to the previous operator-specific artwork in `src/components/BrandAssets.tsx`. Removed its unused CSS rule from `src/service.css` and updated `tests/serviceDesign.test.tsx` and `tests/copyLocalization.test.tsx`. The rest of the redesign remains. Lint, explicit type-check, localization check and build pass; tests remain 323 passed and the same 3 known savings failures. Screenshots below document the earlier neutral-SVG version.

Implemented locally on 12 November 2026. No deployment, real payment, seed operation or production-data change was performed.

## Results by requested task

| Task | Result |
| --- | --- |
| 1. Palette | Shared tokens now define burgundy `#64182F`, warm ivory `#FFF9F0`, charcoal `#292323` and ochre `#B77916`. Payment actions stay burgundy for every operator. Provider logos and operator identifiers retain operator colours. Removed the blue, purple, teal and orange quality/duration chip system from customer filters and catalog entries. |
| 2. Typography | Manrope for English, Noto Sans Tamil for Tamil. Larger task headings, tabular amounts, quieter secondary details, Tamil line height and normal letter spacing. Both languages checked at 360, 768 and 1440px. |
| 3. Hero | Original inline SVG remote/set-top-box composition replaces operator-specific imagery on the recharge hero. It is identical across operator selections, has a localized accessible name and uses the brand palette. Mobile omits the illustration and uses a compact heading. |
| 4. Layout | Operator choices sit on an open, divided section. A larger ID input on a single strong surface leads the task; packs follow below. A concise total pins only once pack choices enter view, keeping the ID input unobstructed. |
| 5. Catalog | At 768px and above, articles become aligned comparison rows. At 1200px and above, duration gets its own column. Pack, operator, total and monthly equivalent remain easy to scan. Mobile keeps cards. One-month entries also show their monthly equivalent. |
| 6. Trust | Removed hero shield/lightning badges and redundant pack-title icons. Checkout presents the actual configured provider/simulator, server session reference, quoted total and explanation of what follows payment. Removed the decorative mock QR icon entirely. No working production-provider claim was added. |
| 7. Local guide | Language switch beside ID entry; expandable localized guide and a clearly marked `[FILL IN]` slot for a real annotated photograph. The schematic is explicitly not an operator-specific photo/instruction. Tamil copy is a draft for native review. |
| 8. Support | Added a business/support block under the task using the same policy-page business-name, phone, email and support-hours placeholders. The block explicitly says these are not working contact channels. Footer stays compact without those details. |
| 9. Interactions | Operator selection has `aria-pressed` and a polite live announcement. The total animates when its value changes while keeping the live region stable. Invalid-ID focus and checkout blocking are preserved and browser-tested. Visible focus and hover states; reduced motion disables animation. Corrected dialog stacking so the sticky header cannot block the close control. |
| 10. Empty/error states | Retained clear no-results, operator-without-catalog, failed/pending payment and expired-session messages. Added connection-specific network-error guidance in both languages. Expiry still offers a new session/QR action. Browser-tested failure, pending, success, expiry, network failure and unavailable production-provider states using intercepted fixtures. |
| 11. Promotional decoration | Removed decorative hero assurances and pack-title icons. Customer-source search found no occurrences of “seamless”, “empower”, “revolutionize” or “unlock”. Existing factual task copy remains. |
| 12. Review/screenshots | Subjective AI-look score: **8/10 before → 4/10 after**, where 10 means most generic/template-like. See the gallery below. |

The remaining 4/10 reflects familiar form controls, a three-choice recommended-pack layout on mobile, the simple schematic illustration, and conspicuous business/photo placeholders. The lower score comes from a restrained brand palette, varied section structures, a task-led ID field, comparison rows and fewer decorative icons. This is a visual judgement, not a measured quality score or claim of production readiness.

## Screenshots

[Open the before/after gallery](artifacts/design-review/index.html).

The before previews are top crops of the original full-page captures. After images are actual browser viewport captures, 900px high at 360px width and 1000px high at 768/1440px width. The gallery links to the original before captures. Local catalog records and their existing audit warnings were left intact.

| Width | Recharge before | Recharge after | Plans before | Plans after |
| --- | --- | --- | --- | --- |
| 360px | [Before](artifacts/design-review/before-recharge-360-viewport.png) | [After](artifacts/design-review/after-recharge-360-viewport.png) | [Before](artifacts/design-review/before-plans-360-viewport.png) | [After](artifacts/design-review/after-plans-360-viewport.png) |
| 768px | [Before](artifacts/design-review/before-recharge-768-viewport.png) | [After](artifacts/design-review/after-recharge-768-viewport.png) | [Before](artifacts/design-review/before-plans-768-viewport.png) | [After](artifacts/design-review/after-plans-768-viewport.png) |
| 1440px | [Before](artifacts/design-review/before-recharge-1440-viewport.png) | [After](artifacts/design-review/after-recharge-1440-viewport.png) | [Before](artifacts/design-review/before-plans-1440-viewport.png) | [After](artifacts/design-review/after-plans-1440-viewport.png) |

Additional captures: [Tamil recharge 360px](artifacts/design-review/after-recharge-360-ta-viewport.png), [Tamil plans 360px](artifacts/design-review/after-plans-360-ta-viewport.png), [Tamil ID guide](artifacts/design-review/guide-360-ta.png), [checkout 360px](artifacts/design-review/checkout-360.png), [checkout 768px](artifacts/design-review/checkout-768.png), [checkout 1440px](artifacts/design-review/checkout-1440.png), [invalid-ID feedback](artifacts/design-review/invalid-id-360.png).

## Files changed

| Files | Purpose |
| --- | --- |
| `src/tokens.css`, `index.html` | Brand colour tokens, Manrope font loading, theme colour. |
| `src/service.css`, `src/index.css` | Customer visual system, responsive row/card layouts, Tamil spacing, sticky total, modal layering, focus and motion. |
| `src/colorful.css` | Remove competing customer chip colours and quality-colour treatments. Existing admin state colours remain semantic status indicators. |
| `src/lib/theme.ts` | Shared brand action colour rather than colouring checkout by the selected operator. |
| `src/components/BrandAssets.tsx` | Original operator-neutral inline hero SVG. Existing standalone operator asset components remain available elsewhere. |
| `src/components/RechargeFlow.tsx`, `src/App.tsx` | Prominent ID entry, task language switch, operator announcements, conditional sticky total, localized pack summary, guide/support integration. |
| `src/components/RechargeHelp.tsx` | Localized guide, marked real-photo slot and policy-backed support identity block. |
| `src/components/BrowsePlans/PlanCard.tsx`, `src/components/BrowsePlans/BrowsePlansView.tsx` | Comparison-friendly article structure, dedicated duration cell, monthly equivalent for all durations, remove decorative heading icon. |
| `src/components/PackCard.tsx` | Remove ornamental pack-title icons while retaining meaningful selection indicators. |
| `src/components/PaymentModal.tsx` | Checkout layout hooks and removal of the nonfunctional QR decoration. Existing payment safety behaviour preserved. |
| `src/lib/customerMessages.ts`, `src/lib/translations.ts` | Guide, task language, operator announcement, support, illustration and network-error copy; compact Tamil hero; truthful UPI test-session wording. New Tamil strings carry native-review comments. |
| `tests/serviceDesign.test.tsx` | Seven tests for neutral illustration, shared brand actions, honest support/photo placeholders, monthly display and network-error localization. |
| `tests/copyLocalization.test.tsx`, `tests/paymentInstrument.test.tsx` | Update assertions for named inline SVG and text-only UPI simulator. |
| `artifacts/design-review/` | Before/after captures, gallery, verification scripts and JSON results. |

## Verification

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run check:i18n`: passed (key/token parity, damaged-string and UTF-8 checks).
- `npm run build`: passed. Existing large-bundle and server CommonJS/`import.meta` warnings remain.
- `npm test -- --maxWorkers=4`: **323 passed, 3 failed, 326 total across 35 files**. All seven new tests pass. The three previously known failures are unchanged `oneMonthRate` expectations in `tests/calculateSavings.test.ts` at lines 97, 128 and 142; expected 300/200/200, actual 0. They are outside this visual task.
- Browser: 12 route/width/language combinations (`/recharge` and `/plans`, English/Tamil, 360/768/1440px) all had document width equal to viewport width. ID entry was not covered by the pinned total. Verified invalid-ID focus with no checkout opening, live operator announcement, visible input focus, task-language keyboard order and reduced motion on the animated amount. [Results](artifacts/design-review/layout-checks.json).
- Browser checkout: failed, pending, success, expired, network-error and unconfigured production-provider states passed; close/Escape worked. [Results](artifacts/design-review/checkout-checks.json). Every payment/config/session response in these tests was intercepted in the browser; no real or server-side payment session was created and no payment submission occurred.

Browser scripts use a temporary Playwright install under ignored `.local-fixtures/visual-tools`, with installed Chrome: `npm install --prefix .local-fixtures/visual-tools --no-audit --no-fund playwright`, then `node artifacts/design-review/verify.mjs`, `node artifacts/design-review/verify-checkout.mjs` and `node artifacts/design-review/verify-keyboard.mjs`. They expect the existing local development server on port 3000. They do not need production credentials.

## Still requiring your input

1. Supply the actual legal/business identity and support contacts/hours; all relevant `[FILL IN]` markers intentionally remain. No details were invented.
2. Supply a real, approved annotated photo of the connection/smart-card label. The current slot is clearly marked and does not pretend to show a real operator device.
3. Have a native Tamil speaker review the new/shortened Tamil copy. Policy placeholders and legal content still need the earlier business/legal review.
4. A real payment provider is still not configured. Production remains blocked safely. The polished checkout does not turn the sandbox simulator into a production payment integration.
5. Existing incompatible catalog records/audit warnings and the three savings-test failures were not changed by this visual work.
