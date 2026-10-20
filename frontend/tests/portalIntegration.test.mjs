import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

test('public application, role refresh, government dashboard and admin client share the session', async () => {
  const bundled = await build({
    stdin: { contents: `export * from './src/services/governmentAccessService.js';
      export * from './src/services/authService.js';
      export { getReports } from './src/government/api/client.js';
      export * from './src/services/governmentApprovalService.js';`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: { 'import.meta.env.VITE_API_BASE_URL': '"https://api.example.test"' },
  });
  const previousFetch = globalThis.fetch;
  const previousWindow = globalThis.window;
  let token = 'public-test-token';
  let role = 'PUBLIC';
  let applicationStatus = 'PENDING';
  const requests = [];
  globalThis.window = { sessionStorage: { getItem: () => token } };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    const data = url.endsWith('/auth/me')
      ? { user: { id: 'applicant' }, profile: { role } }
      : url.endsWith('/applications/me') ? { status: applicationStatus } : [];
    return { ok: true, status: 200, json: async () => ({ success: true, data }), text: async () => JSON.stringify({ success: true, data }) };
  };
  try {
    const client = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
    await client.submitGovernmentApplication({ department: 'Response' }, token);
    assert.equal(requests.at(-1).url, 'https://api.example.test/api/government/applications');
    assert.equal(requests.at(-1).headers.Authorization, `Bearer ${token}`);
    assert.equal((await client.getMyGovernmentApplication(token)).status, 'PENDING');
    await client.getGovernmentApplicationHistory(token);
    assert.ok(requests.at(-1).url.endsWith('/applications/me/history'));
    role = 'AUTHORITY'; applicationStatus = 'APPROVED';
    assert.equal((await client.getCurrentUser(token)).profile.role, 'AUTHORITY');
    await client.getReports();
    assert.equal(requests.at(-1).url, 'https://api.example.test/api/reports');
    assert.equal(requests.at(-1).headers.Authorization, `Bearer ${token}`);
    token = 'admin-test-token';
    await client.listApplications();
    assert.equal(requests.at(-1).headers.Authorization, `Bearer ${token}`);
    await client.decideApplication('application', 'revoke', 'Employment ended');
    assert.deepEqual(JSON.parse(requests.at(-1).body), { reason: 'Employment ended' });
    token = 'public-test-token'; role = 'PUBLIC'; applicationStatus = 'REVOKED';
    assert.equal((await client.getCurrentUser(token)).profile.role, 'PUBLIC');
    assert.equal((await client.getMyGovernmentApplication(token)).status, 'REVOKED');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
