# Admin revocation correction

User-reported follow-up: “Failed to revoke admin access” when using the user action in the administrator directory. No new QA ID supplied.

## Findings and fix

The UI discarded non-success API responses and closed the confirmation dialog before the request finished, hiding the actual failure. The server also required an Auth email lookup before revoking an already-listed registry record, so deleted Auth accounts or changed emails could prevent revocation.

- The client sends the listed registry UID and email. The server treats these as untrusted input: a verified root administrator is still required, and a Firestore transaction checks the stored record/email binding before changing status. Missing/stale records return explicit 404/409 errors. Root email and caller UID remain protected.
- Revocation no longer depends on the target Auth account existing when the registry UID is supplied. An email-only compatibility path remains for older clients, with a specific missing-account error.
- Already-revoked records succeed without another registry write. A successful change records who revoked access and when. Local cached status is updated only after the authoritative registry operation succeeds.
- The dialog stays open on failure, shows the server error and allows retry. Repeated clicks are blocked while the request is pending, and success is shown only for an affirmative successful response. Non-JSON responses and connection errors are handled.
- Replaced the trash icon with an access icon and added explicit copy: this revokes administrator access while preserving the user account and data. Actual account deletion was not added.

## Files changed

- `server/controllers/adminController.ts`: transactional, UID-bound revocation and specific failures.
- `server/middleware/validation.ts`: normalize email and validate optional UID.
- `src/components/Admin/tabs/ApprovalsTab.tsx`: accurate errors, pending/retry behavior and clear action wording.
- `tests/adminRevocation.test.ts`: nine mocked server cases, including stale accounts, duplicate calls, denied principals, root protection, stale/missing records and registry failure.
- `tests/adminRevocationUI.test.tsx`: four UI-handler cases for UID submission, server-error display, double clicks and non-JSON responses.
- `tests/adminAccessValidation.test.ts`: normalized email and invalid UID coverage.

## Verification and limits

Lint, explicit type-check, build and whitespace checks passed. Sixteen targeted tests passed. Full suite: **242 passed, 3 failed**. The same pre-existing `calculateSavings.test.ts` failures remain at lines 97, 128 and 142. Existing bundle-size and CommonJS/import.meta warnings remain.

No real account, permission registry, production data or payment was changed during verification. Tests mock Firebase and persistence. No Firestore rules were loosened or changed, and nothing was deployed. Interactive browser verification and an authenticated live revocation were not performed.

The generic message alone does not establish which error occurred in the user's previous request. Credential/IAM problems still require a valid server setup; the new UI exposes the actionable server response instead of hiding it. The protected root account intentionally cannot be revoked.

Restart `npm run dev` to load the server changes, refresh the administrator list, then retry the intended revocation. Keep the original shell's server credential environment when restarting.
