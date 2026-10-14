const test = require('node:test');
const assert = require('node:assert/strict');
const { AlertPersistenceService } = require('../alertPersistenceService');

const creatorId = '11111111-1111-4111-8111-111111111111';
const generatedId = '22222222-2222-4222-8222-222222222222';
const validatedAlert = {
  alert_id: 'mock-dev-test-flood-001',
  created_by: 'development-test-source',
  disaster_type: 'FLOOD',
  severity: 'HIGH',
  title: 'Validated source alert',
  message: 'A validated alert from the source integration layer.',
  latitude: 12.9716,
  longitude: 77.5946,
  status: 'ACKNOWLEDGED',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T01:00:00Z'
};

const createDataService = () => {
  const calls = { profiles: [], inserts: [] };
  return {
    calls,
    getById: async (...args) => {
      calls.profiles.push(args);
      return { user_id: creatorId, role: 'AUTHORITY' };
    },
    insert: async (...args) => {
      calls.inserts.push(args);
      return args[1];
    }
  };
};

test('persists a validated alert with the trusted creator and database payload', async () => {
  const dataService = createDataService();
  const service = new AlertPersistenceService({ dataService, uuidGenerator: () => generatedId });

  const persisted = await service.persistValidatedAlert(validatedAlert, { createdBy: creatorId });

  assert.deepEqual(dataService.calls.profiles[0], ['profiles', 'user_id', creatorId, 'PROFILE_NOT_FOUND']);
  assert.equal(dataService.calls.inserts.length, 1);
  assert.equal(dataService.calls.inserts[0][0], 'alerts');
  assert.deepEqual(persisted, {
    ...validatedAlert,
    alert_id: generatedId,
    created_by: creatorId,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T01:00:00.000Z'
  });
});

test('never inserts a non-UUID source alert_id into the UUID database column', async () => {
  const dataService = createDataService();
  const service = new AlertPersistenceService({ dataService, uuidGenerator: () => generatedId });

  await service.persistValidatedAlert(validatedAlert, { createdBy: creatorId });

  assert.equal(dataService.calls.inserts[0][1].alert_id, generatedId);
  assert.notEqual(dataService.calls.inserts[0][1].alert_id, validatedAlert.alert_id);
});

test('preserves an already valid UUID source alert_id and the validated status', async () => {
  const dataService = createDataService();
  const sourceUuid = '33333333-3333-4333-8333-333333333333';
  const service = new AlertPersistenceService({ dataService, uuidGenerator: () => generatedId });

  const persisted = await service.persistValidatedAlert({ ...validatedAlert, alert_id: sourceUuid }, { createdBy: creatorId });

  assert.equal(persisted.alert_id, sourceUuid);
  assert.equal(persisted.status, 'ACKNOWLEDGED');
});

test('rejects missing or invalid trusted creators before database access', async () => {
  const dataService = createDataService();
  const service = new AlertPersistenceService({ dataService, uuidGenerator: () => generatedId });

  await assert.rejects(
    service.persistValidatedAlert(validatedAlert, {}),
    (error) => error.code === 'VALIDATION_ERROR' && error.message === 'createdBy must be a UUID'
  );
  await assert.rejects(
    service.persistValidatedAlert(validatedAlert, { createdBy: 'development-test-source' }),
    (error) => error.code === 'VALIDATION_ERROR'
  );
  assert.equal(dataService.calls.profiles.length, 0);
  assert.equal(dataService.calls.inserts.length, 0);
});
