# Project error report

Date: 15 November 2026 (Asia/Calcutta). Revision: `a848629`.

## Resolution update

The defects and failing automated checks below have been addressed in the working tree. The original findings remain below as the review record.

- Fixed lookup request deduplication by registering the shared job while the provider request is in flight. Added a regression test for shared failures and successful retry after cleanup.
- Preserved one-month savings baselines, normalized duration suffixes for SD plan-family comparison, and tested that unrelated/explicitly different families are not compared.
- Moved the Tamil installation statement into the corresponding terms section, preserving its content and restoring localization parity.
- Updated admin tests to isolate the current pagination, recharge-reader and audit-log interfaces. Isolated the AI fallback test from the rate limiter.
- Replaced obsolete placeholder, combined-operator and error-URL assertions with checks for the supported behavior.
- Added lazy loading for admin, history, support-ticket and browse-plan screens, and loaded Excel tools only when opened. Main JavaScript decreased from 2,705.65 kB to 725.39 kB minified (737.94 kB to 202.64 kB gzip). Other shared/on-demand chunks still exceed 500 kB; the Vite size warning remains a performance follow-up.
- Defined the development-only environment flag as false in the server build; the CJS `import.meta` warning is gone.

Verification: full suite **759 passed, 0 failed, 2 skipped** (761 discovered tests). The final two-file regression run passed **19 tests**, covering the additional savings and lookup retry checks. TypeScript, localization, production build and `git diff --check` passed. Full machine-readable results: [resolved-tests.json](resolved-tests.json).

Remaining coverage limits: emulator-dependent tests are still skipped, and live provider/authenticated browser checks were not performed. Java/Firebase emulator commands are not available on this machine's PATH. No production deployment or live transaction was performed.

## Assessment

The project compiles and produces production bundles, but the automated checks are not clean. The highest-priority confirmed defect is a race that duplicates simultaneous DTH account lookups. Localization validation also fails. Several test failures reflect older product expectations rather than demonstrated application defects.

This was a local build, automated-test, and targeted source review. Application source was not changed during this review. This report is not a claim that every production workflow is error-free.

## Checks performed

| Check | Result |
|---|---|
| `npm run lint` (TypeScript, not a separate style linter) | Passed |
| `npm run build` | Passed, with two build warnings |
| `npm run check:i18n` | Failed: terms section/paragraph parity |
| `npm test` | 108 files: 101 passed, 7 failed. 760 tests: 739 passed, 19 failed, 2 skipped |
| Focused rerun of admin access, AI fallback, customer lookup and savings | 35 tests: 28 passed, 7 failed; initial AI timeout did not recur |

Focused machine-readable evidence: [focused-tests.json](focused-tests.json). Runner log: [focused-tests.log](focused-tests.log).

The full suite exercises payment verification and records, recharge processing/recovery, customer history, receipts, email logic, accounts, admin access, plan data, imports, navigation, support tickets, AI behavior and localization. Passing mocked tests do not establish that connected production services work.

## Findings

### 1. High: simultaneous account checks can make duplicate provider requests

Location: `server/models/customerDthLookup.ts`, `customerDthLookup`.

The function checks `pending`, then awaits `lookupDth`, and only afterward registers a promise in `pending`. A second caller can pass the check while the first provider request is still running. The concurrency test consistently observed two provider contacts instead of one, including in the focused rerun.

Impact: repeated clicks or concurrent requests can consume extra lookup allowance and potentially incur extra provider charges. No actual provider billing was performed in this review.

Recommendation: register the promise before awaiting the provider; put the provider call and response processing inside that promise, and retain cleanup in `finally`. Keep the existing UID/operator/subscriber cache isolation.

### 2. Medium: English/Tamil terms structure fails localization validation

Locations: `src/lib/policyTranslations.ts:80`, `src/lib/trustContent.ts:85`.

Tamil terms have an extra leading section containing `b.installation`; English includes installation information inside its first section. The validator compares sections and paragraph counts by position, so it reports `policy terms: section/paragraph parity mismatch`.

Impact: localization checks and one unit test fail. This demonstrates a structural mismatch, not missing Tamil translation or damaged encoding.

Recommendation: align equivalent sections across languages, or revise validation to compare stable content identifiers if different section structures are intentional.

### 3. Medium: savings helper returns a zero baseline in cases covered by its existing contract tests

Locations: `src/lib/planCatalogService.ts:1040`, `tests/calculateSavings.test.ts`.

Three failures reproduce: the one-month selection returns `oneMonthRate: 0` instead of 300; an SD multi-month fixture returns 0 instead of 200; an unavailable requested duration returns 0 instead of the available 200 baseline.

The one-month and unavailable-duration branches explicitly return zero before finding a baseline. The SD comparison also requires matching plan families, but the name fallback does not normalize duration suffixes such as `1M` and `6M`.

Impact: helper output disagrees with its tests. No direct `oneMonthRate` usage was found in TSX components, so a visible pricing error was not established. This does not demonstrate an incorrect payment amount.

Recommendation: define the baseline contract for unavailable durations; preserve the one-month baseline where appropriate. Prefer explicit `plan_family` values for comparisons and verify duration-name normalization without comparing unrelated packs.

### 4. Medium: admin read tests return 503 and need isolated persistence fixtures

Location: `tests/adminAccess.test.ts:69` and admin/order list controller read paths.

Both root and approved-admin read tests fail with 503. The tests mock older in-memory/shared-store interfaces, while current controllers use paginated persistence readers such as `paymentPage` and `customerDirectoryPage`. The tests do not isolate these newer dependencies. The failures reproduce in the focused run.

Impact: these tests do not currently prove successful authorized reads. The result is not evidence of an authorization bypass or proof that deployed administrators receive 503.

Recommendation: mock the current pagination/persistence boundary and exercise each reader with explicit fixtures; separately verify the deployed read paths with a legitimate admin session.

### 5. Low: ten failures reflect outdated UI/operator expectations

| File | Failures | Mismatch |
|---|---:|---|
| `tests/copyLocalization.test.tsx` | 4 | Requires `[FILL IN]` and draft text after actual business details/effective-date copy were supplied |
| `tests/serviceDesign.test.tsx` | 2 | Requires `[FILL IN]` in an ID guide that now has an illustration and caption |
| `tests/navigationContent.test.tsx` | 3 | Requires combined Dish TV/D2H behavior; current operator identities and top-up links are separate |
| `tests/navigationContent.test.tsx` | 1 | Requires `/500`; current error recovery intentionally preserves origin through `/500?retry=%2Fplans` |

Recommendation: update tests to assert the current supported behavior. Do not restore placeholders or remove useful retry information to make tests pass.

### 6. Low: one additional lookup test expects obsolete operator inference

Location: `tests/customerDthLookup.test.ts:66`, `src/lib/dthLookup.ts`, `src/types.ts`.

The test expects a Dish TV selection to become D2H based on ID digits. Current `lookupOperatorId` preserves the explicitly selected operator and maps the separate D2H selection to `videocon_d2h`.

Recommendation: update the test to cover separate operators and reject accidental cross-operator inference. This is distinct from the confirmed concurrency defect above.

### 7. Low: AI fallback test timed out only in the full run

Location: `tests/aiCopyFallback.test.ts:6`.

The English case exceeded its 5-second timeout in the full run. Both language cases passed in the focused rerun. The test dynamically imports the controller and does not mock the persistence-backed AI limiter.

Impact: intermittent or environment-dependent test execution; a production AI failure was not established.

Recommendation: isolate the rate limiter/persistence dependencies and inspect import/setup cost before increasing timeouts.

## Build warnings

1. Client JavaScript bundle: **2,705.65 kB minified / 737.94 kB gzip**, above the 500 kB warning threshold. This is a performance risk on slower connections; user-visible load time was not measured. Consider route-level lazy loading and splitting large optional features.
2. The CommonJS server bundle includes `import.meta.env` from `src/lib/planCatalogService.ts:1003`. esbuild warns that `import.meta` is empty in CJS. The referenced use is a development helper; no runtime crash was demonstrated. Avoid pulling browser-only service code into the server dependency graph, or isolate this environment check appropriately.

## Coverage limits and follow-up

- No interactive browser, mobile layout, keyboard, screen-reader, or console/network review was performed in this pass. React server-render tests cover some markup, not full browser interactions.
- The companion-page snapshot provided no page or document session to inspect.
- No real sign-in, live payment, refund, operator recharge, paid lookup, email delivery, or external AI request was intentionally performed. Provider credentials, production configuration and deployment availability were not certified.
- Two tests were reported skipped. Additionally, Firestore rule tests condition live emulator assertions on emulator availability; ordinary suite success must not be treated as proof of emulator-backed rule coverage. Run the configured `npm run test:emulator` in an isolated emulator environment.
- No dependency vulnerability audit, penetration test, or legal-content verification was performed.

Recommended order: fix the lookup race; align localization structure; resolve savings-helper contract/data normalization; repair stale test fixtures and expectations; repeat the full checks; then perform authenticated browser and isolated integration testing.
