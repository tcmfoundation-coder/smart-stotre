/* eslint-disable @typescript-eslint/no-require-imports -- next.config.js must be
   re-required per test (after jest.resetModules()) so each test's env vars are
   picked up fresh; a static top-level import would only ever see the first. */
// Regression test for the Server Actions "Invalid Server Actions request" bug:
// Next.js aborts every Server Action (the getXById/updateX/deleteX calls the
// customer/employee/supplier/product detail pages invoke directly) whenever
// the request's Origin doesn't match Host/X-Forwarded-Host - which happens by
// default behind any reverse proxy or dev tunnel (Codespaces, Gitpod, a real
// deployment). next.config.js must keep the dev origin trusted via
// experimental.serverActions.allowedOrigins, and must forward ALLOWED_ORIGINS
// for additional environments (a Codespaces domain, the production host).
describe('next.config.js Server Actions allowedOrigins', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.PORT;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('always trusts the local dev origin, with no env configuration required', () => {
    const config = require('../../../next.config.js');
    expect(config.experimental.serverActions.allowedOrigins).toEqual(
      expect.arrayContaining(['localhost:3000', '127.0.0.1:3000'])
    );
  });

  it('follows a custom PORT for the local dev origin', () => {
    process.env.PORT = '4000';
    const config = require('../../../next.config.js');
    expect(config.experimental.serverActions.allowedOrigins).toEqual(
      expect.arrayContaining(['localhost:4000', '127.0.0.1:4000'])
    );
  });

  it('adds extra trusted origins from ALLOWED_ORIGINS, stripping any scheme', () => {
    process.env.ALLOWED_ORIGINS = 'https://my-app.up.railway.app, http://foo.example.com';
    const config = require('../../../next.config.js');
    expect(config.experimental.serverActions.allowedOrigins).toEqual(
      expect.arrayContaining(['my-app.up.railway.app', 'foo.example.com'])
    );
  });

  it('still keeps bodySizeLimit configured', () => {
    const config = require('../../../next.config.js');
    expect(config.experimental.serverActions.bodySizeLimit).toBe('2mb');
  });
});

// Regression test for the barcode scanner never prompting for camera
// permission at all: a site-wide `Permissions-Policy: camera=()` (empty
// allowlist) disables the Camera API for the whole origin, so the browser
// rejects every getUserMedia() call at the policy level before it can ever
// show a permission prompt - no prompt, no camera, and the page can't tell
// that apart from a user denial. Must stay scoped to camera=(self) so the
// app's own pages can use their own camera; microphone/geolocation stay
// locked down since nothing in the app uses them.
describe('next.config.js Permissions-Policy', () => {
  it('allows camera for same-origin use, and keeps microphone/geolocation disabled', async () => {
    const config = require('../../../next.config.js');
    const headerGroups = await config.headers();
    const allRoutes = headerGroups.find((group: { source: string }) => group.source === '/:path*');
    const permissionsPolicy = allRoutes.headers.find((h: { key: string }) => h.key === 'Permissions-Policy');

    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy.value).toContain('camera=(self)');
    expect(permissionsPolicy.value).not.toContain('camera=()');
    expect(permissionsPolicy.value).toContain('microphone=()');
    expect(permissionsPolicy.value).toContain('geolocation=()');
  });
});
