# New connection customer catalog — Part 2

Routes:

- `/new-connection`: brand tabs, filtered pack catalog, price/validity selection and equipment prices.
- `/new-connection/packs/:packId?validity=90`: searchable channel list; the selected validity is preserved for the Select pack link.
- `/new-connection/compare?packs=<id>,<id>,<id>&validities=30,90,30`: direct, shareable comparison across up to three brands/packs.
- `/new-connection/book?brand=<brandId>&pack=<packId>&validity=<days>`: selection summary and coming-soon placeholder only. No booking, payment or order is created.

The main desktop/mobile navigation and recharge/home page link to the new catalog. Existing recharge packs and admin tools are unchanged. No new dependencies, rules changes or index changes were required. This implementation has not been deployed.

## Files created

- `src/lib/newConnectionPublicCatalog.ts`: validated active-only Firestore reads and shared caching.
- `src/lib/newConnectionBrowse.ts`: visible channel counts, filtering/sorting, equipment estimates, comparison differences and URLs.
- `src/lib/newConnectionCopy.ts`: English/Tamil copy and translations of known genre/language values.
- `src/components/NewConnection/NewConnectionPages.tsx`: loading/error states, child routes, comparison selection and booking placeholder.
- `src/components/NewConnection/CatalogPage.tsx`: brands, filters, cards, equipment and sticky comparison bar.
- `src/components/NewConnection/ComparePage.tsx`: comparison table, share controls, unavailable columns and channel differences.
- `src/components/NewConnection/Shared.tsx`: graceful logo fallback, price verification notices and paginated channel browser.
- `src/components/NewConnection/new-connection.css`: scoped styles using existing color/type/spacing conventions.
- `scripts/lib/newConnectionSamples.ts`: extracted, unchanged Part 1 sample definitions plus the sample-only status predicate, shared by the seed script and tests.
- `tests/fixtures/newConnectionCatalog.ts`: materializes the exact Part 1 sample definitions for read-only tests.
- `tests/newConnectionBrowse.test.ts`, `tests/newConnectionPublicCatalog.test.ts`, `tests/newConnectionPages.test.tsx`: logic, cache/read-contract and rendering coverage.
- This document.

## Files modified

- `src/App.tsx`: lazy route, active navigation detection and home/recharge entry.
- `src/components/Header.tsx`: English/Tamil desktop/mobile New Connection link.
- `src/lib/pageMetadata.ts`: static/direct routes and bilingual metadata, also used by the server.
- `src/lib/translations.ts`: includes the new English/Tamil copy using existing translation objects.
- `src/workspace.css`: five-item mobile navigation with horizontal overflow within the navigation bar.
- `scripts/seed-new-connection.ts`: sample-only activation/deactivation, preview default and conflicting-operation checks. Existing seeding/wiping protections are preserved.

## Reads, caching and availability

The client uses the existing initialized **named** Firestore database. Each catalog collection is queried with `where('active', '==', true)`. Settings use a single document read at `appSettings/newConnection`. All public behavior is read-only. There are no `in` queries and no public admin-API calls.

Each successful cache fill makes four collection queries and one settings-document read. Concurrent requests share one promise. Data is cached in memory and in sessionStorage with a five-minute expiry, scoped to the configured project/database. Feature route changes and reloads check this expiry. Storage being full/disabled does not break the memory cache. Invalid/expired saved cache is discarded. Failed loads show a retry state instead of presenting an incomplete catalog as complete.

This is a cached snapshot, not a live subscription. Admin changes can remain visible until the next expired-cache read. Reload after five minutes, or close/reopen the tab to get a fresh session when testing availability. Sample activation/deactivation does not bypass the cache.

Only active brands/packs are offered. A shared URL retains every valid selected ID, even when the corresponding pack or brand is inactive/missing. Such a column says **No longer available**, contains no private data and has no selection link or cost estimate. The public code never attempts to fetch an inactive document. If a validity has been removed, comparison falls back to an available validity and replaces the URL with the value actually displayed. IDs are deduplicated and capped at three. Invalid IDs are ignored.

Customer counts and genre totals are derived from unique channel IDs present in the readable active-channel catalog. Missing/inactive channels are omitted consistently from cards, comparisons and channel lists. A short development-only warning identifies packs whose stored counts differ. Production does not emit that warning.

Channel lists and comparison groups render at most **60 channels per page**, with all filter/search matching performed against the full cached list. Genre headings show matching counts across pages. Logo slots have fixed dimensions; images are lazy-loaded and have a text fallback.

## Pricing and other assumptions

- Currency is INR in rupees. Every filter/sort price and the price-per-channel value uses `monthlyPrice`, labelled **30-day comparison price**. Individual validity choices update the actual quoted pack price and first-time estimate. The validity filter means “this pack offers that duration.”
- Null or over-30-day price verification shows the requested caution. Valid verification dates are localized. The settings price disclaimer appears below the catalog and comparison.
- Equipment estimate uses the lowest total hardware + installation cost among compatible active brand offers. HD/4K boxes can support lower-resolution SD/HD packs; a 4K pack requires a 4K box. Regional/add-on packs do not encode required hardware, so all same-brand offers are eligible. This capability assumption should be reviewed against actual operator hardware restrictions before booking is implemented.
- First-time estimate = selected pack price + hardware + installation. With no compatible offer it says pricing is unavailable, never zero. Offers listing an included starter pack display that inclusion, but the schema has no included validity/credit amount. Therefore no discount is assumed; the selected pack is charged separately in this estimate, clearly explained on the page. Part 3 should resolve operator-specific inclusions before charging anything.
- Channel differences compare IDs. Two packs show their intersection and each exclusive set. Three packs show the intersection of all three and channels exclusive to each individual pack; channels shared by exactly two remain visible in their full pack lists. If any selected column is unavailable, differences are withheld rather than claiming a complete intersection from incomplete data.
- Best-value shading marks ties as well as winners. Prices/fees use the lowest value, counts use the highest value, and unavailable/zero-channel price-per-channel values do not win. Selected-validity prices are explicitly labelled and shown alongside each pack's validity; the 30-day rows provide a common comparison basis.
- Admin-entered brand names, pack names, highlights, warranty notes, region strings and disclaimer text are displayed as authored. UI labels and known genre/language names are bilingual; the Part 1 schema does not contain bilingual catalog fields.
- Comparison selection stays in memory while navigating within this feature. Shared URLs fully reconstruct comparison columns without that state. Leaving the feature resets unsaved selection.

## Exact sample commands

These PowerShell commands deliberately use `npm.cmd`: this environment's `npm.ps1` wrapper dropped forwarded flags during verification. On other platforms use `npm` in place of `npm.cmd`.

Previews do not read or write Firebase:

```powershell
npm.cmd run seed:catalog
npm.cmd run seed:catalog -- --activate-sample
npm.cmd run seed:catalog -- --deactivate-sample
npm.cmd run seed:catalog -- --wipe-sample
```

Write inactive sample data, then explicitly activate it:

```powershell
npm.cmd run seed:catalog -- --write --project gen-lang-client-0168639596
npm.cmd run seed:catalog -- --activate-sample --write --project gen-lang-client-0168639596
```

Hide the samples again, or remove them:

```powershell
npm.cmd run seed:catalog -- --deactivate-sample --write --project gen-lang-client-0168639596
npm.cmd run seed:catalog -- --wipe-sample --write --project gen-lang-client-0168639596
```

Writes require existing Firebase Admin Application Default Credentials and target the database in `firebase-applet-config.json`. A Firebase CLI login alone is not necessarily an Admin SDK credential. `GOOGLE_APPLICATION_CREDENTIALS` or existing workload identity can provide credentials; do not commit credential files.

Activation/deactivation requires **both** `sampleData === true` and `SAMPLE` in the record name. A transaction also checks the existing sample marker before writing. It preserves the name, marker and sample-price warning. Real records/settings are untouched. These operations change existing samples only; run seeding first if none exist. Only one of activate/deactivate/wipe can be passed at a time. Wiping continues to use Part 1's original sample deletion and non-sample reference safeguards.

## Automated validation performed

- `npm run lint`, `npm run type-check`, `npm run build`.
- `npm run check:i18n`: English/Tamil key parity, interpolation and UTF-8 checks.
- 18 new tests: exact Part 1 seed fixtures, visible-count mismatch, all filters, sorting, equipment quotes, two/three-pack differences, 650-channel search/pagination/rendering, share URLs/unavailable slots, sample predicates, metadata, active-only reads, concurrent deduplication, TTL, malformed cache and blocked sessionStorage.
- Part 1 catalog/API and existing admin/navigation tests: the targeted run passed 48 tests in total.
- Activation and deactivation dry runs through the exact `npm.cmd` commands above.
- A read-only live SDK check successfully loaded all four active-only collections and settings from the named database. At that time all four active catalog collections were empty, so the correct current customer state is Coming soon.

No sample database writes, activation/deactivation, wipe or deployment was performed for Part 2. The build still emits the existing large-chunk warning. The browser-access host was unavailable when an isolated sample preview was attempted, so actual desktop/mobile layout, interactive keyboard behavior and browser console checks remain manual. No claim of completed browser QA is made.

## Manual checklist

1. With no active catalog entries, open `/new-connection` signed out: see Coming soon. Check desktop/mobile New Connection navigation and the home entry. Confirm existing recharge navigation still works.
2. Seed and activate SAMPLE data in an authorized test environment. Use a fresh tab or expire the five-minute cache. Expect 3 SAMPLE brand tabs, 3 packs per brand, 40 active channels, 3 equipment offers, and visible sample-price notices.
3. Switch brands and change each filter: language, region, type, minimum/maximum 30-day price, validity and genre. Verify resets, no-results messages and the three sorting modes. Change a pack's quoted validity and confirm price, starting estimate and Select pack URL agree.
4. Check equipment hardware, installation, warranty and included-starter notes. Check an unavailable compatible offer shows unknown total, not zero. Confirm null/stale price verification notices and configured disclaimer text.
5. Deactivate one assigned channel using the existing admin tool. After cache expiry, verify card, full channel list, genre counts and comparison all reflect the visible list. In development expect the small count-mismatch warning; in production expect no warning.
6. Open View channels and test search, genre, language, HD and pay/free filters. With 500+ assigned active channels, test first/last pages and searches for channels beyond the first 60. Confirm only 60 channel rows render at once, logos reserve space and broken/missing logos fall back gracefully.
7. Select two packs, switch brands and select a third. The sticky bar retains all selections. Attempt a fourth: expect a friendly limit message without changing the selection. Remove/clear, then compare two and three packs.
8. In comparison, change validities and check URL, selected prices and first-time totals. Check tied best values, genre counts, common/exclusive lists, search and pagination. Copy the link and open it in a fresh tab without prior state.
9. Deactivate a compared pack or its brand and open the shared link in a fresh session: retain its column labelled No longer available. Do not expose hidden pack fields or offer selection. Remove the unavailable column and recheck differences. Test a removed validity and confirm fallback/URL replacement.
10. Select pack from a card, channel page and comparison. Verify `/new-connection/book?brand=...&pack=...&validity=...` and the placeholder summary. A tampered brand/pack/validity combination must show the unavailable-selection message. Confirm no form/payment/order is created.
11. At 320/375/768px and desktop widths, check the header navigation, brand tabs, filters, cards, sticky compare bar and horizontally scrolling comparison. The comparison's first column stays sticky; scrolling should be inside the table, not the page.
12. Switch English/Tamil on all routes. Verify labels, dates, currency, empty/error states, limits, navigation and placeholder copy. Catalog content should remain as entered by the admin. Navigate by keyboard and check focus outlines, checkbox/select labels, table headings, pagination and clipboard failure fallback.
13. Disable network before the first read: expect the localized error/retry state. Disable sessionStorage: normal reads should still work. Navigate between feature routes and verify no repeated collection reads inside the TTL; check again after expiry. Inspect browser console for unexpected errors.
14. Deactivate samples, confirm Coming soon after cache refresh, then optionally wipe them. Real data/settings must remain intact.
