# Tata Play tariff import

Imported the user-provided `Screenshot 2026-11-11 215245.png` into the local development catalog. No new QA ID assigned. The user's follow-ups designate Tamil Thalaiva and Tamil Thalaiva HDs as recommended, and explicitly exclude the six-month “15 days free” offer from descriptions.

## Imported records

| Pack | Quality | 1 month | 6 months | 12 months | Recommended |
| --- | --- | ---: | ---: | ---: | --- |
| Tamil Thalaiva | SD | ₹308 | ₹1,848 | ₹3,388 | Yes |
| Tamil Thalaiva HDs | HD | ₹329 | ₹1,974 | ₹3,619 | Yes |
| Tamil Thalaiva HD New | HD | ₹399 | ₹2,394 | ₹4,389 | No |
| Tamil Thalaiva Sports Kids English | SD | ₹505 | ₹3,030 | ₹5,555 | No |
| Tamil Thalaiva Sports Kids English HD | HD | ₹745 | ₹4,470 | ₹8,195 | No |

- Added 15 entries: five families at 1, 6 and 12 months. Six entries are recommended, covering the two requested families at every duration.
- The image's final column states 11 paid months plus one free month; stored duration is the requested 12 months of service, with the printed price unchanged.
- No description includes the six-month 15-day offer. No bonus days were added to service durations.
- Channel counts were not supplied. All new entries explicitly mark them unavailable and omit numeric totals; no counts were invented. English and Tamil pack names are stored.
- Local catalog increased from 53 to 68 records. Verified no removals and unchanged records for every other operator.
- Backup: `.local-fixtures/catalog-before-tata-play-2026-11-12T11-00-23-817Z.json`. Local data and backup files remain ignored by Git.

## Files changed

- `scripts/lib/tataPlayTariffs.ts`: explicit source transcription and idempotent merge; preserves IDs and known counts if rerun against matching existing packs, rejects duplicate matches and explicitly deleted target IDs.
- `scripts/seed-local-tata-play.ts`: manual local-file importer, guarded by `NODE_ENV=development` and `--confirm=SEED_LOCAL_TATA_PLAY`. Backs up first, checks for intervening file changes, and replaces the local file atomically. No Firebase, application store, payment or network imports; no runtime seeding was added.
- `data/plan_catalog.json`: local import applied once, with the above backup.
- `src/lib/browsePlansData.ts`, `src/components/BrowsePlans/BrowsePlansView.tsx`, `src/components/BrowsePlans/PlanFilterSidebar.tsx`: default browsing no longer silently caps prices at ₹5,000, which would have hidden two imported annual packs. The slider ceiling follows the full catalog (currently ₹8,200), rounded to its ₹50 step. Deliberately narrowed price filters still work. This is a browse-filter change, not a new payment limit.
- `tests/tataPlayTariffs.test.ts`: eleven tests covering all printed prices/durations, recommendation flags, omitted offer text/counts, high-price browsing, validation, repeat imports, preservation, deleted/duplicate records and execution guards.
- `tests/catalogPriceFilter.test.tsx`: two tests for finite displayed slider bounds and retaining narrower user selections.

## Verification and remaining actions

Lint, explicit type-check, build and whitespace checks passed. Thirteen new tests passed. Full suite: **282 passed, 3 failed**; the same pre-existing `calculateSavings.test.ts` failures remain at lines 97, 128 and 142. Existing large-bundle and CommonJS/import.meta warnings remain.

The import was executed locally with both guards, then checked against its backup for counts, recommended flags, durations, absent offer wording and unchanged unrelated records. No production data, Firebase registry, real payment or deployed service was changed. No deployment occurred.

Restart `npm run dev` and refresh the site to load the file into the backend's in-memory catalog. Interactive browser verification after restart remains outstanding. Rates were transcribed from the supplied image; it supplies no effective date or channel totals and was not independently certified as current operator pricing.
