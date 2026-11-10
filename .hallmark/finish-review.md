fix

1. Floor 49a — Payment method buttons wrap into two and three lines on the phone (`.hallmark/dialog-shots/dialog--hallmark-dialog-preview-html-screen-payment-phone.png`; `src/components/PaymentModal.tsx:301`). Use a single-column or scrollable method selector on phones so each complete method name remains on one line; retain the existing labels.
2. Plain defect — The selected SD 6M duration is an empty grey block on both recharge captures, obscuring which validity is selected (`.hallmark/shots/localhost-3011-1440-full.png`, `.hallmark/shots/localhost-3011-375.png`; shared disabled rule `src/workspace.css:8`). Give the unavailable selected duration a readable paired foreground and background instead of combining the selected treatment with global disabled fading.

Theme/idea: The brand-adapted Dose stamp describes this app: calm paper surfaces, exact field labels, restrained operator identities, and a clear operator-to-pack workbench. No wholesale gap.

Before comparison: The old recharge page kept the selected SD 6M label legible and showed all three customer destinations within the phone width. The redesigned horizontal navigation is an explicit project choice; its clipped third destination is discoverable by scrolling and is not a finding.

Scope: Reviewed the supplied customer desktop/full-page and phone routes, local-fixture populated admin screens and phone dialogs. Existing known admin table/report and comparison/Excel/refresh/installation issues are already assigned and omitted here. Backend payment/auth was not tested. The tall dialogs are bounded scrolling surfaces; offscreen receipt/payment content alone is not a defect.

Do not dilute the clear subscriber input, real operator assets, quiet surface hierarchy, or task-first recharge sequence while fixing.
