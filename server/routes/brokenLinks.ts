import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { documentKey, mutateRecord, readCollection, usesFirestore } from '../persistence';
import { isCallerAdminAuthorized } from '../middleware/auth';
import { APPROVED_ADMIN_EMAILS } from '../models/store';
import { forwardAsyncErrors } from '../asyncRoutes';

interface BrokenLink { path: string; count: number; firstReportedAt: string; lastReportedAt: string }
const file = () => path.join(process.cwd(), 'data', 'broken_links.json');
function localReports(): BrokenLink[] { return fs.existsSync(file()) ? JSON.parse(fs.readFileSync(file(), 'utf8')) : []; }
export const brokenLinksRouter = Router();
const limiter = rateLimit({ windowMs: 3_600_000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Please try again later.' } });
const schema = z.object({ path: z.string().min(1).max(500).startsWith('/').refine(value => !value.startsWith('//') && !/[?#\\\u0000-\u001f]/.test(value)) }).strict();
brokenLinksRouter.post('/api/broken-links', limiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: 'A valid page path is required.' }); return; }
  const page = parsed.data.path; const now = new Date().toISOString();
  const update = (previous?: BrokenLink): BrokenLink => ({ path: page, count: (previous?.count || 0) + 1, firstReportedAt: previous?.firstReportedAt || now, lastReportedAt: now });
  if (usesFirestore()) await mutateRecord<BrokenLink>('server_broken_links', documentKey(page), update);
  else {
    const reports = localReports(); const index = reports.findIndex(report => report.path === page); const record = update(reports[index]);
    if (index >= 0) reports[index] = record; else reports.push(record);
    fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(`${file()}.tmp`, JSON.stringify(reports, null, 2)); fs.renameSync(`${file()}.tmp`, file());
  }
  if (req.accepts(['json', 'html']) === 'html') {
    res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Link reported | DTH Tamizhan</title><body><main><h1>Thank you. The broken link has been reported.</h1><a href="/">Go to Homepage</a> · <a href="/plans">Check Popular Packs</a></main></body></html>'); return;
  }
  res.json({ success: true });
});
brokenLinksRouter.get('/api/admin/broken-links', async (req, res) => {
  if (!(await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS)).authorized) { res.status(403).json({ success: false, error: 'Administrator access required.' }); return; }
  res.setHeader('Cache-Control', 'no-store');
  const reports = usesFirestore() ? await readCollection<BrokenLink>('server_broken_links') : localReports();
  res.json({ success: true, reports: reports.sort((a, b) => Date.parse(b.lastReportedAt) - Date.parse(a.lastReportedAt)).slice(0, 50) });
});
forwardAsyncErrors(brokenLinksRouter);
