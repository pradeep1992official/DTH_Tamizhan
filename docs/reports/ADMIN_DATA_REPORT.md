# Admin data corrections — QA-05 / QA-06

## QA-05: no automatic fixtures or unverified financial writes

Removed the Firestore demo seeder and its call from admin order loading. Moved the demo generator to `tests/fixtures`; its orders now use `initiated`, never `paid`. The development script no longer imports the application store or Firebase. It requires `NODE_ENV=development` and the exact interactive confirmation `EXPORT LOCAL FIXTURES`, then creates a new file under ignored `.local-fixtures/` with exclusive creation. It cannot update application JSON files or a database. The script was not run.

Removed automatic catalog seeding/migrations from admin reads and empty Firestore subscriptions/queries. New server stores and missing catalog files remain empty. Removed startup sample orders, customers, admin accounts, access requests, legacy sample-plan serving and demo saved connections. The existing explicit offline catalog preview now requires a development build and confirmation and performs no database writes. Subscriber lookup no longer synthesizes a customer when no record exists.

No application code now creates a financial order or sets its payment status to paid. Removed bulk order synchronization and the disk order writer. Fulfillment/status mutation returns 503 until trusted payment provenance exists; the previous checkout task already blocked real payments because there is no provider verifier. Browser writes to both order collections are denied, including administrators. Historical data is still read as stored; it is not retroactively proof of payment. No historical records were deleted, corrected, migrated or overwritten.

## QA-06: one admin read path

Admin section reads use authenticated server APIs only. `useAdminData.ts` has no Firestore imports, snapshots, seed calls or read-failure fallback. Orders come from `/api/admin/orders` and the existing server order store. Customers and payments derive from the same server data. Pack listing, operator listing, access listing and audit logs also use authenticated APIs. The audit-log API reads Firestore on the server after authorization; it does not fall back to browser/local data.

The hook verifies access through `/api/admin/verify-token` once per mounted user identity before section reads. It waits for Firebase auth restoration, requires the token owner to match the UI user, clears cached arrays on identity changes and ignores successful responses for a different current user. Denials and loading errors are shown in UI state rather than repeatedly logged. There is no attempt-then-fallback loop to cache or suppress.

## Permission agreement and rule changes

The portal guard uses the server verdict, not local role flags, cached email lists or the access-list contents. Every admin API read independently checks authorization. The server verifies Firebase ID tokens with revocation checking and requires verified email. The same fixed root email is used by the UI helper, server policy and rules; the old independent root-email environment overrides were removed because they disagreed with the rules.

Delegated admins must have `/admins/{Firebase UID}` with `status=approved` and an email matching their verified token. This registry, in the configured named Firestore database, is authoritative for both server authorization and rules. Local JSON/email caches no longer grant access. Approval/revocation actions resolve the real Firebase Auth UID and write this registry only after explicit verified super-admin authorization. Bulk admin synchronization was removed. Login no longer auto-creates an admin registry record; ordinary user profile writes omit privileged flag fields.

`firestore.rules` was tightened, not relaxed:

- Root and delegated admin checks require verified email; delegated records must bind the token email to the UID-keyed record.
- Browser creation, update and deletion of admin registry records is denied. Approved server actions use the Admin SDK.
- Browser creation/update/deletion of `pending_recharges` and `recharge_orders` is denied. Existing owner/admin read permissions remain; the admin UI itself uses only the server API.
- Public catalog/operator read permissions and unrelated collection access were not broadened.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for denying client financial writes and binding administrator access to verified identities and approved UID records. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

The rules are local changes only and were not deployed. Existing delegated admins represented only in local JSON or under synthetic document IDs need explicit reapproval to create the canonical UID record; no automatic production migration was attempted. The fixed root remains able to access the approval UI with a verified token.

## Files changed for this task

- `src/components/Admin/hooks/useAdminData.ts`, `src/components/AdminPortal.tsx`: API-only section reads and server-backed UI guard.
- `src/lib/adminPolicy.ts`, `src/types.ts`, `server/middleware/auth.ts`: aligned identity policy and canonical registry authorization.
- `server/controllers/adminController.ts`, `server/routes/admin.ts`: canonical approval/revocation, protected registry listing and audit-log API; remove bulk admin sync.
- `server/controllers/ordersController.ts`, `server/routes/orders.ts`: remove order import/persistence path, block unverified fulfillment and eliminate synthetic subscriber fallback.
- `firestore.rules`: stricter identity checks and denied browser financial/registry writes.
- `src/lib/seedDemoAdminData.ts`: deleted; `src/lib/demoAdminData.ts`: moved to `tests/fixtures/demoAdminData.ts` with unpaid fixtures.
- `scripts/seed-demo-admin.ts`: guarded isolated fixture export.
- `src/lib/planCatalogService.ts`, `server/models/planModel.ts`, `server/models/store.ts`: remove automatic seed behavior and startup financial/customer fixtures.
- `server/controllers/plansController.ts`, `server/routes/plans.ts`: protect admin plan reads, provide separate public catalog API and remove legacy fixture serving.
- `src/App.tsx`, `src/components/AuthModal.tsx`: remove sample-connection creation and automatic admin-registry creation.
- `.env.example`, `.gitignore`, `README.md`: remove demo runtime flag and document isolated fixture handling.
- `tests/adminAccess.test.ts`, `tests/adminData.test.ts`, `tests/catalogReadOnly.test.ts`, `tests/runtimeFixtures.test.ts`, `tests/firestore.rules.test.ts`: authorization, navigation, no-write and rules regression coverage.
- `ADMIN_DATA_REPORT.md`: this report. Earlier correction-task changes remain in the working tree.

## Verification and limits

Eighteen new focused tests pass: every admin read is exercised for the verified root and an approved delegate; ordinary, revoked, mismatched-email, unverified and logged-out principals are denied. Forged profile flags and a stale cached email allowlist do not authorize reads. Tests also verify blocked unverified fulfillment, missing-subscriber rejection and empty-store/catalog behavior without fixture writes.

A mocked hook navigation test visits every section twice, asserts authenticated GET requests only, zero Firestore reads/writes and zero console warnings/errors. Non-admin and logged-out hook tests issue no section-data requests. This is automated navigation/data-layer coverage, not a claim that the live browser console was inspected.

Additional emulator checks cover approved-admin reads, denied ordinary/revoked/logged-out collection reads, and forged paid-order writes. They were added but could not be executed here: the Firebase CLI and Java are unavailable on PATH. Existing rules tests skip live assertions without an emulator. No production console, account, Firebase project, database or payment endpoint was contacted for verification.

Lint, explicit type-check and production build pass. The build retains large-bundle and CommonJS/import.meta warnings. Full suite: 125 passed, 3 failed. The pre-existing three `calculateSavings.test.ts` failures at lines 97, 128 and 142 remain outside this correction. Interactive browser verification and live emulator validation remain outstanding. No rules were deployed and no production data was modified.
