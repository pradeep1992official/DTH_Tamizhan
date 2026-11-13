# Compact header and footer

Footer line adjustment: `src/workspace.css` removes the two internal navigation dividers and link underlines, and reduces link-row padding. Keyboard focus outlines remain visible; shared policy-link styling on other pages is unchanged. Lint, type-check, build and whitespace checks passed. Full tests remain 216 passed with the same three pre-existing savings failures. This CSS-only presentation change adds no tests; interactive visual verification remains outstanding.

Latest user adjustment: `src/App.tsx` now shows policy links only in the selected language (English by default; Tamil when selected). Removed the footer's SupportDetails block and unused support-grid styles from `src/workspace.css`. Business details and explicit placeholders remain on the linked policy/support pages. This supersedes the earlier simultaneous bilingual footer/support layout described below. Lint, explicit type-check and build passed again; the full suite remains 216 passed and the same three unrelated savings failures. No new tests were added for this small presentation adjustment; browser visual checks remain unperformed.

User-requested layout simplification; no new QA ID assigned.

## Files and changes

- `src/components/Header.tsx`: removed the extra policy-link row and duplicate desktop/mobile Admin navigation buttons. Primary navigation retains Recharge, Browse Packs and Saved Boxes. Admin remains in the account dropdown. Removed the dropdown's redundant manual history push so its existing router handler handles navigation once.
- `src/App.tsx`: simplified the footer to brand, support details, bilingual policy links and the trademark disclaimer. Removed the version badge, repeated tagline, duplicate admin shortcut and decorative made-with-love row.
- `src/workspace.css`: compact footer spacing and type, two-column support details, wrapping policy links, and a stacked mobile layout. Removed the unused mobile admin grid rule.

QA-07 support/policy destinations and English/Tamil footer links remain available. Business details retain their existing explicit placeholders. QA-13 account names and keyboard focus behavior remain; QA-14 mobile primary navigation retains its three-column layout.

## Verification

- Lint, explicit TypeScript check, build and `git diff --check` passed.
- Existing suite: 216 tests passed; the same three unrelated `calculateSavings.test.ts` failures remain at lines 97, 128 and 142 (oneMonthRate returns zero instead of 300/200/200).
- Existing trust-content tests pass, including bilingual policy destinations and support placeholders. No new tests were added for this reversible presentation change.
- Build retains the existing large-bundle and CommonJS/import.meta warnings.
- Interactive browser/viewport verification was not performed. No deployment, production-data changes or payment actions occurred.
