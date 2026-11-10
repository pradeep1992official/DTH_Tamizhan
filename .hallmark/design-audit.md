# DTH Tamizhan — Hallmark design audit

Audited 10 November 2026. Mode: audit only. Genre: modern-minimal (inferred), scope: app. No application source changed. Existing uncommitted work was left intact.

## Read

The product helps Tamil- and English-speaking customers recharge DTH connections, compare packs and manage saved boxes; staff manage subscribers, orders and catalog records.

Keep the recognizable operator logos, bilingual typography, capped layout, explicit recharge steps, plan comparison, empty-state actions and existing modal focus-management hook.

The strongest template tells are saturated promotional panels, repeated rounded/bordered surfaces, tracked uppercase labels, icon coins, multiple competing accent treatments and hardcoded styles bypassing the operator theme.

The most consequential defects are conflicting plan durations, a booking confirmation without submission, a hardcoded success metric, low-contrast supporting text and mobile layouts that squeeze labels and tables.

## Pre-flight and coverage

- Framework: React 19, Vite 8, Tailwind 4, React Router 7 (`package.json:24`, `src/App.tsx:448`).
- Typography: Plus Jakarta Sans, Noto Sans Tamil and JetBrains Mono (`src/index.css:4`, `index.html:14`). Literal font stacks are repeated outside the theme block (`src/index.css:11`, `src/index.css:21`).
- Palette: operator-specific theme objects (`src/lib/theme.ts:4`), but many JSX literals and stock palette classes bypass them.
- Container: centered `max-w-7xl` shell (`src/App.tsx:446`), worth retaining.
- No root design.md found. Audit introduces no replacement theme or system.
- Static scan: all 30 CSS/TSX files recognized by Hallmark under src. Supporting theme, catalog, data and modal-hook source reviewed manually.
- Routes: `/` and `/recharge` share RechargeFlow; `/plans`, `/connections`, `/security`; `/admin` and eight `/admin/:tab` screens. `/worker` and `/dealer` redirect to pending orders. Unknown paths redirect home (`src/App.tsx:449–534`).
- Screenshot attempts: initial port 3000 captures were blank and are rejected as evidence. A fresh server on port 3011 rendered correctly. Customer routes were captured through Hallmark at 375, 1280, 1440 and 1920 widths. Admin captures show the access gate, not authenticated tab contents. Admin tabs and modal flows are source-reviewed, not visually signed off. Tamil mode, alternate operator themes, authenticated/full-data states and keyboard journeys need a subsequent interactive verification.

## Prioritized findings

| Priority / tier | Evidence | Impact and lightest correction |
| --- | --- | --- |
| Critical / Floor, honesty | `src/components/RechargeFlow.tsx:202`, `:661`, `:683`, `:1119` | Missing-duration recommendation falls back to any recommended HD/SD plan. Screenshot shows ₹259 / 6M and 180 days while summary says HD Pack / 1M. Render every duration and price from the chosen plan; unavailable durations should be disabled or explicitly unavailable. Targeted state/logic fix, not a redesign. |
| Critical / Floor 70 | `src/components/NewConnectionModal.tsx:37` | Booking handler creates a random ID and sets success without a network request. Connect a real booking endpoint or clearly label the form as unconnected and withhold success. |
| High / Floor 46a | `src/components/Admin/tabs/PaymentsTab.tsx:61` | Gateway success rate is hardcoded to 99.8%. Calculate from a defined transaction population and period, or remove it. Existing claim requires owner verification. |
| High / access | `src/components/BrowsePlans/BrowsePlansView.tsx:209`, `:250`; `src/components/BrowsePlans/PlanCard.tsx:124` | Desktop and mobile screenshots show very pale subtitles, result counts and colored badges against white. Conditional light/dark surfaces coexist with media-driven `dark:` text. Use semantic foreground/surface pairs tied to the same explicit theme state. Measure contrast after correction; no numeric contrast pass is claimed here. Restyle affected tokens. |
| High / Floor 26a and keyboard semantics | `src/components/Header.tsx:75`, `:156`; `src/components/NewConnectionModal.tsx:111` | Brand and installation choices are clickable divs; profile trigger removes its outline without a replacement. Use links/buttons or labeled radio controls, instant focus-visible styling and menu expanded state. Shared polish. |
| High / mobile layout | `src/components/RechargeFlow.tsx:434`; `src/components/SecurityNotice.tsx:13`, `:35` | At 375px the smart-card heading and helper text squeeze into competing columns. Security header crowds its badge; the third table column opens off-screen and long cells wrap into thin strips. Stack header/help on phones; provide a compact row/detail or disclosure treatment for the table. Targeted responsive layout changes. |
| High / data-state design | `src/components/Admin/hooks/useAdminData.ts:103`, `:137` | Customer/order fetch failures are only logged, then loading ends. Staff can mistake a failed fetch for no records or a clear queue. Provide explicit failed-load state with retry and keep empty separate from error. Applies to customers, pending and recharges. |
| Medium / modal reachability risk | `src/components/PaymentModal.tsx:184`; `src/components/NewConnectionModal.tsx:63`; `src/components/ReceiptModal.tsx:57` | Tall fixed centered dialogs lack the bounded scroll-body pattern already present in the Excel modal. At short viewport heights or with the keyboard open, actions may be unreachable. Add viewport cap and internal scroll; verify on a phone. Source risk, not a captured modal failure. |
| Medium / Floor 10a and 27 | `.hallmark/before.txt`; `src/components/SignalRefreshModal.tsx:247` | Static scan finds 81 transition-all occurrences; refresh progress also transitions width. Animation utilities/Motion lack a consistent reduced-motion policy. Name transition properties, use transform for progress and honor reduced motion centrally. Polish. |
| Medium / Floor 48 and 67 | `src/index.css:11`; `src/components/AdminPortal.tsx:216`; `src/components/BrowsePlans/PlanFilterSidebar.tsx:109` | Literal colors, repeated font stacks and uppercase/tracked functional labels weaken consistency and readability. Move values into semantic theme tokens; use sentence case and normal tracking. Preserve real operator identity. Restyle. |
| Medium / Floor 34 and 50, manual additions | `src/index.css:10` | No global overflow-x: clip on html/body or display-heading wrapping/min-width policy. Add these deliberately, then verify actual overflow; do not use clipping to conceal an overflowing table. |
| Low / Finish F24, F5 | `src/components/AdminPortal.tsx:145`; `src/components/BrowsePlans/BrowsePlansView.tsx:199` | Borders plus broad shadows and repeated icon coins add visual weight without helping the task. Prefer restrained edges or elevation and inline icons. Polish. |

## Every page

| Screen | What works | Specific audit finding / action |
| --- | --- | --- |
| `/`, `/recharge` | Operator logos, numbered sequence, visible selected state | Resolve duration contradiction first. Stack smart-card helper text on mobile. Reduce banner/shadow weight; selected, unavailable and actionable pack states need clearer distinction. `RechargeFlow.tsx:202`, `:306`, `:434`, `:739`. |
| `/plans` | Useful search, filters, comparison and price hierarchy; mobile filter disclosure | Fix pale secondary text and badges. Avoid duplicating operator filtering in banner and sidebar; allow full plan names at desktop instead of single-line truncation. `BrowsePlansView.tsx:215`, `:307`; `PlanCard.tsx:152`; `PlanFilterSidebar.tsx:109`. |
| `/connections` | Empty state gives a clear add action | Empty screenshot is understandable. Filled cards add nested stats panels and tracked-capital metadata; simplify containment and distinguish destructive actions. `SavedConnections.tsx:148`, `:180`, `:239`. Filled state is source-only. |
| `/security` | Structured threat categories | Hardcoded dark surface breaks light-theme consistency; technical copy is poorly suited to a customer reassurance page. Mobile table and badge need recomposition. Keep claims as unverified owner material; this is not a security audit. `SecurityNotice.tsx:12`, `:19`, `:29`, `:35`. |
| `/admin`, `/admin/customers` | Searchable subscriber table, add/delete dialogs | Explicit load failure and recovery needed; status/quality labels rely on small colored badges; mobile table needs prioritized columns/detail. `CustomersTab.tsx:238`, `:283`; data hook `:103`. |
| `/admin/pending` | Queue-clear state and actionable orders | Console-only load failures must not look like an empty queue. Cards split at three columns and repeat full framed surfaces; an operator-grouped queue would scan better. `PendingOrdersTab.tsx:98`, `:101`, `:111`. |
| `/admin/recharges` | Search, filters and order table | Fixed 280px filter minimum plus surrounding padding risks phone overflow. Prioritize ID, amount and status with expandable details. `RechargesTab.tsx:82`, `:140`, `:170`. |
| `/admin/packs` | Data table, explicit catalog alert, editor and deletion confirmation | Improve mobile table detail, normal-case metadata and editor density; reuse the operator theme consistently. `PacksTab.tsx:261`, `:281`, `:315`, `:398`. |
| `/admin/payments` | Searchable ledger, total volume and count | Remove/calibrate hardcoded success rate. Filter row repeats phone overflow risk; metrics should state filtered scope. `PaymentsTab.tsx:45`, `:61`, `:69`, `:113`. |
| `/admin/reports` | Actual summary inputs and audit trail | Four stat cards compete with the operational audit record. Use a compact summary row, tabular numerals and a clearer event list; drop mono for prose metadata. `ReportsTab.tsx:42`, `:87`, `:128`. |
| `/admin/operators` | Clear operator state and management actions | Repeated icon tiles/cards make comparison harder; consider aligned rows for provider, state and action. Remove uppercase field labels; ensure state is conveyed in text. `OperatorsTab.tsx:138`, `:150`, `:162`, `:243`. |
| `/admin/approvals` | Grant form, requests and admin list are separated | 10px RBAC badge and small status labels are difficult to read. Increase label size, remove tracking and give revoke action a clear warning hierarchy. `ApprovalsTab.tsx:166`, `:210`, `:291`, `:363`. |

Admin shell: keep the route-backed tab navigation. Make horizontal overflow discoverable rather than hiding its scrollbar; apply current-page semantics and visible keyboard focus (`AdminPortal.tsx:234`, `:242`). Do not replace the authenticated screen with invented data for audit screenshots.

## Modal and secondary surfaces

- Auth: existing accessible-modal hook and labeled close control are good. Increase small explanatory copy and keep focus styling consistent (`AuthModal.tsx:130`, `:151`, `:170`).
- Payment: hardcoded dark palette does not follow selected light operator; add bounded scrolling, persistent summary and clearly differentiated processing/error states (`PaymentModal.tsx:184`, `:258`, `:419`).
- Receipt: retain identifiers and dates; flatten nested framed sections, improve reading/print contrast and verify a short-screen scroll path (`ReceiptModal.tsx:94`, `:111`). Print output not visually tested.
- Signal refresh: replace width transition, normal-case labels and preserve explicit progress/failure states (`SignalRefreshModal.tsx:147`, `:247`).
- New connection: fix fake success first; native radio choices, stacked mobile offers and scroll-safe body next (`NewConnectionModal.tsx:37`, `:102`, `:111`).
- Apply plan: retain named dialog/focus trap; align connection selection, empty state and confirmation styling with the customer theme (`BrowsePlans/ApplyPlanModal.tsx:187`).
- Compare drawer/table: preserve comparison capability; clarify selected count/removal and prioritize phone rows rather than forcing a full matrix (`BrowsePlans/CompareDrawer.tsx:38`, `BrowsePlans/ComparisonTable.tsx:98`).
- Excel import/export: bounded scrolling is a useful pattern to reuse. Too many framed stages, colors and long tab labels weaken the primary import/review action (`ExcelPlanImportExportModal.tsx:223`, `:272`, `:315`, `:498`).

## Mechanical results and judgement

The initial static scan reports **306 FAIL, 31 REFLEX, 49 WARN** across 30 files. These are occurrences, not 306 separate design defects or a usability score. See before.txt for raw evidence; the fresh render log may add viewport findings. Static parsing of JSX is incomplete: it recorded zero static fields despite actual inputs, misses some semantic failures and does not settle runtime theme contrast. Its triangle/play glyph flag in BrandAssets is not sufficient evidence of an emoji defect. Mono on actual IDs, monetary amounts and dates is appropriate; the 31 mono flags require that distinction. Stock Tailwind palette warnings identify an existing system, not by themselves a reason to replace the brand. Blur on a modal scrim is lower priority than reading contrast and reachability. Long-button-label warnings require width checks, not blanket nowrap.

Judged app gates: retain restrained, useful state feedback; current accent footprint and multiple filled button colors compete, especially on recharge. Card nesting is visually confirmed in plan details. Page-anatomy, marketing hero, screen word-count and section-rhythm rules are inapplicable to these working screens. Screenshots are evidence of sampled default states only; blank captures are not passes. No whole-site accessibility, contrast or responsive pass is claimed.

### Final rendered results

Completed scan: **342 FAIL, 33 REFLEX, 59 WARN** across 30 source files and five rendered URLs. This includes raw static occurrences and additional runtime/viewport findings; it is not a count of unique user problems. Five runtime failures are Vite HMR WebSocket errors caused by the existing occupied HMR port, so they are development-environment issues, not evidence of five broken production routes. The app content rendered.

The admin access-gate screenshot confirms a nearly invisible dark heading on a dark panel (`AdminPortal.tsx:145`, `:149`). Correct inherited heading color along with the broader theme pair issue. The render tier also flags a wrapping desktop-nav label at 768px, very short plan filter controls, six font weights on recharge and four on plans. Its 104px operator-card button warning is dismissed: the complete selectable card is intentionally a large hit target. Retain that target. Gradient contrast warnings need sampling against the actual text position before treating their reported ratios as definitive. Confirmed pale text and the dark access heading remain high-priority independently of that approximation. The phone heading widow is a minor finish issue; text balancing can resolve it.

## Recommended depth

Start with targeted behavior corrections for booking, duration and payment metrics. Follow with **polish** for focus, semantics, motion and labels, then a **restyle within the current layout** to unify theme tokens and foreground/surface pairs. Only the security phone table, recharge phone heading and selected admin table/detail layouts need local recomposition. A full site redesign is not necessary to settle the highest-priority findings.

Material most useful for the next pass: a non-production authenticated admin session with representative records, verified booking/payment outcomes, and confirmed operator pack prices/durations. No new image slots or stock imagery are recommended.
