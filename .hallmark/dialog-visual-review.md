# Dialog visual review

Reviewed 10 November 2026 using Hallmark `capture.mjs`, scale 1, full-page option, at desktop 1440 × 900 and phone 390 × 844. All 18 screenshots in `.hallmark/dialog-shots/` were opened and inspected. Source unchanged during this review.

The captures render actual application components through the local-only design fixture. Prices, names, account numbers, plan counts, completed receipt and references in these images are labeled **sample data**, not product claims or real transactions. Click and submit events are blocked, service mutation fetch methods rejected, and callback props are no-ops. No credential, payment, installation request, signal refresh, import or other write was performed.

## Initial findings

| Finding | Source | Screenshot evidence | Correction |
| --- | --- | --- | --- |
| Comparison action foreground is black on operator red, inconsistent with the accessible white-on-accent primary pattern. | `src/components/BrowsePlans/ComparisonTable.tsx` mobile select button around line 140 and desktop select button around line 245 | `dialog--hallmark-dialog-preview-html-screen-compare-desktop.png`, `...-compare-phone.png` | Add the shared `dialog-primary` treatment / accent-ink foreground to both actual buttons. Prefer the global action accent over an operator identity color. |
| Excel file-type badge is squeezed into a three-line vertical pill in the phone header, competing with the title and close button. | `src/components/ExcelPlanImportExportModal.tsx` header title/badge around line 244 | `dialog--hallmark-dialog-preview-html-screen-excel-phone.png` | Wrap the title/badge group, place the file type on a separate line, or omit the redundant badge on a narrow screen. |
| An existing installation offer is truncated to `1 Month Tamil...` on desktop. | `src/components/NewConnectionModal.tsx` offer highlight around line 151 (`line-clamp-1`) | `dialog--hallmark-dialog-preview-html-screen-installation-desktop.png` | Allow the actual offer text to wrap. The phone stacked offer already exposes it fully. |
| Four refresh operators are arranged as three plus one on phone and use five desktop grid columns, giving an unbalanced selection group. | `src/components/SignalRefreshModal.tsx` operator grid around line 150 | `dialog--hallmark-dialog-preview-html-screen-refresh-phone.png`, `...-refresh-desktop.png` | Use two phone columns and four desktop columns. |

Existing product limitation retained: the payment UPI view shows a Lucide QR icon rather than an actual payment QR payload (`PaymentModal.tsx`, UPI content). Its accompanying scan instructions cannot be validated by a design fixture. A real payment integration needs a generated, scannable provider QR; no payment architecture changes were made here.

## Confirmation scoring after fixes

The five affected screens were recaptured using the same Hallmark capture script and viewports, into `.hallmark/dialog-shots-final/`. All 10 confirmation screenshots were opened and inspected. This round scores only the existing findings and the independent reviewer's payment-method wrapping finding; it is not a new review.

| Existing finding | Score | Confirmation evidence |
| --- | --- | --- |
| Comparison action foreground | **Resolved** | Both desktop and phone Select Pack buttons now have white text on the shared red action surface. Operator labels use neutral backgrounds. `dialog--hallmark-dialog-preview-html-screen-compare-desktop.png`, `...-compare-phone.png`. |
| Excel phone file badge squeezed into vertical pill | **Resolved** | The badge now stays on one line beneath the wrapped title. The close control remains distinct. Desktop title/badge arrangement still fits. `...-excel-phone.png`, `...-excel-desktop.png`. |
| Installation offer truncation | **Resolved** | Desktop Sun Direct offer now reads the complete `1 Month Tamil Pack` over two lines. Phone remains fully readable. `...-installation-desktop.png`, `...-installation-phone.png`. |
| Refresh operator grid imbalance | **Resolved** | Four operators form a complete 2 × 2 phone grid and a single four-column desktop row. `...-refresh-phone.png`, `...-refresh-desktop.png`. |
| Independent review: payment method labels wrap excessively on phone | **Resolved** | Three methods now stack vertically on phone, each label fitting one line. Desktop retains its three-column selector. `...-payment-phone.png`, `...-payment-desktop.png`. |

Confirmation outcome: **5 resolved, 0 partial, 0 unresolved** for the named visual findings. The payment-phone screenshot for independent reviewer scoring is `.hallmark/dialog-shots-final/dialog--hallmark-dialog-preview-html-screen-payment-phone.png`.

The existing payment QR integration limitation remains outside these visual corrections and is still explicitly unverified. Internal-scrollport, language, state and interaction limits below still apply.

## Inspected coverage

| Component / fixture screen | Desktop | Phone | Observed state |
| --- | --- | --- | --- |
| Auth | Inspected | Inspected | Default Google sign-in, explanatory copy, visible close focus |
| Payment | Inspected | Inspected | Initial UPI view, price summary, receipt details, method choices and countdown |
| Receipt | Inspected | Inspected | Full sample receipt with IDs, pack details, tax rows and actions |
| Signal refresh | Inspected | Inspected | Initial prefilled card/operator selection, instructions and action |
| Installation | Inspected | Inspected | Empty form, operator offers, inclusions, disabled request action |
| Excel | Inspected | Inspected | Initial import tab, upload drop zone, template and close controls |
| Apply plan | Inspected | Inspected | Signed-out state with plan summary and sign-in action |
| Comparison | Inspected | Inspected | Two sample plans, desktop matrix and phone detail cards |
| Compare drawer | Inspected | Inspected | Two selected plans, count, clear and compare action |

The remaining default surfaces have coherent readable spacing and consistent light dialog surfaces in these sampled views. Auth fits comfortably on both widths. Receipt and payment summaries preserve price/identifier hierarchy. Mobile comparison uses detail cards rather than an off-screen matrix. The drawer presents count and action clearly on phone.

## Limits

- `fullPage` captures the document, not all content of a fixed dialog's internally scrolling viewport. Payment, receipt, installation and comparison phone images show the initial scrollport; lower content is not visually signed off by these images. Bounded scrolling exists in source, but manual scrolling/reachability was outside this capture-only task.
- The fixture label overlays a narrow strip at the bottom; this is fixture chrome, not app UI.
- Only English/default states were captured. Tamil, alternate operators, payment method changes, validation errors, processing, real successful submissions, Excel parsed previews, saved-box apply state, print/share output and real authentication were not exercised.
- Visible focus in screenshots is initial focus from the actual modal hook. A full keyboard focus-trap journey was not exercised because fixture interaction is intentionally blocked.
- No measured contrast certification or end-to-end transaction pass is implied.
