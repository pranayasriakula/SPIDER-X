const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const applicant = '11111111-1111-4111-8111-111111111111';
const admin = '22222222-2222-4222-8222-222222222222';
const authority = '44444444-4444-4444-8444-444444444444';
const id = '33333333-3333-4333-8333-333333333333';
const valid = { department: ' Disaster Response ', designation: 'Officer', official_email: 'OFFICER@example.gov', employee_id: 'E-1' };

// Exercise the real routes, authentication and controllers; only Supabase is
// replaced. No credentials or external database connections are used.
test('government HTTP authorization, validation and service-role RPC boundary', async (t) => {
  const calls = [];
  let rpcError = null;
  let queryResult = [];
  const client = {
    auth: { getUser: async (token) => ({ data: { user: token === 'invalid' ? null : { id: token === 'admin' ? admin : token === 'authority' ? authority : applicant } }, error: null }) },
    from(table) {
      const filters = [];
      const q = {
        select() { return q; }, eq(key, value) { filters.push([key, value]); return q; },
        order() { return q; }, limit() { return q; }, range() { return q; },
        update(values) { calls.push({ table, values }); return q; },
        single: async () => ({ data: table === 'profiles' ? { user_id: filters[0][1], role: filters[0][1] === admin ? 'ADMIN' : filters[0][1] === authority ? 'AUTHORITY' : 'PUBLIC' } : {}, error: null }),
        maybeSingle: async () => { calls.push({ table, filters }); return { data: queryResult[0] || null, error: null }; },
        then(resolve, reject) { calls.push({ table, filters }); return Promise.resolve({ data: queryResult, error: null }).then(resolve, reject); }
      };
      return q;
    },
    rpc: async (name, params) => { calls.push({ name, params }); return { data: { application_id: id, status: 'PENDING' }, error: rpcError }; }
  };
  const configId = require.resolve('../config/supabase');
  const previous = require.cache[configId];
  require.cache[configId] = { id: configId, filename: configId, loaded: true, exports: { supabaseAdmin: client } };
  const modules = ['../middleware/auth', '../services/dataService', '../controllers/governmentController', '../controllers/userController', '../routes/governmentRoutes', '../routes/governmentAdminRoutes', '../routes/userRoutes'];
  const cached = modules.map((name) => [require.resolve(name), require.cache[require.resolve(name)]]);
  cached.forEach(([key]) => { delete require.cache[key]; });
  const app = express();
  app.use(express.json());
  app.use('/api/government', require('../routes/governmentRoutes'));
  app.use('/api/admin/government-applications', require('../routes/governmentAdminRoutes'));
  app.use('/api/users', require('../routes/userRoutes'));
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ code: err.code }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const request = async (path, method = 'GET', body, token = 'public') => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    return { status: res.status, body: await res.json() };
  };
  const base = '/api/admin/government-applications';
  try {
    await t.test('all government endpoints require authentication and decisions require ADMIN', async () => {
      for (const [path, method] of [['/api/government/applications', 'POST'], ['/api/government/applications/me', 'GET'], ['/api/government/applications/me/history', 'GET'], [base, 'GET'], ...['approve', 'reject', 'revoke'].map((action) => [`${base}/${id}/${action}`, 'POST']), [`${base}/${id}/audit`, 'GET']]) {
        assert.equal((await request(path, method, undefined, null)).status, 401);
        if (path.startsWith(base)) assert.equal((await request(path, method, method === 'POST' ? { reason: 'reason', admin_id: admin } : undefined)).status, 403);
        if (path.startsWith(base)) assert.equal((await request(path, method, undefined, 'authority')).status, 403);
      }
      assert.equal((await request('/api/government/applications/me', 'GET', undefined, 'invalid')).status, 401);
    });
    await t.test('submission uses verified identity and only validated fields', async () => {
      const result = await request('/api/government/applications', 'POST', { ...valid, user_id: admin, role: 'ADMIN', status: 'APPROVED' });
      assert.equal(result.status, 201);
      assert.deepEqual(calls.at(-1), { name: 'submit_government_application', params: { p_user_id: applicant, p_department: 'Disaster Response', p_designation: 'Officer', p_official_email: 'officer@example.gov', p_employee_id: 'E-1' } });
      assert.equal((await request('/api/government/applications', 'POST', valid, 'admin')).status, 403);
      assert.equal((await request('/api/government/applications', 'POST', valid, 'authority')).status, 403);
    });
    await t.test('invalid applications fail before RPC and duplicates return conflict', async () => {
      for (const body of [null, {}, { ...valid, department: ' ' }, { ...valid, designation: {} }, { ...valid, employee_id: 'x'.repeat(101) }, { ...valid, official_email: 'invalid' }]) {
        const before = calls.length;
        assert.equal((await request('/api/government/applications', 'POST', body)).status, 400);
        assert.equal(calls.length, before);
      }
      rpcError = { code: '23505', message: 'sensitive database detail' };
      assert.deepEqual(await request('/api/government/applications', 'POST', valid), { status: 409, body: { code: 'ACTIVE_APPLICATION_EXISTS' } });
      rpcError = null;
    });
    await t.test('status/history scope to caller; ADMIN lists with validated filters', async () => {
      for (const path of ['/api/government/applications/me', '/api/government/applications/me/history']) {
        assert.equal((await request(`${path}?user_id=${admin}`)).status, 200);
        assert.deepEqual(calls.at(-1).filters, [['user_id', applicant]]);
        assert.equal((await request(path, 'GET', undefined, 'authority')).status, 200);
        assert.deepEqual(calls.at(-1).filters, [['user_id', authority]]);
      }
      assert.equal((await request(`${base}?status=PENDING&limit=10`, 'GET', undefined, 'admin')).status, 200);
      for (const query of ['status=BAD', 'limit=0', 'limit=101', 'offset=-1']) assert.equal((await request(`${base}?${query}`, 'GET', undefined, 'admin')).status, 400);
    });
    await t.test('decisions use verified Admin and require reasons; conflicts are mapped', async () => {
      for (const action of ['approve', 'reject', 'revoke']) {
        assert.equal((await request(`${base}/${id}/${action}`, 'POST', { admin_id: applicant, reason: ' Verified reason ' }, 'admin')).status, 200);
        assert.deepEqual(calls.at(-1), { name: `${action}_government_application`, params: { p_application_id: id, p_admin_id: admin, ...(action !== 'approve' ? { p_reason: 'Verified reason' } : {}) } });
        if (action !== 'approve') for (const reason of [undefined, '', ' ', 123, 'x'.repeat(2001)]) assert.equal((await request(`${base}/${id}/${action}`, 'POST', { reason }, 'admin')).status, 400);
      }
      assert.equal((await request(`${base}/invalid/approve`, 'POST', {}, 'admin')).status, 400);
      for (const [code, status] of [['P0001', 409], ['P0002', 404], ['42501', 403], ['22023', 400], ['unexpected', 500]]) {
        rpcError = { code };
        assert.equal((await request(`${base}/${id}/approve`, 'POST', {}, 'admin')).status, status);
      }
      rpcError = null;
    });
    await t.test('audit retrieval filters by application and distinguishes missing applications', async () => {
      assert.equal((await request(`${base}/${id}/audit`, 'GET', undefined, 'admin')).status, 404);
      queryResult = [{ application_id: id, action: 'APPROVED', admin_id: admin }];
      const result = await request(`${base}/${id}/audit`, 'GET', undefined, 'admin');
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.data, queryResult);
      assert.deepEqual(calls.at(-1), { table: 'government_approval_audit', filters: [['application_id', id]] });
    });
    await t.test('role-only profile updates are rejected without persistence for every caller role', async () => {
      for (const [token, userId] of [['public', applicant], ['authority', authority], ['admin', applicant], ['admin', admin]]) {
        for (const role of ['PUBLIC', 'AUTHORITY', 'ADMIN', 'INVALID', null]) {
          const before = calls.length;
          assert.deepEqual(await request(`/api/users/${userId}`, 'PATCH', { role }, token), {
            status: 400, body: { code: 'VALIDATION_ERROR' }
          });
          assert.equal(calls.length, before);
        }
      }
    });
    await t.test('mixed profile updates persist only legitimate fields for every caller role', async () => {
      const fields = { name: 'Name', phone: '1234567890', location: { city: 'Chennai' } };
      for (const [token, userId] of [['public', applicant], ['authority', authority], ['admin', applicant], ['admin', admin]]) {
        for (const role of ['PUBLIC', 'AUTHORITY', 'ADMIN', 'INVALID', null]) {
          const before = calls.length;
          assert.equal((await request(`/api/users/${userId}`, 'PATCH', { ...fields, role }, token)).status, 200);
          assert.equal(calls.length, before + 1);
          assert.deepEqual(calls.at(-1), { table: 'profiles', values: fields });
        }
        assert.equal((await request(`/api/users/${userId}`, 'PATCH', fields, token)).status, 200);
        assert.deepEqual(calls.at(-1), { table: 'profiles', values: fields });
      }
    });
    await t.test('profile updates still require authentication and ownership or ADMIN', async () => {
      const before = calls.length;
      assert.equal((await request(`/api/users/${applicant}`, 'PATCH', { name: 'Name' }, null)).status, 401);
      for (const [token, userId] of [['public', authority], ['authority', applicant]]) {
        assert.equal((await request(`/api/users/${userId}`, 'PATCH', { name: 'Name', role: 'ADMIN' }, token)).status, 403);
      }
      assert.equal(calls.length, before);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous) require.cache[configId] = previous; else delete require.cache[configId];
    for (const [key, value] of cached) { if (value) require.cache[key] = value; else delete require.cache[key]; }
  }
});
