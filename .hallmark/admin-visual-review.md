# Admin visual review — local fixtures

Reviewed 10 November 2026. Capture tool: Hallmark `scripts/capture.mjs`, desktop 1440 × 900 and phone 390 × 844, full-page, device scale 1. All 16 screenshots in `.hallmark/admin-shots` were opened with `view_image` and inspected.

These images show the actual exported admin tab components with clearly labeled local sample props. They do not show a real authenticated administrative session. The surrounding shell uses the implementation's shared CSS classes and guest Header. The fixtures never create or impersonate an authenticated user; all actions are inert and network mutation methods are blocked.

## Verdict

**Confirmed after fixes: 6 findings resolved.** The initial review found phone table squeezing, audit-trail compression and a wrapped toolbar label. The confirming capture below verifies those named issues are resolved for the sampled fixture data. Desktop hierarchy, contrast and navigation are coherent across all eight initial screenshots. Authenticated behavior and the limitations below remain outside this visual sign-off.

## Findings

1. **High — Recharges phone table is unreadable.** `src/components/Admin/tabs/RechargesTab.tsx:145` and `src/admin.css:98`. Five visible columns share about 342px. Order IDs, customer names, status pills and the primary Credit Box action break into two- to four-character fragments. Prefer a stacked phone order row that puts identity first, amount/status second and actions last. A deliberate minimum table width with horizontal scrolling is an acceptable interim correction; do not conceal overflow or allow arbitrary midword wrapping. Desktop table is readable.

2. **High — Approvals phone table breaks role and dates.** `src/components/Admin/tabs/ApprovalsTab.tsx:291` and `src/admin.css:98`. The Administrator badge splits into multiple lines, Authorized Date breaks within words, and the date itself is fragmented. Stack administrator detail with role/date below at phone widths, or give the table deliberate column minimums and scrolling. Preserve full email and role information. Desktop approval sections are readable.

3. **Medium — Payments phone status and amount headers split.** `src/components/Admin/tabs/PaymentsTab.tsx:111`, `:138`, and `src/admin.css:98`. The paid status appears as `pai` / `d`; Amount and Status headings split midword. Keep status pills and amounts unbroken, reserve their minimum width, and allow the transaction/customer columns to wrap at meaningful separators. Desktop payment ledger and summary are clear.

4. **Medium — Customers and Packs phone Actions header splits.** `src/components/Admin/tabs/CustomersTab.tsx:238`, `src/components/Admin/tabs/PacksTab.tsx:281`, and `src/admin.css:98`. Actions breaks into `Actio` / `ns` or `Action` / `s`. Keep action-column heading nowrap and give the column enough width. The customer identity and balance fields themselves remain understandable. Pack names and prices are also readable.

5. **Medium — Phone audit trail squeezes event text beside metadata.** `src/components/Admin/tabs/ReportsTab.tsx:108`, `:129`, and `src/admin.css:102`. Date/by metadata retains a right column that leaves approximately 120px for the actual event. Plan names and descriptions become tall narrow text blocks. At phone widths, stack event body over date/by metadata; preserve the compact row alignment on desktop. Summary figures remain readable at both sizes.

6. **Low — Desktop Operators refresh label wraps.** `src/components/Admin/tabs/OperatorsTab.tsx:129`. Refresh Status occupies two lines while the rest of the toolbar is single-line. Give this control `white-space: nowrap` and prevent shrinking. No layout failure is visible on phone operator rows.

## Screen coverage

| Screen | Desktop | Phone |
| --- | --- | --- |
| Customers | Readable hierarchy and records | Actions header wraps midword; record body otherwise clear |
| Pending orders | Clear queue/action hierarchy | Readable; no overlapping content found |
| Recharges | Readable ledger | Major column squeezing and fragmented action/status text |
| Packs | Readable catalog | Actions header midword break; other primary data readable |
| Payments | Clear summaries and ledger | Status/column-heading fragmentation |
| Reports | Clear summary and event list | Event description squeezed beside metadata |
| Operators | Clear aligned service rows | Readable stacked rows; desktop refresh wrap is minor |
| Approvals | Clear requests/list separation | Role/date/identity fragmentation in table |

## What is intentionally not a defect

- Phone customer navigation and admin destination rails overflow horizontally inside their own scrollable regions. They are not document-width overflow, and the visible next item indicates more destinations.
- Unused space beneath a two-record fixture is sample-data volume, not a reason to add padding, claims or synthetic records to the product.
- Fixture metrics, names, phone/card numbers, dates and amounts are explicitly sample data, not live business proof.
- No contrast failure was apparent by eye in the current captures. This is not a numeric WCAG contrast certification.

## Limits

No authenticated API loading, real permission gating, super-admin grant form, real mutation result, modal-open state, keyboard journey, Tamil rendering, alternate operator accent, error/loading state, or long real-data stress case is signed off by these screenshots. The preview uses `user={null}` for approvals, so its super-admin-only grant controls are correctly absent. Source behavior and application tests must cover those areas separately. No application source was changed during this review.

## Confirming capture and scoring

One confirming round was run after the root agent's fixes, using the same local fixture data, the same Hallmark capture tool, full-page output and device scale 1. Seven screenshots were written to `.hallmark/admin-shots-confirm`: Customers, Recharges, Packs, Payments, Reports and Approvals at phone size; Operators at desktop size. All seven were opened and inspected with `view_image`. Capture log: `.hallmark/admin-confirm-capture.txt`.

| Initial finding | Score | Confirming evidence |
| --- | --- | --- |
| 1. Recharges phone squeezing | Resolved | The records now use a labeled phone grid. Order identity, customer/card, pack validity, amount, payment, status and actions have readable measures. Pending/completed and Credit Box stay unbroken. |
| 2. Approvals phone role/date fragmentation | Resolved | Administrator identity, role and authorization date stack into clear labeled fields. Administrator and the date remain whole. |
| 3. Payments phone status fragmentation | Resolved | Transaction records use labeled fields; paid appears unbroken, and amount/status labels no longer split. |
| 4. Customers/Packs phone Actions heading | Resolved | Actions is now a whole field label in both record layouts; customer/plan details have readable widths. |
| 5. Reports phone event compression | Resolved | Each event body spans the available measure, with time/by metadata below. Plan names and descriptions no longer squeeze beside a fixed right column. |
| 6. Operators desktop Refresh Status wrap | Resolved | Refresh Status fits on a single line with its icon, without displacing the heading. |

No partial or unresolved findings remain from this review's six-item set. This scoring is limited to the named corrections and sampled states, not a second independent whole-app review.
