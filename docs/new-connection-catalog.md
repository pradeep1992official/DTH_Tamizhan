# New DTH Connection: catalog foundation

Admin entry: `/admin/catalog`. This is separate from the recharge `plan_catalog` and the existing admin Packs tab. No customer browsing, booking, orders, payments or notifications were added.

## Files

- `src/lib/newConnectionCatalog.ts`: Zod validation, typed Brand/Pack/Channel/EquipmentOffer/settings models, count and monthly price derivation, CSV parsing/encoding.
- `server/models/newConnectionCatalog.ts`: named-database persistence, timestamps, idempotent identities, transactional mutation guard, reference-aware deletion and sample cleanup.
- `server/routes/newConnectionCatalog.ts`: admin-authorized read/save/delete/verify/import/bulk-channel/logo APIs; mounted in `server/routes/admin.ts`.
- `src/components/Admin/tabs/CatalogTab.tsx` and `catalog.css`: catalog sections, forms, searchable channel picker, pagination, filtering, bulk status edits, import/error report and uploads.
- `src/components/AdminPortal.tsx`, `src/types.ts`, `src/App.tsx`, `src/lib/pageMetadata.ts`: Catalog navigation, route and metadata registration.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`: access policy and indexes. Exact changes: `docs/new-connection-catalog-rules.diff`.
- `public/catalog-templates/channels.csv`, `public/catalog-templates/packs.csv`: downloadable templates, also linked in the admin UI.
- `scripts/seed-new-connection.ts`, `package.json`: sample seed/cleanup and explicit type-check commands.
- `tests/newConnectionCatalog.test.ts`, `tests/newConnectionCatalogApi.test.ts`, `tests/newConnectionCatalog.rules.test.ts`: validation, derived counts, import errors, reference integrity, verification, sample safety and API authorization.

## Data and conventions

Collections: `dthBrands`, `dthPacks`, `dthChannels`, `dthEquipmentOffers`; document: `appSettings/newConnection`.

All requested fields are supported. `language` and `region` are separate pack strings. Equipment `includedFirstPackId` uses an empty string for no inclusion. Channels and equipment also have `sortOrder`, to support consistent admin ordering. Currency is INR, expressed in rupees. Validities are positive whole days. Prices are nonnegative finite numbers. A pack requires at least one pricing option, with unique validity days.

`monthlyPrice` uses the 30-day option when present, otherwise the shortest validity normalized to 30 days, rounded to two decimals. It is a comparison amount, not an additional purchase option. Channel totals count unique assigned channel IDs, including inactive assigned channels. Unknown IDs are rejected. Deactivating a channel preserves pack membership. Editing a channel's HD/pay flags recomputes every referencing pack in the same transaction. A pack's counts and monthly price cannot be set manually.

`updatedAt` and `priceLastVerifiedAt` are Firestore Timestamps; APIs serialize them as ISO strings. New/duplicated packs have null verification. Changing prices clears verification. The admin verification action uses server time. Never-verified prices and prices older than 30 elapsed days show a warning.

Each mutation reads and writes `server_runtime/newConnectionCatalog` inside a transaction. Catalog pipeline reads happen after the transaction reads this guard. Concurrent catalog mutations conflict on the guard and retry, preserving references and unique identities. All writes must go through these helpers, including future integrations. Direct administrative console/SDK changes can bypass server invariants and must be avoided. Extremely large catalogs may eventually need paginated server queries and asynchronous imports; the current picker bounds results at 60 and catalog tables page at 50 rows. A channel referenced by enough packs to exceed Firestore transaction limits will fail atomically; no partial count changes are saved.

## Access and logo uploads

Every API independently calls the existing verified-email/root-or-approved-admin policy, which checks the canonical UID/email-bound registry, not local role state or custom claims. Revoked admins cannot mutate the catalog. Server credentials need Firestore and Storage IAM permissions.

**Architecture assumption:** “admin-only write” is enforced at the authenticated server API, matching existing server-managed features. Direct Firestore and Storage client writes are denied even to admins, so callers cannot bypass derived counts, reference validation or the mutation guard. Public clients can read only active catalog documents; admins can read inactive ones. Public catalog queries must constrain `active == true`. Settings are publicly readable because the specified settings schema has no `active` field; keep them free of private data. Other settings documents remain denied.

Logos use the existing server Admin Storage bucket pattern with PNG/JPEG/WebP signature and 2 MB checks. Uploads are stored only under `catalog-logos/` and return public download URLs. SVG is intentionally unsupported. Receipt rules remain private. Upload first, then save the record to attach the URL; cancelling the form leaves an unattached object that may be removed manually.

Storage rules cannot look up the approved-admin registry in this app's named Firestore database: cross-service access supports only the default database. Therefore the logo folder has public read and denies direct client write; the verified server endpoint performs writes through IAM. See [Firebase Storage rule conditions](https://firebase.google.com/docs/storage/security/rules-conditions).

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for public active-catalog reads and server-authorized administrative changes that validate references and derived totals. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## CSV import

Download a template from Channels or Packs, or use `public/catalog-templates/`.

- UTF-8 CSV supports BOM, quoted commas, escaped quotes, CRLF and multiline fields. Maximum 2 MB / 2,000 data rows per request.
- Required channel values: `name`, `language`, `genre`. Boolean values must be `true`/`false`; omitted booleans default to false. Genre is a free string so additional genres are supported.
- Required pack values: `brandId`, `name`, `type`, `pricingOptions`. Copy IDs from the admin table. `pricingOptions` is a JSON array, e.g. `[{"validityDays":30,"price":123},{"validityDays":90,"price":345}]`; CSV quote escaping is illustrated in the template.
- `channelIds` and `highlights` are pipe-separated. Empty channel membership is allowed. Invalid or unknown channel/brand IDs fail validation. Import brands first, then channels, then packs.
- Channels upsert by normalized name. Packs upsert by normalized name + brand ID. Brand identity is its slug. Names are case-insensitive and normalize punctuation/spacing; two channel variants must have distinct names, e.g. `SAMPLE News` and `SAMPLE News HD`.
- Valid rows save immediately. Invalid rows are returned with a logical CSV row number (header is row 1) and reason. Download the error report in the UI, fix failures and re-import. File-level CSV syntax/column-count errors reject the file before any writes. Multiline fields count as one logical row.
- Repeating an import updates existing identities. Renaming a record in an import creates a new identity; use Edit to rename while retaining its ID. No explicit ID overrides are accepted by CSV import.
- Spreadsheet formulas are escaped in error report cells. Import errors and reports are scoped to the current admin view, not persisted.

## Sample seed and cleanup

No new libraries. Uses the existing Firebase Admin SDK and Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS` or workload identity). Targets the project/database already in `firebase-applet-config.json`, independent of `PERSISTENCE_DRIVER`.

Preview locally, without Firebase writes:

```powershell
npm run seed:catalog
```

Explicitly write to the configured database:

```powershell
npm run seed:catalog -- --write --project gen-lang-client-0168639596
```

Preview and then wipe only flagged sample documents:

```powershell
npm run seed:catalog -- --wipe-sample
npm run seed:catalog -- --wipe-sample --write --project gen-lang-client-0168639596
```

Seeds 3 brands, 9 packs (3 per brand), 40 channels and 3 equipment offers. Every name contains `SAMPLE`; prices remain numeric but are explicitly marked by `sampleData: true`, `samplePriceLabel`, names, pack highlights, offer notes and the admin SAMPLE badge. All sample items start inactive and prices unverified. Seed re-runs upsert deterministic identities. Settings are preserved. Seeding refuses to overwrite a matching non-sample identity. Sample edits must retain `SAMPLE` in the name. Cleanup refuses to delete samples referenced by non-sample records and deletes only `sampleData == true` catalog documents; it never wipes whole collections. No seed writes or cleanup were executed during implementation.

## Rules and indexes: review before deploying

Exact diff is in `new-connection-catalog-rules.diff`. Changes allow public active catalog reads and public reads of this settings document, preserve admin reads, deny direct client mutations and expose public logo reads only. Server API authorization is the write authority. Existing unrelated rules are unchanged.

Current admin collection reads use the existing Enterprise pipeline helper and do not require new composite indexes. Added six indexes for future public active/sorted queries: `(active ASC, sortOrder ASC)` on each catalog collection, and `(brandId ASC, active ASC, sortOrder ASC)` on packs/equipment. These indexes do not introduce customer pages.

No deployment was performed. After reviewing, deploy from this repository:

```powershell
npx firebase-tools deploy --only "firestore:rules,firestore:indexes,storage" --project gen-lang-client-0168639596
```

`firebase.json` already binds the rules/indexes to the named database. Deployment of the web/server application is a separate existing workflow.

## Verification and limitations

Run:

```powershell
npm run lint
npm run type-check
npm run build
npx vitest run tests/newConnectionCatalog.test.ts tests/newConnectionCatalogApi.test.ts
npm run test:emulator
```

Implementation checks passed: lint, type-check, production build, 14 catalog unit/API tests and 28 existing admin navigation/revocation regression tests. Four new live rule tests were explicitly skipped because no emulator was running. The build emits the existing large-chunk warning. The seed dry run completed without writing data.

The existing lint command is TypeScript checking; no ESLint dependency was added. Unit/API tests use mocked Firestore/Storage, not live infrastructure. The project was inaccessible through the connected Firebase account, so database edition and deployed permissions could not be independently checked. The implementation follows this repository's existing Enterprise pipeline helper and named database. Live Firebase rule validation and authenticated browser testing require project access. The local Java executable is unavailable, preventing Firestore emulator execution in this environment. Browser console behavior was not independently verified with an authenticated admin session.

Admin field labels follow the existing English admin-tool convention; the new main Catalog navigation label supports English and Tamil. Terms/policy content is stored as entered, without an additional localization schema.

## Manual admin checklist

1. Sign in as a customer/guest: catalog access and all mutation APIs must be rejected. Sign in as an approved admin: `/admin/catalog` opens. Revoke access and retry: server rejects mutations.
2. Add/edit a brand. Validate required slug/name, sort order, SD/HD support and active toggle. Refresh and verify persistence. Upload valid logos; reject SVG, spoofed MIME signatures and files over 2 MB.
3. Add channels with differing genres/languages/HD/pay flags. Search/filter and paginate. Select filtered channels and bulk activate/deactivate; verify counts and individual failures.
4. Create a pack with 30/90-day prices and assigned channels. Attempt duplicate validities, negative prices and unknown IDs. Verify monthly price and all four counts after reload. Search and select channels with a 500+ channel dataset; only 60 matching picker entries render at once.
5. Change an assigned channel's HD/pay flags; confirm referencing pack totals update. Deactivate a channel and confirm membership is preserved. Change pack membership and verify no manual count override is possible.
6. Duplicate a pack, give it a unique name, and save. Confirm new identity and unverified prices. Verify prices today; then change a price and confirm verification clears. A timestamp over 30 days old should show the warning.
7. Create equipment with prices/installation/warranty/included pack. Reject a pack from another brand. Attempt to move a referenced pack to another brand and confirm rejection.
8. Delete unreferenced records with confirmation. Delete referenced brands/channels/packs and confirm soft deactivation and intact references. Cancel confirmation and confirm no changes.
9. Import both templates after replacing IDs. Include one invalid row; confirm valid rows save, row errors appear and error CSV downloads. Re-import and confirm counts do not grow. Test quoted names/commas, BOM and multiline fields.
10. Save settings, including full/partial/none modes, positive partial amount and valid six-digit pincodes. Reject invalid values. Confirm only the requested settings document is publicly readable.
11. Preview/run seed in an authorized test environment. Confirm 55 inactive SAMPLE records and re-run without duplicates. Wipe samples and confirm unrelated records/settings remain.
12. Verify public active-only queries, denied inactive reads/unfiltered public queries, admin inactive reads, denied direct writes and private receipt paths in the emulators. Inspect browser console/network errors during the workflow and check mobile layout/keyboard form access.
