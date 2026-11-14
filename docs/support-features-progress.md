# Support feature implementation progress

Build order: 1, 2, 3B, 3, 4, 5, 6, 7, 8. Commit and push each before proceeding.

## Prompt 1
- Added strict ticket input/record schemas and atomic Firestore counter + creation transaction.
- Kept the existing token + approved-admin registry policy (no custom admin claim exists).
- Rules: owners/admins may read tickets; ALL mutations, including admin actions, go through server endpoints. This reconciles the plan's admin-update requirement with its server-only lifecycle/payment requirement.
- Actual internal notes belong in server_ticket_private; adminNotes in owner-readable tickets remains empty.
- Existing imported server_support_tickets remains separate and unchanged.
- TypeScript and 4 unit checks passed. Emulator ownership/write tests added; skipped because Java is not installed. No live rules deployed.

Rules addition:
```text
match /tickets/{ticketId} {
  allow read: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin());
  allow create, update, delete: if false;
}
match /server_ticket_counters/{counterId} { allow read, write: if false; }
match /server_ticket_private/{ticketId} { allow read, write: if false; }
```

## Prompt 2
- Added /support and /my-tickets, reachable from Account. Free-ticket creation, owned-order validation, paginated owner-only lists and server-mediated reply threads.
- WhatsApp opens an encoded draft to the existing business support number; no message is sent automatically.
- Strict server input prevents changing UID/type/payment/status. Responses omit private notes and use no-store. Existing email support remains available.
- 7 focused tests and production build passed (existing chunk-size/CJS warnings remain). No live tickets created.
