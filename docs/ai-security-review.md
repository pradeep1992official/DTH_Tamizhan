# AI security review

Scope: customer recommendations/recharge assistant, six customer tools, admin query tools, ticket summaries/drafts/approval, browser actions, Gemini credentials and tool audit storage. This is a scoped source review of the AI feature, not a full-codebase penetration test.

## Checklist

- [x] Prompt/user/ticket content cannot select new tool names, add schema fields, change route maps or confer authority. Customer/admin registries are fixed and frozen; strict schemas validate arguments before data access. Raw model text is never evaluated as code or a query. Multiple model calls are rejected and logged as a rejected batch.
- [x] Each tool dispatcher independently re-verifies the Firebase ID token (with revocation checks through the existing auth helper), using a server request context. An arbitrary UID string is not authentication. Customer tools use the newly verified UID and reject a mismatching earlier UID. No request context fails closed.
- [x] Customer status/history/refund tools query records with the verified UID and recheck returned ownership. Refund payment provenance, captured status and ownership are also verified. Public catalog/navigation/contact drafts have no separate owned resource.
- [x] Admin tools and direct ticket summary/draft/approval operations independently recheck the existing approved-admin registry/root policy. An admin custom claim is not the current project authority. Admin-wide reads are intentional and unavailable through the customer registry.
- [x] Ticket replies still require explicit approval and an open-ticket check. The recipient comes from the current imported ticket, never model/client arguments. No payment/refund/delete/write tool is exposed.
- [x] Every dispatched customer/admin tool and direct admin action has mandatory Firestore auditing. Customer refund-submit preflight goes through the same customer tool dispatcher.
- [x] Audit collection is `server_ai_tool_audit`. Each call has immutable attempt/result events joined by callId, signed UID, scope, tool, redacted arguments, result/status, UTC timestamps and a hash of the stored sanitized result. Success, invalid-tool/argument failures and mid-request authorization denials are covered. Audit failure prevents the action/result from being released. Existing default-deny rules block browser reads/writes of this server collection.
- [x] Audit payloads have depth/node/string/array bounds. Credentials, bearer tokens and sensitive named fields are redacted; very large results are explicitly truncated. Audit results are sanitized representations, not full raw provider payloads or stacks.
- [x] No configured server secret was found by exact-value comparison against 95 current client-source/existing generated-asset files; four configured non-empty secret values were checked without printing values. Firebase web configuration is intentionally public and is not the server Gemini key. Environment files are ignored and were not tracked in the inspected worktree.
- [x] Fixed a separate static-serving gap: Firebase Hosting now excludes server CJS bundles/maps; production Express rejects CJS/map asset requests before static serving.
- [x] Server API failures return bounded friendly messages rather than provider stacks/raw payloads. Browser parsing/schema/network failures now use a friendly fallback.
- [x] Existing per-user/admin rate limits, request-length limits and model-usage ceilings remain in place. Auditing is additional operational storage, not a support-ticket or financial mutation.

## Validation still required

- [ ] Run the added security regression tests and existing AI tests, type check and production build in an OS-enforced isolated test environment. They were **not executed in this security-review turn**: the security-audit skill requires network isolation, a clean allowlisted environment, read-only source/toolchain, scratch-only writes and bounded resources; this host does not supply those controls. Prior-turn passing results do not validate these new changes.
- [ ] In staging, verify token expiry/revocation between model generation and tool dispatch, customer cross-account rejection, revoked admin rejection, and successful/failed audit events with fixture accounts. Do not use production customers for tests.
- [ ] Confirm the deployed server identity can create audit documents, has appropriate restricted IAM, and that the deployed Firestore rules still deny browser access. Mandatory auditing intentionally makes tools unavailable if audit storage cannot be written.
- [ ] Choose and configure audit retention/TTL and privileged operational access according to the business retention policy. Logs may include redacted support arguments and order results; they are not public application data.
- [ ] Rebuild and redeploy, then verify deployed client assets do not contain server secrets and server bundles/maps return 404. The exact-value scan covered the existing local assets; deployed files and a new build were not verified.

## Source-grounded changes and limits

The previous tools relied on route authorization and a UID string; routes already had token checks, so this review does not claim a demonstrated unauthenticated remote bypass. The new per-dispatch checks close the requested defense-in-depth gap and refresh admin authorization after model latency. Logging was absent and is now mandatory. The production static configuration previously exposed the server build directory; deployment reachability was not probed.

No live cloud reads/writes, production probing, real emails or paid model calls were performed. Source inspection and trusted text-only secret scanning are the evidence for checked items. Runtime and deployment items remain unverified; this is not a claim that prompt injection can never influence generated wording, only that it cannot grant tool permissions or replace schemas.

## Changed files

- `README.md`
- `firebase.json`
- `server.ts`
- `server/controllers/rechargeAssistant.ts`
- `server/routes/adminAi.ts`
- `server/routes/ai.ts`
- `server/utils/aiToolSecurity.ts` (new)
- `server/utils/adminAiModel.ts`
- `server/utils/adminAiTools.ts`
- `server/utils/assistantCatalog.ts`
- `server/utils/assistantTools.ts`
- `server/utils/assistantTurn.ts`
- `src/components/Admin/AdminAiPanel.tsx`
- `src/components/AssistantDraftCard.tsx`
- `src/components/RechargeAssistant.tsx`
- `tests/aiToolSecurity.test.ts` (new)
- `tests/adminAi.test.ts`
- `tests/adminAiTools.test.ts`
- `tests/assistantDrafts.test.tsx`
- `tests/assistantHistory.test.ts`
- `tests/assistantRefundCheck.test.ts`
- `tests/assistantTools.test.ts`
- `tests/rechargeAssistant.test.ts`
- `docs/ai-security-review.md` (new)
