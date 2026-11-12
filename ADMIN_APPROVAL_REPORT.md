# Administrator email approval

User-reported follow-up: generic “Unable to approve this registered Firebase account” when adding a new administrator email. No new QA ID assigned.

## Findings and correction

Approval resolves an existing Firebase Authentication account before writing the UID-keyed administrator registry. An email which has never signed into this app has no target UID; it cannot be approved by this existing flow. The previous catch block hid this case and Authentication/Firestore failures behind one generic error.

- `server/controllers/adminController.ts`: separate account lookup from registry persistence. A missing account returns HTTP 404 and `ADMIN_ACCOUNT_NOT_REGISTERED`, explaining that the person must sign into this app with Google once. Authentication credentials/permissions failures return HTTP 503 and `ADMIN_AUTH_UNAVAILABLE`. Registry failures return HTTP 503 and `ADMIN_REGISTRY_UNAVAILABLE`. Private SDK error details are not exposed. Successful approval still binds to the real Firebase UID and requires the verified root administrator.
- `src/components/Admin/tabs/ApprovalsTab.tsx`: explains the first-sign-in requirement beside the form; displays failures inline; localizes the three specific failures for Tamil; keeps entered values for retry; prevents duplicate submissions; reports success and refreshes only after an affirmative successful JSON response.
- `tests/adminRevocation.test.ts`: six additional mocked approval cases for missing accounts, Auth permissions, failed registry writes, successful UID-bound approval and denied callers.
- `tests/adminRevocationUI.test.tsx`: four additional form cases covering first-sign-in guidance, retry values, Tamil errors, non-JSON failure and confirmed success.

No account was automatically created, and no Firebase account or permission record was changed during this correction. No authorization checks or Firestore rules were weakened.

## Verification

Lint, explicit type-check, build and whitespace checks passed. All 23 targeted approval/revocation tests passed. Full suite: **255 passed, 3 failed**. The same pre-existing `calculateSavings.test.ts` failures remain at lines 97, 128 and 142. Existing bundle-size and CommonJS/import.meta warnings remain.

Tests use mocked Firebase and persistence; there was no authenticated live approval, production data write, payment action or deployment. The original generic error alone cannot establish whether the reported target was missing or whether credentials/IAM failed; the updated response distinguishes these cases. Interactive browser checks remain outstanding.

Restart the local backend with `npm run dev` and refresh the page. Have the intended administrator sign in to this app with Google once, then grant access to the same email. If lookup or storage still fails, the new inline error identifies which server setup needs attention.
