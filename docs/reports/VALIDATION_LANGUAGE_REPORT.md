# Subscriber message language

User-requested follow-up to QA-01/QA-17: subscriber validation messages and help now use the selected language only, instead of combining English and Tamil.

Files changed:
- `src/lib/subscriberValidation.ts`: language-aware error/help text, including operator labels, lengths and prefix guidance. Server calls default to English; validation rules are unchanged.
- `src/components/SavedConnections.tsx`: localized saved-box warnings and Add/Edit help/errors. Displayed Add/Edit ID errors use the current language at render time.
- `src/components/RechargeFlow.tsx`, `src/components/PaymentModal.tsx`, `src/components/BrowsePlans/ApplyPlanModal.tsx`: pass the selected language for subscriber messages.
- `tests/subscriberValidation.test.ts`: replace the previous bilingual expectation with checks for separate English/Tamil output, translated length guidance, prefix guidance and valid-ID acceptance.

Verification: lint, explicit type-check, production build and whitespace checks passed. Full suite: 216 passed; the same three unrelated calculateSavings failures remain at lines 97, 128 and 142. Build retains the existing large-bundle and CommonJS/import.meta warnings. Interactive browser checks were not performed. No payment, production data change or deployment occurred.
