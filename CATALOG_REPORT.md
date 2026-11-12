# Catalog correctness — QA-04 / QA-08 / QA-09

## Changes by issue

**QA-04:** Removed fabricated channel defaults and highlight-list-as-total logic. Contradictory existing packs show “Channel details need review” and a detailed validation message instead of “9 Channels, including 32 HD”. Saving/importing the reported record is rejected until its declared total, HD count and name agree. No guessed replacement counts were written.

**QA-08:** Recharge, `/plans`, admin listing and payment quotes now use the server catalog behind `/api/catalog` and the existing server `planModel`. Public reads no longer independently select Firestore or a cache. Both public views format declared `channel_count` / `hd_channel_count` through the same helpers. Highlights remain a separate subset. The current ₹1,289 SD record declares 10 total / 0 HD, so both views now display 10 consistently. Whether that total should actually be 140 remains an owner correction, not an inferred data change.

**QA-09:** One monthly-equivalent policy: divide the stored price by the stored duration and round to two decimal places. Currency formatting shows two decimals. ₹1,399 / 6 displays **₹233.17 / month** everywhere, ₹1,289 / 6 displays ₹214.83, and ₹3,091 / 12 displays ₹257.58. Whole-rupee ceil/round display paths were removed from recommendations, browse cards, comparisons and admin pack rows. Duration and price displays also use shared helpers.

## Validation and imports

The shared validator requires a positive integer total, explicit nonnegative integer HD count no greater than the total, highlight-list length no greater than the declared total, positive finite price, matching amount/price aliases and a supported 1/3/6/12-month duration. It checks pack-name numbers labeled as HD counts, total channels, months/years or INR prices against their fields. Unlabelled standalone numbers are flagged for review rather than assigned an invented meaning; brand identifiers such as D2H are preserved.

Admin Add/Edit Pack has explicit total-channel and HD-channel fields. The service validates before any save request. Spreadsheet export/template includes both count columns; new rows require explicit counts, while updates can preserve an existing count when its column is absent. Import preview shows validation errors and count changes, and apply revalidates even if a caller forges the preview's `isValid` flag. The API validates single saves and every item in batch imports; the model also validates before mutation.

Selected import rows are upserted, rather than replacing the entire catalog and deleting unrelated packs. No import, save, deletion, seed or production write was executed during this correction. Audit logs remain separate from catalog records.

## Read-only audit results

Ran `npx tsx scripts/audit-catalog.ts` against `data/plan_catalog.json`, the available authoritative server snapshot: **19 scanned, 6 invalid, 1 additional manual-review record**. Full messages and record details are in `CATALOG_AUDIT.json`.

| Record ID | Months | Price | Stored total / HD | Name claim / action needed |
| --- | ---: | ---: | --- | --- |
| airtel_hd_superstar_12m | 12 | ₹2,791 | 9 / 32 | Name says 20 HD; HD exceeds total. Confirm both totals and name. |
| airtel_hd_superstar_6m | 6 | ₹1,396 | 7 / 32 | Name says 20 HD; HD exceeds total. Confirm both totals and name. |
| airtel_hd_superstar_1m | 1 | ₹279 | 9 / 32 | Name says 20 HD; HD exceeds total. Confirm both totals and name. |
| airtel_hd_superstar_plus_6m | 6 | ₹1,546 | 9 / 32 | Name says 29 HD; HD exceeds total. Confirm both totals and name. |
| airtel_hd_superstar_plus_1m | 1 | ₹309 | 9 / 32 | Name says 29 HD; HD exceeds total. Confirm both totals and name. |
| airtel_hd_superstar_plus_12m | 12 | ₹3,091 | 9 / 32 | **QA-04:** name says 29 HD; HD exceeds total. Confirm both totals and name. |
| airtel_sd_superstar_6m | 6 | ₹1,289 | 10 / 0 | **QA-08 manual review:** structurally valid, but reported 10 versus 140 requires owner confirmation. |

The script reads only and prints JSON. A positional JSON-array snapshot path can be supplied. An explicit `--firestore` option can read the configured legacy Firestore catalog using Admin SDK credentials; that mode was not run. This is not a claim that a separate deployed Firestore database or a newer production snapshot was audited. No production records were automatically corrected or migrated.

The server catalog is now the shared display/pricing source. Legacy Firestore catalog edits do not automatically alter this source; use the validated admin form/import flow for future corrections. Nothing was deployed.

## Files changed for this task

- `src/lib/catalog.ts`: shared validation, normalization and formatting policy.
- `src/lib/planCatalogService.ts`: common server read path, no guessed metadata, validated API saves and catalog update notifications.
- `src/lib/browsePlansData.ts`: preserve declared totals and use the shared monthly calculation through metrics.
- `src/components/RechargeFlow.tsx`: shared display helpers, review messages and current-record selection.
- `src/components/BrowsePlans/BrowsePlansView.tsx`: same source and empty-catalog refresh behavior.
- `src/components/BrowsePlans/PlanCard.tsx`, `ComparisonTable.tsx`, `CompareDrawer.tsx`, `ApplyPlanModal.tsx`: consistent formatting and safe channel summaries.
- `src/components/Admin/tabs/PacksTab.tsx`: explicit count inputs, validation feedback and shared formatting.
- `src/lib/excelPlanService.ts`: count columns, validated preview/apply and API-only batch persistence.
- `server/middleware/validation.ts`, `server/routes/plans.ts`: shared single/batch API validation.
- `server/controllers/plansController.ts`, `server/models/planModel.ts`: trusted import metadata, validation and preserving unrelated packs during imports.
- `scripts/audit-catalog.ts`, `CATALOG_AUDIT.json`: read-only audit and full correction list.
- `tests/catalog.test.ts`, `catalogImport.test.ts`, `catalogBatch.test.ts`: new formatting, validation, API rejection, import and preservation tests.
- `tests/excelParser.test.ts`, `catalogReadOnly.test.ts`: existing fixtures/tests updated for explicit counts and the single API source.
- `CATALOG_REPORT.md`: this report. Earlier correction-task edits remain in the working tree.

## Verification and outstanding work

Lint, explicit type-check, build and whitespace checks pass. All **29 new catalog tests** pass. Full suite: **154 passed, 3 failed**; the unchanged savings-baseline failures remain at `calculateSavings.test.ts:97`, `:128` and `:142`. They return oneMonthRate 0 instead of 300/200/200 and were not broadened into this correction.

The build retains large-bundle and CommonJS/import.meta warnings. Existing Firestore tests skip live assertions when no local emulator is available. No interactive browser or live production audit was performed. The owner still needs to confirm and correct the six invalid packs and the disputed SD count using authoritative operator data.
