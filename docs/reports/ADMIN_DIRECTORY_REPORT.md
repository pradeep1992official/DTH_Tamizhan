# Duplicate root administrator display

The reported two rows have the same root email but different names and approval dates. The directory previously rendered every approved Firestore `/admins` document as a separate row. This indicates duplicate directory entries; it does not establish two Firebase Authentication accounts. A legacy document alongside a canonical Firebase-UID document is the likely explanation, but the live document IDs were not inspected.

## Correction

- `server/controllers/adminController.ts`: the admin-list response displays the fixed root identity once, preferring the document whose ID matches the verified root caller's UID. If no canonical root record is present, one existing legacy root row remains visible. Non-root entries and authorization policy are unchanged. Duplicate records are not merged or deleted.
- `tests/adminAccess.test.ts`: mocked registry listing now exercises duplicate root entries, canonical UID preference, the legacy-only case and delegated visibility limited to the caller's UID. Asserts no persistence writes.

No new QA ID was assigned to this follow-up.

## Verification and limits

Lint, explicit type-check, build and whitespace checks passed. All 14 targeted admin-access tests passed. Full suite: **245 passed, 3 failed**; the same pre-existing `calculateSavings.test.ts` failures remain at lines 97, 128 and 142. Existing build warnings remain for bundle size and CommonJS/import.meta development-preview code.

No Firebase account, registry document, production data or payment was changed. No rules change, migration or deployment occurred. The underlying duplicate documents remain stored, consistent with the instruction not to modify/delete production data. Their exact origin and live browser output remain unverified.

Restart the local backend with `npm run dev`, then refresh the administrator directory to load this server-side display correction.
