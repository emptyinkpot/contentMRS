import { Router, type Router as ExpressRouter } from 'express';
import type { PublishService } from '../../application/publish/PublishService.js';
import type { RemoteScanService } from '../../application/scan/RemoteScanService.js';
import type { DataBasePublicationClient } from '../../infrastructure/database/DataBasePublicationClient.js';
import { FanqieServiceError } from '../../sdk/errors.js';
import type { RemoteChapterSnapshot } from '../../sdk/types.js';
import { ok } from './respond.js';

interface BookIdentity {
  workId: string | number;
  bookId: string;
  accountId: string;
}

interface PublishNextSafeInput extends BookIdentity {
  dryRun?: boolean;
  minWordCount?: number;
}

interface GenerateInput extends BookIdentity {
  chapterNumber: number;
  relatedChapterCount?: number;
}

interface InventoryQuery {
  books: BookIdentity[];
}

export function createPublicationRouter(
  publish: PublishService,
  scan: RemoteScanService,
  database: DataBasePublicationClient,
): ExpressRouter {
  const router = Router();

  router.post('/publication/plan-next', async (req, res, next) => {
    try { ok(res, await planNext(scan, database, req.body)); }
    catch (error) { next(error); }
  });

  router.post('/publication/publish-next-safe', async (req, res, next) => {
    try { ok(res, await publishNextSafe(publish, scan, database, req.body)); }
    catch (error) { next(error); }
  });

  router.post('/publication/generate-next', async (req, res, next) => {
    try { ok(res, await generateNext(database, req.body)); }
    catch (error) { next(error); }
  });

  router.post('/publication/inventory-status', async (req, res, next) => {
    try { ok(res, await inventoryStatus(scan, database, req.body)); }
    catch (error) { next(error); }
  });

  return router;
}

// ─── Helpers ───

function getRemoteLatest(chapters: RemoteChapterSnapshot[]): number {
  if (!Array.isArray(chapters) || chapters.length === 0) return 0;
  return Math.max(...chapters.map(c => c.chapterNumber || 0));
}

const CONTENTBASE_URL = process.env.CONTENTBASE_URL || 'http://127.0.0.1:5111';
const CONTENTBASE_API_KEY = process.env.CONTENTBASE_API_KEY || '';

// ─── plan-next (unchanged) ───

async function planNext(
  scan: RemoteScanService,
  database: DataBasePublicationClient,
  input: BookIdentity,
) {
  const { workId, bookId, accountId } = input;
  if (!workId || !bookId || !accountId) {
    throw new FanqieServiceError('invalid_input', 'workId, bookId, accountId required', 400);
  }
  const chapters = await scan.syncRemoteChapters({ accountId, bookId });
  const remoteLatest = getRemoteLatest(chapters as RemoteChapterSnapshot[]);
  if (remoteLatest <= 0) {
    throw new FanqieServiceError('remote_scan_failed', 'Cannot determine remote latest chapter', 500);
  }
  const nextChapterNumber = remoteLatest + 1;
  let dbChapterFound = false;
  let dbChapterWordCount = 0;
  try {
    const resolved: any = await database.resolvePublishChapter({ localWorkId: workId, accountId, bookId, chapterNumber: nextChapterNumber });
    dbChapterFound = !!(resolved?.chapter?.content);
    dbChapterWordCount = (resolved?.chapter?.content || '').length;
  } catch { dbChapterFound = false; }
  return { remoteLatestChapterNumber: remoteLatest, nextChapterNumber, dbChapterFound, publishable: dbChapterFound, reason: dbChapterFound ? null : 'no chapter in DB', dbChapterWordCount };
}

// ─── publish-next-safe (发货：只做确定性操作) ───

async function publishNextSafe(
  publish: PublishService,
  scan: RemoteScanService,
  database: DataBasePublicationClient,
  input: PublishNextSafeInput,
) {
  const { workId, bookId, accountId, dryRun = false, minWordCount = 1000 } = input;
  const steps: Array<{ step: string; status: string; detail?: unknown }> = [];
  const plan = await planNext(scan, database, { workId, bookId, accountId });
  steps.push({ step: 'plan', status: 'ok', detail: plan });
  if (!plan.publishable) return { success: false, abortedAt: 'plan', reason: plan.reason, steps };
  if (plan.dbChapterWordCount < minWordCount) {
    steps.push({ step: 'preflight', status: 'fail' });
    return { success: false, abortedAt: 'preflight', reason: `word count ${plan.dbChapterWordCount} < min ${minWordCount}`, steps };
  }
  steps.push({ step: 'preflight', status: 'ok' });
  const resolved: any = await database.resolvePublishChapter({ localWorkId: workId, accountId, bookId, chapterNumber: plan.nextChapterNumber });
  const freshKey = 'pub-safe-' + plan.nextChapterNumber + '-' + Date.now();
  const publishResult: any = await publish.publishChapter({ ...resolved.publishInput, dryRun, idempotencyKey: freshKey });
  steps.push({ step: 'publish', status: publishResult?.status || 'unknown', detail: publishResult });
  if (publishResult?.status === 'failed') return { success: false, abortedAt: 'publish', reason: publishResult?.error, steps };
  if (!dryRun) {
    let verifiedLatest = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise(r => setTimeout(r, attempt === 0 ? 10000 : 15000));
      const verifyChapters = await scan.syncRemoteChapters({ accountId, bookId });
      verifiedLatest = getRemoteLatest(verifyChapters as RemoteChapterSnapshot[]);
      if (verifiedLatest >= plan.nextChapterNumber) break;
    }
    const verified = verifiedLatest >= plan.nextChapterNumber;
    steps.push({ step: 'verify', status: verified ? 'ok' : 'fail', detail: { verifiedLatest, expected: plan.nextChapterNumber } });
    if (!verified) return { success: false, abortedAt: 'verify', reason: 'verify failed', steps };
    try {
      await database.recordPublicationResult({ accountId, bookId, localWorkId: workId, chapterNumber: plan.nextChapterNumber, action: 'publish_chapter', observedStatus: 'published', publishedAt: new Date().toISOString() });
      steps.push({ step: 'record', status: 'ok' });
    } catch (e: any) { steps.push({ step: 'record', status: 'warn', detail: e.message }); }
  }
  return { success: true, chapterNumber: plan.nextChapterNumber, dryRun, steps };
}

// ─── generate-next (补货：独立生成，不含 plan 逻辑) ───

async function generateNext(
  database: DataBasePublicationClient,
  input: GenerateInput,
) {
  const { workId, chapterNumber, relatedChapterCount = 3 } = input;
  if (!workId || !chapterNumber) {
    throw new FanqieServiceError('invalid_input', 'workId and chapterNumber required', 400);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (CONTENTBASE_API_KEY) headers['x-api-key'] = CONTENTBASE_API_KEY;
  const body = JSON.stringify({ workId: Number(workId), chapterNumber, relatedChapterCount, settings: {}, persist: true });
  const resp = await fetch(CONTENTBASE_URL + '/api/novel/runtime/actions/generate-chapter', { method: 'POST', headers, body, signal: AbortSignal.timeout(300000) });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new FanqieServiceError('generate_failed', 'ContentBase ' + resp.status + ': ' + text.slice(0, 200), 502);
  }
  const result: any = await resp.json();
  const draft = result?.data?.draft || result?.draft;
  return { success: true, chapterNumber, generatedWordCount: (draft?.body || '').length };
}

// ─── inventory-status (库存报告) ───

async function inventoryStatus(
  scan: RemoteScanService,
  database: DataBasePublicationClient,
  input: InventoryQuery,
) {
  const { books } = input;
  if (!Array.isArray(books) || books.length === 0) {
    throw new FanqieServiceError('invalid_input', 'books array required', 400);
  }
  const results = await Promise.all(books.map(async (book) => {
    try {
      const plan = await planNext(scan, database, book);
      const stock = plan.dbChapterFound ? 'has_next' : 'empty';
      return { workId: book.workId, bookId: book.bookId, remoteLatest: plan.remoteLatestChapterNumber, nextChapter: plan.nextChapterNumber, stock, publishable: plan.publishable };
    } catch (e: any) {
      return { workId: book.workId, bookId: book.bookId, stock: 'error', error: e.message };
    }
  }));
  const needsGeneration = results.filter(r => r.stock === 'empty');
  return { books: results, needsGeneration: needsGeneration.length, total: results.length };
}
