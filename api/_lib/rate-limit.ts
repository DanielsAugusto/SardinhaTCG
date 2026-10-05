import type { VercelRequest } from './types.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_TRACKED_KEYS = 5_000;

interface Bucket {
  failures: number;
  resetAt: number;
}

/**
 * Limite best-effort em memória: cada instância serverless tem seu próprio Map,
 * então não substitui um rate limit distribuído (ex.: Vercel Firewall / Upstash).
 */
const buckets = new Map<string, Bucket>();

export function getClientKey(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = raw?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  return ip.slice(0, 64);
}

function getBucket(key: string, now: number): Bucket | undefined {
  const bucket = buckets.get(key);
  if (bucket && bucket.resetAt <= now) {
    buckets.delete(key);
    return undefined;
  }
  return bucket;
}

export function isBlocked(key: string): number | null {
  const now = Date.now();
  const bucket = getBucket(key, now);
  if (bucket && bucket.failures >= MAX_FAILURES) {
    return Math.ceil((bucket.resetAt - now) / 1000);
  }
  return null;
}

export function registerFailure(key: string): void {
  const now = Date.now();
  if (buckets.size >= MAX_TRACKED_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
  }
  const bucket = getBucket(key, now) ?? { failures: 0, resetAt: now + WINDOW_MS };
  bucket.failures += 1;
  buckets.set(key, bucket);
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}
