import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const workspaceRoot = path.resolve(currentDir, '..', '..');
const isProd = process.env.NODE_ENV === 'production';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';
const apiOrigin = (() => {
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return undefined;
  }
})();

function buildCsp() {
  const scriptSrc = isProd
    ? ["'self'"]
    : ["'self'", "'unsafe-eval'"];
  const connectSrc = [
    "'self'",
    ...(apiOrigin ? [apiOrigin] : []),
    ...(isProd ? [] : ['ws:']),
  ];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "img-src": ["'self'", 'data:', 'blob:'],
    "style-src": ["'self'", "'unsafe-inline'"],
    "script-src": scriptSrc,
    "connect-src": connectSrc,
    "form-action": ["'self'"],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  async headers() {
    const csp = buildCsp();
    const baseHeaders = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    ];

    const prodOnlyHeaders = isProd
      ? [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ]
      : [];

    return [
      {
        source: '/:path*',
        headers: [...baseHeaders, ...prodOnlyHeaders],
      },
    ];
  },
};

export default nextConfig;
