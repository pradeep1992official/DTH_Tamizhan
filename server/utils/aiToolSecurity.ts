import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, createHash } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import { verifyAuthToken, isCallerAdminAuthorized, getAdminFirestore } from '../middleware/auth';

const requests = new AsyncLocalStorage<Request>();
export const AI_AUDIT_COLLECTION = 'server_ai_tool_audit';
export const aiRequestScope: RequestHandler = (req, _res, next) => requests.run(req, next);
export function withAiRequest<T>(req: Request, task: () => T): T { return requests.run(req, task); }
export class AiToolAccessDenied extends Error {
  constructor(public status: 401 | 403) { super('Please sign in with an authorized account to use this feature.'); }
}
export class AiAuditUnavailable extends Error {
  constructor() { super('The assistant is temporarily unavailable. Please try again.'); }
}

function redactText(value: string): string {
  let safe = value;
  for (const secret of [process.env.GEMINI_FREE_API_KEY, process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY,
    process.env.BREVO_API_KEY, process.env.RAZORPAY_KEY_SECRET]) {
    if (secret && secret.length >= 8) safe = safe.split(secret).join('[REDACTED]');
  }
  return safe.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/AIza[A-Za-z0-9_-]{35}|AQ\.[A-Za-z0-9_.-]{20,}/g, '[REDACTED API KEY]')
    .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, '[REDACTED TOKEN]')
    .replace(/\bxkeysib-[A-Za-z0-9_-]+\b/g, '[REDACTED API KEY]')
    .replace(/-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]');
}
export function auditValue(value: unknown): unknown {
  let remaining = 120_000;
  let nodes = 2000;
  const seen = new WeakSet<object>();
  const visit = (item: unknown, depth: number): unknown => {
    if (--nodes < 0 || remaining <= 0 || depth > 8) return '[TRUNCATED]';
    if (typeof item === 'string') { const safe = redactText(item); const limit = Math.min(4000, remaining); remaining -= Math.min(safe.length, limit); return safe.length > limit ? `${safe.slice(0, limit)}[TRUNCATED]` : safe; }
    if (typeof item === 'number') return Number.isFinite(item) ? item : null;
    if (typeof item === 'boolean' || item === null) return item;
    if (typeof item !== 'object') return null;
    if (seen.has(item)) return '[CIRCULAR]';
    seen.add(item);
    if (Array.isArray(item)) {
      const values = item.slice(0, 100).map(value => visit(value, depth + 1));
      if (item.length > 100) values.push({ auditTruncated: true, omittedItems: item.length - 100 });
      return values;
    }
    return Object.fromEntries(Object.entries(item).slice(0, 50).map(([key, value]) => {
      remaining -= Math.min(key.length, 100);
      return [redactText(key).slice(0, 100), /(?:authorization|token|api.?key|secret|password|private.?key|otp|pin|cvv|smartCardNumber|subscriberId|registeredMobile)/i.test(key) ? '[REDACTED]' : visit(value, depth + 1)];
    }));
  };
  return visit(value, 0);
}
async function appendAudit(record: Record<string, unknown>) {
  try { await getAdminFirestore().collection(AI_AUDIT_COLLECTION).doc(randomUUID()).create(record); }
  catch { throw new AiAuditUnavailable(); }
}

// Each invocation independently re-verifies the signed token. The model cannot
// supply a Request, principal, UID, role, schema or permission through arguments.
export async function runAiTool<T>(scope: 'customer' | 'admin', name: unknown, args: unknown,
  execute: (uid: string) => Promise<T>, expectedUid?: string): Promise<T> {
  const req = requests.getStore();
  if (!req) throw new AiToolAccessDenied(401);
  const account = await verifyAuthToken(req);
  const callId = randomUUID();
  const tool = typeof name === 'string' ? redactText(name).slice(0, 100) : '[invalid tool]';
  const base = { callId, scope, uid: account?.uid || null, tool, arguments: auditValue(args) };
  await appendAudit({ ...base, phase: 'attempt', timestamp: new Date().toISOString() });
  try {
    if (!account) throw new AiToolAccessDenied(401);
    if (expectedUid !== undefined && expectedUid !== account.uid) throw new AiToolAccessDenied(403);
    if (scope === 'admin' && !(await isCallerAdminAuthorized(req, new Set())).authorized) throw new AiToolAccessDenied(403);
    const result = await execute(account.uid);
    const safeResult = auditValue(result);
    await appendAudit({ ...base, phase: 'result', status: 'success', timestamp: new Date().toISOString(), result: safeResult,
      resultHash: createHash('sha256').update(JSON.stringify(safeResult) ?? 'null').digest('hex') });
    return result;
  } catch (error) {
    await appendAudit({ ...base, phase: 'result', status: error instanceof AiToolAccessDenied ? 'denied' : 'failed', timestamp: new Date().toISOString(),
      result: { error: error instanceof AiToolAccessDenied ? 'access_denied' : error instanceof AiAuditUnavailable ? 'audit_unavailable' : 'tool_failed' } });
    throw error;
  }
}
