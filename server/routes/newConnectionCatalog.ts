import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import config from '../../firebase-applet-config.json';
import { isCallerAdminAuthorized } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimiter';
import { catalogKinds, csvRecord, parseCsv } from '../../src/lib/newConnectionCatalog';
import { mutateCatalog, readNewConnectionCatalog } from '../models/newConnectionCatalog';

export const newConnectionCatalogRouter = Router();
newConnectionCatalogRouter.use('/api/admin/catalog', adminLimiter, async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try { if (!(await isCallerAdminAuthorized(req, new Set())).authorized) { res.status(403).json({ success: false, error: 'Administrator access required.' }); return; } next(); }
  catch { res.status(503).json({ success: false, error: 'Administrator access could not be checked.' }); }
});
function message(error: unknown) { return error instanceof z.ZodError ? error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') : error instanceof Error ? error.message : 'Catalog operation failed'; }
newConnectionCatalogRouter.get('/api/admin/catalog', async (_req, res) => {
  try { res.json({ success: true, catalog: await readNewConnectionCatalog() }); }
  catch { res.status(503).json({ success: false, error: 'Catalog unavailable. Check Firestore configuration and retry.' }); }
});
newConnectionCatalogRouter.post('/api/admin/catalog/save', async (req, res) => {
  try {
    const body = z.object({ kind: z.enum([...catalogKinds, 'settings']), id: z.string().regex(/^[\p{L}\p{N}_-]{1,128}$/u).optional(), action: z.enum(['save', 'delete', 'verify']).default('save'), data: z.unknown() }).parse(req.body);
    res.json({ success: true, ...await mutateCatalog(body.kind, body.data, { id: body.id, action: body.action }) });
  } catch (error) { res.status(400).json({ success: false, error: message(error) }); }
});
newConnectionCatalogRouter.post('/api/admin/catalog/import', async (req, res) => {
  try {
    const { kind, csv } = z.object({ kind: z.enum(['channels', 'packs']), csv: z.string().max(2000000) }).parse(req.body);
    const rows = parseCsv(csv); const errors: { row: number; name: string; error: string }[] = []; let imported = 0;
    for (const [i, row] of rows.entries()) {
      try { await mutateCatalog(kind, csvRecord(kind, row), { upsert: true }); imported++; }
      catch (error) { errors.push({ row: i + 2, name: row.name || '', error: message(error) }); }
    }
    res.json({ success: true, imported, errors });
  } catch (error) { res.status(400).json({ success: false, error: message(error) }); }
});
newConnectionCatalogRouter.post('/api/admin/catalog/channels/bulk', async (req, res) => {
  try {
    const { ids, active } = z.object({ ids: z.array(z.string()).min(1).max(2000), active: z.boolean() }).parse(req.body);
    const catalog = await readNewConnectionCatalog(); const errors: string[] = []; let updated = 0;
    for (const id of new Set(ids)) { const row = catalog.channels.find(c => c.id === id); try { if (!row) throw new Error('Unknown channel'); await mutateCatalog('channels', { ...row, active }, { id }); updated++; } catch (e) { errors.push(`${id}: ${message(e)}`); } }
    res.json({ success: true, updated, errors });
  } catch (error) { res.status(400).json({ success: false, error: message(error) }); }
});
// Reuses the existing Admin Storage bucket pattern; never opens receipt paths.
newConnectionCatalogRouter.post('/api/admin/catalog/logo', async (req, res) => {
  try {
    const { contentType, base64 } = z.object({ contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']), base64: z.string().max(2800000) }).parse(req.body);
    const bytes = Buffer.from(base64, 'base64');
    const valid = contentType === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : contentType === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid || bytes.length > 2 * 1024 * 1024) throw new Error('Upload a PNG, JPEG or WebP logo up to 2 MB');
    const bucket = getStorage().bucket(config.storageBucket); const path = `catalog-logos/${randomUUID()}`; const token = randomUUID();
    await bucket.file(path).save(bytes, { resumable: false, contentType, metadata: { cacheControl: 'public,max-age=86400', metadata: { firebaseStorageDownloadTokens: token } } });
    res.json({ success: true, url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}` });
  } catch (error) { res.status(400).json({ success: false, error: message(error) }); }
});
