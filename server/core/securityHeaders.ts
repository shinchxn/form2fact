import { Request, Response, NextFunction } from 'express';

/**
 * Baseline security response headers.
 *
 * - `X-Content-Type-Options: nosniff` — blocks MIME sniffing on all API/asset responses.
 * - `X-Frame-Options: DENY` + `frame-ancestors 'none'` — the app is not embeddable in frames (clickjacking).
 * - `Referrer-Policy: strict-origin-when-cross-origin` — no path leakage in referrers.
 * - `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` are intentionally NOT set:
 *   they would break the external AI/OCR fetch flows and third-party PDF embedding in the browser.
 *
 * Content-Security-Policy is applied only in production static-serve mode,
 * where the bundle is a same-origin file (vite emits no inline scripts for the
 * production build). In dev mode Vite's react-refresh preamble requires
 * `unsafe-inline`, so a strict CSP would break the dev server; we therefore
 * skip CSP in dev and keep the remaining hard headers.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        // The UI loads the Inter/JetBrains Mono webfonts from Google Fonts (see index.html)
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'"
      ].join('; ')
    );
  }

  next();
}
