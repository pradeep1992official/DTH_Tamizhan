# Approved-admin navigation

User-reported follow-up: a newly approved administrator could not find Admin Panel in the account dropdown. No new QA ID supplied.

## Cause and files changed

- `src/components/Header.tsx`: the dropdown previously called `isUserAdmin(user)` without an approved-admin list. That helper recognized only the fixed root email in this call, so delegated administrators were hidden. The dropdown now shows its Admin Console entry only after the server confirms approval for the current UID. It rechecks when opened and offers localized checking/error/retry feedback. Closing the menu clears its result and cancels/ignores pending work. The link retains the existing router callback and localized label.
- `src/lib/adminNavigationAccess.ts`: waits for Firebase auth restoration, checks that the Firebase user matches the displayed UID, sends an ID token to the existing `/api/admin/verify-token`, and verifies the authenticated/approved response UID. It checks the current identity again before accepting a response. Local profile roles and email allowlists do not grant navigation.
- `tests/adminNavigationAccess.test.ts`: ten cases for approved delegates, denied/mismatched responses, absent/mismatched sessions, auth restoration, sign-out races and server failure.
- `tests/headerAdminNavigation.test.tsx`: four cases for delegated-admin menu visibility/router navigation, forged profile denial, reopening after approval and failure/cancel behavior.

The protected admin page and every API still independently enforce server authorization. This is a navigation correction, not a permission change. No Firebase rules or stored profiles were modified.

## Verification and limits

Lint, explicit type-check, build and whitespace checks passed. All 14 targeted tests passed. Full suite: **269 passed, 3 failed**; the same existing `calculateSavings.test.ts` failures remain at lines 97, 128 and 142. Existing large-bundle and CommonJS/import.meta warnings remain.

Tests use mocked Firebase, HTTP responses and React effects. An interactive browser session as the actual new administrator was not exercised. No real account, permission registry, production data or payment was modified, and nothing was deployed.

Refresh the new administrator's page, then open Account → Admin Console. An already signed-in user can close and reopen the menu after approval to refresh the server verdict without signing out. If verification fails, use Retry access check; the menu does not silently treat a server outage as authorization.
