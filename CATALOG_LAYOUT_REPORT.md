# Browse Packs row layout

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
