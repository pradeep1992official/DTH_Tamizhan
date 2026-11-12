# Sun Direct tariff-sheet import

Imported the user-supplied screenshot, following the explicit instruction to upload without channel counts. This is an intentional exception to the earlier requirement for mandatory counts, represented by an explicit unavailable flag rather than invented numbers. No new QA ID was supplied; this follows the Sun Direct HD catalog and pack-creation requests.

## Local result

- `data/plan_catalog.json`: 19 records before, 53 after. Sun Direct now has 32 SD and 10 HD duration records (42 total).
- Added 34 records. Preserved the eight existing Basic/Joy SD IDs and their existing stored counts. Those stored counts were not verified against the image, which supplies none.
- No records were removed. Verified every unrelated operator record is unchanged.
- The 34 new records omit total and HD counts and explicitly set `channel_counts_unavailable=true`. Customer cards show “Channel details not provided” in the selected language. No channel totals were guessed.
- Annual prices were omitted wherever the image has a dash. No zero-priced placeholders were created.
- Backup: `.local-fixtures/catalog-before-sun-direct-2026-11-12T10-01-45-401Z.json`. Both catalog data and backups remain ignored by Git.

| HD pack | 1 month | 3 months | 6 months | 12 months |
| --- | ---: | ---: | ---: | ---: |
| Economy HD | ₹259 | ₹739 | ₹1,399 | ₹2,689 |
| Value HD | ₹289 | ₹829 | ₹1,569 | Not listed |
| Super Value HD | ₹340 | ₹969 | ₹1,839 | Not listed |

SD families: Joy, Joy Plus, Basic, Silver, Gold, Tamil Malayalam Jodi, Tamil Kannada Jodi, Tamil Telugu Jodi and Premium. Exact transcribed prices are in `scripts/lib/sunDirectTariffs.ts`.

## Files and behavior

- `scripts/lib/sunDirectTariffs.ts`: explicit 42-record transcription and pure merge function; preserves unrelated records, known counts and existing IDs. Repeated runs are idempotent. Duplicate matches and deleted target IDs are rejected.
- `scripts/seed-local-sun-direct.ts`: isolated local-file importer; requires `NODE_ENV=development` and `--confirm=SEED_LOCAL_SUN_DIRECT`. It backs up the file before an atomic replacement and checks for intervening changes. No server store, Firebase SDK, network, payment or order imports. No automatic runtime seed path was added.
- `src/types.ts`, `src/lib/catalog.ts`, `server/middleware/validation.ts`: explicit unavailable-count support. Missing counts without the flag still fail. Invented/contradictory counts, name claims, invalid prices and invalid durations still fail validation.
- `src/lib/browsePlansData.ts`: preserves unknown counts; avoids fabricated price-per-channel metrics or best-value badges. Default browsing includes unknown-count packs; an explicit narrowed channel-count filter excludes them.
- `src/components/Admin/tabs/PacksTab.tsx`: explicit “Channel counts not provided” checkbox so imported packs can be edited without making up counts.
- `tests/sunDirectTariffs.test.ts`: 12 new tests cover transcription, unavailable durations, safe merge, repeat runs, deletion/duplicate protection, schema/formatting, unknown-count browsing and production/missing-confirmation guards.
- `tests/filterAndSortPlans.test.ts`: makes its existing channel-range assertion handle the now-optional count type explicitly.

## Verification and remaining steps

Lint, explicit type-check, build and whitespace checks passed. The full suite reports **228 passed, 3 failed**. The same pre-existing `calculateSavings.test.ts` failures remain at lines 97, 128 and 142. Existing build warnings remain for the large client bundle and CommonJS/import.meta development-preview code.

The local importer was run once with its development and explicit confirmation guards. Post-import checks verified all counts above, zero deletions and unchanged unrelated records. No production database, production catalog, payment or seed endpoint was contacted; no deployment occurred.

**Restart `npm run dev` to load the updated local catalog.** The running backend holds its catalog in memory; it was not terminated because restarting it from a different shell could lose the user's server credential environment. A browser refresh alone does not reload that server-side memory. Interactive browser verification after restart remains outstanding.

The image does not state an effective date or channel counts. Rates were transcribed as requested, not independently certified as current operator rates. The decorative “24/7” claim was not imported into support content.
