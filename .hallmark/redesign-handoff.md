# DTH Tamizhan redesign

Full application redesign completed 10 November 2026. Application source, routes and service wiring remain in place. No route or source file was deleted. The approved direction was a restrained utilitarian service app, preserving operator branding, bilingual support and functionality.

## What changed

- Shared brand-adapted Dose system: warm neutral canvas, paper surfaces, restrained red action color, existing operator colors for identification, existing Plus Jakarta Sans and Noto Sans Tamil.
- Recharge is a compact operator/subscriber workbench followed by direct pack choices and checkout. Promotional gradient, nested framing and emoji pack labels removed. Supplied operator photographs and logos retained; missing images fall back to text rather than invented artwork.
- Plans separate filters and results, use readable metadata and untruncated names, and share clear comparison/selection treatments.
- Saved connections and security information use flat account facts and readable mobile layouts.
- All eight admin tabs share a desktop work rail, compact summaries and working records. Phone tables become labeled records, with the underlying fields and actions preserved.
- Nine modal/compare surfaces share readable light surfaces, reachable scrolling bodies, consistent actions and the existing accessible-modal hook. Payment methods stack on phones; receipt details and import/export stages are flatter and easier to scan.
- Focus-visible styling, reduced-motion behavior, semantic color/font tokens and disabled states are shared across the app. `design.md` records the system.

## Validation

- `npm run lint`: passed.
- `npm run build`: passed. Existing large-client-chunk and server CommonJS `import.meta` warnings remain.
- `npm run test:unit`: 47 tests passed across three files.
- `git diff --check`: passed after whitespace cleanup.
- Hallmark final static/render sweep: **0 FAIL, 0 open REFLEX, 1 WAIVED, 1 WARN, 1 ANSWERED, 2 DISMISSED** across 35 source files and five application URLs. Before: 223 FAIL, 4 REFLEX. These are scanner occurrences, not unique product defects.
- Gate 39b waiver: the named operator-logo choice buttons intentionally exceed toolbar height so providers remain recognizable. They retain large hit targets.
- One remaining raw `kept` warning is dismissed by source inspection: `4128945612333` is the recorder concatenating the sample smart-card number with repeated step numerals. Removing duplicate step numerals changes this artificial string, not an actual customer ID or figure. The sample card remains unchanged.
- Recorded preservation check: links 3/3, fields 7/7, handlers 227/227. Four headings were tightened on record. JSX/dynamic coverage is incomplete, so these are the recorder's counts, not a claim that the app has only seven fields.
- Customer pages captured at 375, 1280, 1440 and 1920 widths. All eight admin tabs captured at desktop and phone sizes using the actual components with explicitly labeled local fixture data. Nine dialog surfaces captured at desktop and phone sizes with network mutations and submission actions blocked.
- Admin review: six named findings resolved in confirming captures. Dialog review: five resolved. Independent finish review: **ship**, two findings resolved, none unresolved.

## Copy changes

- “All-in-One DTH Recharge Platform” → “Recharge your DTH connection”: replaces a generic opener with the actual task.
- Duplicate step numbers (“1 1.”, “2 2.”, “3 3.” in rendered headings) → one number per step; labels otherwise retained.
- Emoji/capitalized pack labels → “Recommended HD”, “Recommended SD”, “Flexible top-up”.
- Functional labels now use sentence case and normal tracking. Excel tabs/actions are shorter; the changes are visible in the source diff. Legal/disclaimer copy, prices, names and actual record data are retained.

## Review artifacts

- `compare.html`: customer before/after comparison.
- `redesign-final-render.txt`: raw final Hallmark output.
- `admin-visual-review.md`, `dialog-visual-review.md`: findings, captures and resolution scores.
- `finish-review.md`, `finish-review-score.md`: independent review and confirming score.
- `preview.html` / `preview.tsx`, `dialog-preview.html` / `dialog-preview.tsx`: local-only inert visual fixtures outside the app entry/build. No authentication bypass was added.

## Limits and material

Authenticated backend operations, real payments, booking submission and production deployment were not exercised. Admin/dialog fixtures validate layout, not service integration. Tall phone dialogs show an internal scrollport; full-page screenshots do not imply that every internal scroll position was visually inspected. The existing UPI view still uses a generic QR icon rather than a server-issued payment QR; that integration was outside this design change and must not be treated as a verified scannable payment flow.

No new imagery slots or replacement stock photography were introduced. The most useful further material is representative non-production admin data and verified payment-provider QR/status responses for end-to-end service testing.
