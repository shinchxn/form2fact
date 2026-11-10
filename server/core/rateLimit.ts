import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  /** Maximum number of attempts within the window. */
  maxAttempts: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Human-readable limit name for responses (e.g., 'auth'). */
  name?: string;
}

interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Bounded in-memory rate limiter for authentication-sensitive endpoints.
 *
 * Keyed by `${ip}:${email-or-route}` so a single compromised IP cannot
 * brute-force one account without exhausting its own budget, and one account
 * cannot be DoS'd by a distributed set of IPs without burning per-IP budgets.
 *
 * In-memory by design: the deployment model is single-process (see audit).
 * A clustered deployment would swap this for Redis without changing call sites.
 */
export class InMemoryRateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(private readonly options: RateLimitOptions) {
    // Periodic cleanup so the map cannot grow unbounded (every 10 min)
    const timer = setInterval(() => this.purge(), 10 * 60 * 1000);
    timer.unref();
  }

  private key(req: Request, routeScope: string): string {
    const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return `${ip}:${email || routeScope}`;
  }

  private purge(): void {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (now - b.windowStart > this.options.windowMs) this.buckets.delete(k);
    }
  }

  public middleware(routeScope: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const now = Date.now();
      const k = this.key(req, routeScope);
      let bucket = this.buckets.get(k);
      if (!bucket || now - bucket.windowStart > this.options.windowMs) {
        bucket = { count: 0, windowStart: now };
        this.buckets.set(k, bucket);
      }
      bucket.count++;
      const remaining = Math.max(0, this.options.maxAttempts - bucket.count);

      res.setHeader('RateLimit-Limit', String(this.options.maxAttempts));
      res.setHeader('RateLimit-Remaining', String(remaining));

      if (bucket.count > this.options.maxAttempts) {
        const retryAfterSec = Math.ceil((bucket.windowStart + this.options.windowMs - now) / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        return res.status(429).json({
          success: false,
          error: 'Too many authentication attempts. Please wait before retrying.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: retryAfterSec
        });
      }

      next();
    };
  }
}

/**
 * Authentication rate limit: 10 attempts per 15 minutes per IP+email in production,
 * and 500 in development/test environments to facilitate local testing and automated E2E runs.
 */
export const authRateLimiter = new InMemoryRateLimiter({
  maxAttempts: process.env.NODE_ENV === 'production' ? 10 : 500,
  windowMs: 15 * 60 * 1000,
  name: 'auth'
});
