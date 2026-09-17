// Server Actions compare the browser's `Origin` header against the request's
// `Host`/`X-Forwarded-Host` and abort with "Invalid Server Actions request"
// on any mismatch (Next.js CSRF protection - see
// node_modules/next/dist/docs/01-app/02-guides/data-security.md#allowed-origins-advanced).
// Behind a reverse proxy or dev tunnel (Codespaces, Gitpod, a load balancer)
// those headers legitimately differ from the plain dev origin, so every
// Server Action - i.e. every "use server" data/mutation call the client
// components invoke directly, which is how customers/employees/suppliers/
// products fetch and save their detail pages - gets rejected even though the
// page itself loaded fine. ALLOWED_ORIGINS (already documented in
// DEPLOYMENT.md/.env.example for CORS) is reused here as the one place to
// list additional trusted origins, e.g. a Codespaces forwarding domain or
// the production host.
function getAllowedServerActionOrigins() {
  const port = process.env.PORT || '3000';
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/^https?:\/\//, ''))
    .filter(Boolean);

  return Array.from(new Set([`localhost:${port}`, `127.0.0.1:${port}`, ...fromEnv]));
}

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: getAllowedServerActionOrigins(),
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;
