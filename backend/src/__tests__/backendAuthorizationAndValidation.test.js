const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataServicePath = path.join(root, 'services', 'dataService.js');

const loadController = (name, dataService) => {
  const controllerPath = path.join(root, 'controllers', `${name}.js`);
  const dataServiceId = require.resolve(dataServicePath);
  const controllerId = require.resolve(controllerPath);
  const previousDataService = require.cache[dataServiceId];
  const previousController = require.cache[controllerId];

  require.cache[dataServiceId] = { id: dataServiceId, filename: dataServiceId, loaded: true, exports: dataService };
  delete require.cache[controllerId];
  const controller = require(controllerPath);

  return {
    controller,
    restore() {
      if (previousDataService) require.cache[dataServiceId] = previousDataService;
      else delete require.cache[dataServiceId];
      if (previousController) require.cache[controllerId] = previousController;
      else delete require.cache[controllerId];
    }
  };
};

const invoke = (handler, req) => new Promise((resolve) => {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { resolve({ statusCode: this.statusCode, body }); }
  };
  handler(req, res, (error) => resolve({ error }));
});

const publicUser = '11111111-1111-4111-8111-111111111111';
const authorityUser = '22222222-2222-4222-8222-222222222222';
const recordId = '33333333-3333-4333-8333-333333333333';
const reqFor = (role, body = {}, id = recordId) => ({
  body,
  params: { id },
  user: { id: role === 'AUTHORITY' ? authorityUser : publicUser, profile: { role } }
});

test('authentication middleware derives identity and role from Supabase rather than request input', async () => {
  const configId = require.resolve('../config/supabase');
  const authId = require.resolve('../middleware/auth');
  const previousConfig = require.cache[configId];
  const previousAuth = require.cache[authId];
  const supabaseAdmin = {
    auth: { getUser: async (token) => ({ data: { user: { id: publicUser, token } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { user_id: publicUser, role: 'PUBLIC' }, error: null }) }) }) })
  };
  require.cache[configId] = { id: configId, filename: configId, loaded: true, exports: { supabaseAdmin } };
  delete require.cache[authId];
  const { authenticate } = require('../middleware/auth');
  try {
    const req = { headers: { authorization: 'Bearer trusted-token' }, user: { id: authorityUser } };
    const result = await invoke(authenticate, req);
    assert.equal(result.error, undefined);
    assert.equal(req.user.id, publicUser);
    assert.equal(req.user.profile.role, 'PUBLIC');

    const missingToken = await invoke(authenticate, { headers: {} });
    assert.equal(missingToken.error.statusCode, 401);
    assert.equal(missingToken.error.code, 'AUTHENTICATION_REQUIRED');
  } finally {
    if (previousConfig) require.cache[configId] = previousConfig;
    else delete require.cache[configId];
    if (previousAuth) require.cache[authId] = previousAuth;
    else delete require.cache[authId];
  }
});

test('authorization middleware permits only the configured roles', () => {
  const { authorize } = require('../middleware/auth');
  let nextError;
  authorize('AUTHORITY', 'ADMIN')(reqFor('PUBLIC'), {}, (error) => { nextError = error; });
  assert.equal(nextError.statusCode, 403);
  assert.equal(nextError.code, 'FORBIDDEN');

  let permitted = false;
  authorize('AUTHORITY', 'ADMIN')(reqFor('AUTHORITY'), {}, () => { permitted = true; });
  assert.equal(permitted, true);
});

test('report creation ignores client user_id and status, using the authenticated identity', async () => {
  const calls = [];
  const { controller, restore } = loadController('reportController', {
    insert: async (...args) => { calls.push(args); return args[1]; },
    getMany: async () => [], getById: async () => ({}), updateById: async () => ({})
  });
  try {
    const result = await invoke(controller.createReport, reqFor('PUBLIC', {
      user_id: authorityUser, status: 'VERIFIED', disaster_type: 'FLOOD', severity: 'HIGH',
      description: 'Flooded road', latitude: 12.9, longitude: 77.5
    }));
    assert.equal(result.statusCode, 201);
    assert.deepEqual(calls[0], ['disaster_reports', {
      disaster_type: 'FLOOD', severity: 'HIGH', description: 'Flooded road', latitude: 12.9, longitude: 77.5,
      user_id: publicUser, status: 'PENDING'
    }]);
  } finally { restore(); }
});

test('PUBLIC users cannot patch only a report status, while AUTHORITY users can', async () => {
  const calls = [];
  const { controller, restore } = loadController('reportController', {
    getById: async () => ({ report_id: recordId, user_id: publicUser }),
    updateById: async (...args) => { calls.push(args); return args[3]; },
    getMany: async () => [], insert: async () => ({})
  });
  try {
    const forbidden = await invoke(controller.updateReport, reqFor('PUBLIC', { status: 'VERIFIED' }));
    assert.equal(forbidden.error.statusCode, 400);
    assert.equal(forbidden.error.code, 'VALIDATION_ERROR');
    assert.equal(calls.length, 0);

    const allowed = await invoke(controller.updateReport, reqFor('AUTHORITY', { status: 'VERIFIED' }));
    assert.equal(allowed.statusCode, 200);
    assert.deepEqual(calls[0], ['disaster_reports', 'report_id', recordId, { status: 'VERIFIED' }, 'REPORT_NOT_FOUND']);
  } finally { restore(); }
});

test('notification mark-read enforces ownership before update', async () => {
  let updateCalled = false;
  const { controller, restore } = loadController('notificationController', {
    getById: async () => ({ notification_id: recordId, user_id: authorityUser }),
    updateById: async () => { updateCalled = true; return {}; }, getMany: async () => []
  });
  try {
    const result = await invoke(controller.markRead, reqFor('PUBLIC'));
    assert.equal(result.error.statusCode, 403);
    assert.equal(result.error.code, 'FORBIDDEN');
    assert.equal(updateCalled, false);
  } finally { restore(); }
});

test('observation, rescue-centre, and resource validation reject unsafe input before persistence', async () => {
  const calls = [];
  const dataService = {
    getById: async () => { calls.push('getById'); return {}; },
    insert: async () => { calls.push('insert'); return {}; },
    getMany: async () => [], updateById: async () => { calls.push('updateById'); return {}; }, database: () => ({})
  };
  const observation = loadController('observationController', dataService);
  const center = loadController('rescueCenterController', dataService);
  const resource = loadController('resourceController', dataService);
  try {
    const badObservation = await invoke(observation.controller.createObservation, reqFor('AUTHORITY', {
      timestamp: 'not-a-timestamp', latitude: 91, longitude: 77, sensors: { gas: { status: 'DANGER' } }
    }, 'not-a-uuid'));
    assert.equal(badObservation.error.code, 'VALIDATION_ERROR');

    const badCenter = await invoke(center.controller.createCenter, reqFor('AUTHORITY', {
      name: 'A', address: 'B', latitude: 1, longitude: 2, capacity: 2, available_capacity: -1, status: 'OPEN'
    }));
    assert.equal(badCenter.error.code, 'VALIDATION_ERROR');

    const badResource = await invoke(resource.controller.updateResource, reqFor('AUTHORITY', { quantity: -1 }));
    assert.equal(badResource.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(calls, []);
  } finally { resource.restore(); center.restore(); observation.restore(); }
});
