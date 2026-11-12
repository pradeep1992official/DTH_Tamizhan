# Browse Packs row layout

Whole-rupee display follow-up: `src/lib/catalog.ts` now omits trailing `.00` for whole amounts everywhere the shared price formatter is used, including homepage, Browse Packs, comparison and checkout. Actual fractional amounts retain two decimal places, so no paise or stored/payment amount is lost; monthly equivalents such as Rs. 233.17 remain precise. Updated `tests/catalog.test.ts`, `tests/copyLocalization.test.tsx`, `tests/paymentLocalizationStates.test.tsx` and `tests/serviceDesign.test.tsx`; added English/Tamil cases covering whole amounts and real paise. Lint, type-check, localization check and build pass. Tests: **329 passed, the same 3 existing savings failures** (332 total). Browser checks cover homepage/Browse Packs in both languages at 360/1440px for whole pack values, retained fractional monthly rates and no overflow. [Whole-price preview](artifacts/design-review/whole-prices-plans-1440-en.png).

Homepage All Packs follow-up: `src/components/RechargeFlow.tsx` now uses the same `PlanCard` and `CatalogColumnHeadings` as Browse Packs, via the existing catalog-to-display mapping. Extended `src/components/BrowsePlans/PlanCard.tsx` for homepage selected state, optional Compare controls and channel details; shared the catalog styles in `src/service.css`. Preserved operator filtering, quality/duration filters, HD/SD group collapse, recommendations, channel expansion, pack selection and the total. Logos have no visible captions; quality badges remain silver SD/gold HD. Added two English/Tamil selection regression cases in `tests/serviceDesign.test.tsx`.

Verified homepage layouts in English/Tamil at 360/768/1024/1440px, matching desktop columns and quality alignment with no horizontal overflow. Browser checks passed for pack selection/total, filters and group collapse. Channel expansion used a browser-intercepted catalog fixture only; no catalog data was written. No checkout/payment request occurred. Lint, explicit type-check, localization check and build pass. Full tests: **327 passed, the same 3 known savings failures** (330 total). [Homepage desktop](artifacts/design-review/home-all-packs-1440-en.png) · [Homepage mobile](artifacts/design-review/home-all-packs-360-en.png) · [Tamil mobile](artifacts/design-review/home-all-packs-360-ta.png).

Logo-caption removal: `src/components/BrowsePlans/PlanCard.tsx` removes the visible name under each logo and retains the localized operator name as the image group's accessible label. Removed the unused caption rule from `src/service.css`. The existing logo component still displays a text fallback if images fail. Browser checks passed in both languages at 360/768/1024/1440px, including fallback, alignment and no overflow. Lint, type-check, localization check and build pass; 325 tests pass and the same 3 existing savings tests fail. [Current preview](artifacts/design-review/logos-only-1440-en.png).

Quality styling follow-up: `src/tokens.css` and `src/service.css` now render silver SD and gold HD badges, with no resolution numbers. The fixed quality column and operator logos remain. Browser checks passed in English/Tamil at 360/1024/1440px for distinct styling, exact SD/HD labels, alignment and no overflow. Lint, type-check, localization check and build pass; tests remain 325 passed with the same 3 known savings failures. [Silver/gold preview](artifacts/design-review/metallic-quality-1440-en.png).

Logo trial: `src/components/BrowsePlans/PlanCard.tsx` now reuses the existing operator-selector logos, with a smaller localized name below. `src/service.css` gives logos consistent 100×28px image bounds inside the existing fixed operator column, preserving proportions and HD/SD alignment. Removed the unused Sun Direct badge-colour token from `src/tokens.css`. Browser checks passed in English/Tamil at 360/768/1024/1440px, including logo loading, visible names, desktop quality alignment and no overflow. A forced image-error check confirmed the existing text fallback works. Lint, type-check, localization check and build pass; tests remain 325 passed with the same 3 existing savings failures. [Desktop logo preview](artifacts/design-review/operator-logos-1440-en.png) · [Mobile logo preview](artifacts/design-review/operator-logos-360-en.png).

Follow-up: `src/service.css` now gives the desktop operator/quality group fixed 145px and 40px grid columns, so HD and SD badges share the same horizontal position across every row and are vertically centred beside each brand. Browser geometry checks passed for all rendered badges in English and Tamil at 1024/1440px; 360px layouts remain free of horizontal overflow. [Updated desktop preview](artifacts/design-review/quality-aligned-1440-en.png).

Implemented all five requested adjustments:

1. Brand and HD/SD badges share one horizontal group on desktop. Compare is now beside Select Pack.
2. Operator, pack, duration, total and actions use one shared five-column grid. Rows are vertically centred; headings align to the corresponding cells.
3. Operator column is 210px wide, keeping Airtel Digital TV on one line beside its quality badge. At narrower desktop widths, filters collapse into the existing filter panel to preserve space.
4. Added Operator / Pack / Duration / Total / Action headings in English, with Tamil translations. The five new translation keys are `uiCatalogOperator`, `uiCatalogPack`, `uiCatalogDuration`, `uiCatalogTotal`, and `uiCatalogAction` in `src/lib/customerMessages.ts`. Tamil is marked for native review.
5. Channel information remains visible in smaller muted text. Existing catalog validation flags are preserved.

The five-column list starts at 1024px. Smaller screens retain cards, with Compare and Select Pack grouped together below the price. Filters remain available at all widths.

## Files changed

- `src/components/BrowsePlans/PlanCard.tsx`: grouped actions, separate cells, reusable localized column headings.
- `src/components/BrowsePlans/BrowsePlansView.tsx`: render headings; adjust filter breakpoints for usable row width.
- `src/service.css`: shared grid, operator width, compact alignment, secondary text and responsive cards.
- `src/lib/customerMessages.ts`: five paired English/Tamil heading strings.
- `tests/serviceDesign.test.tsx`: heading localization and grouped action regression checks.

## Verification

Lint, explicit type-check, localization checks, build and `git diff --check` passed. Existing bundle-size and server CommonJS/import.meta warnings remain.

Full tests: **325 passed, 3 existing failures** (328 total). Unchanged failures are `oneMonthRate` expectations in `tests/calculateSavings.test.ts`, lines 97, 128 and 142. No new failures.

Browser checks passed for English and Tamil at 360, 768, 1024 and 1440px: no horizontal document overflow; five headings/cells align at desktop widths; row elements share their vertical centre; Airtel label stays on one line. Compare checkbox selection and deselection work. No payment or production-data write occurred.

Screenshots: [desktop](artifacts/design-review/compact-rows-1440-en.png), [1024px](artifacts/design-review/compact-rows-1024-en.png), [mobile](artifacts/design-review/compact-rows-360-en.png), [Tamil desktop](artifacts/design-review/compact-rows-1440-ta.png), [Tamil mobile](artifacts/design-review/compact-rows-360-ta.png).
