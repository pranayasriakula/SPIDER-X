import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

test('approval client uses shared session, API contract and preserves actionable errors', async () => {
  const bundled = await build({
    entryPoints: ['src/services/governmentApprovalService.js'], bundle: true, write: false,
    format: 'esm', platform: 'node', define: { 'import.meta.env.VITE_API_BASE_URL': '"https://api.example.test"' },
  });
  const client = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
  const previousFetch = globalThis.fetch;
  const previousWindow = globalThis.window;
  let token = 'first-test-token';
  const requests = [];
  let status = 200;
  globalThis.window = { sessionStorage: { getItem(key) { assert.equal(key, 'spider-x.access-token'); return token; } } };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return { ok: status === 200, status, json: async () => status === 200
      ? { success: true, data: [] }
      : { success: false, error: { code: 'TEST_ERROR', message: 'Test response' } } };
  };
  try {
    assert.deepEqual(await client.listApplications({ status: 'PENDING', limit: 20, offset: 40 }), []);
    assert.equal(requests.at(-1).url, 'https://api.example.test/api/admin/government-applications?limit=20&offset=40&status=PENDING');
    assert.equal(requests.at(-1).headers.Authorization, 'Bearer first-test-token');
    token = 'rotated-test-token';
    await client.getApplication('application-id');
    assert.equal(requests.at(-1).url, 'https://api.example.test/api/admin/government-applications/application-id');
    assert.equal(requests.at(-1).headers.Authorization, 'Bearer rotated-test-token');
    await client.getApplicationAudit('application-id');
    assert.ok(requests.at(-1).url.endsWith('/application-id/audit'));
    await client.decideApplication('application-id', 'approve');
    assert.equal(requests.at(-1).method, 'POST');
    assert.ok(requests.at(-1).url.endsWith('/application-id/approve'));
    assert.equal(requests.at(-1).body, undefined);
    for (const action of ['reject', 'revoke']) {
      await client.decideApplication('application-id', action, '  Verified reason  ');
      assert.ok(requests.at(-1).url.endsWith(`/application-id/${action}`));
      assert.deepEqual(JSON.parse(requests.at(-1).body), { reason: 'Verified reason' });
    }
    for (status of [401, 403, 409]) {
      await assert.rejects(client.getApplication('application-id'), (error) => error.status === status);
    }
    token = null;
    const count = requests.length;
    await assert.rejects(client.listApplications(), (error) => error.code === 'AUTH_REQUIRED');
    assert.equal(requests.length, count);
    assert.throws(() => client.decideApplication('application-id', 'promote'), /Invalid approval action/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
