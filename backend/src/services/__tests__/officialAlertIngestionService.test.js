const test = require('node:test');
const assert = require('node:assert/strict');
const { OfficialAlertIngestionService } = require('../officialAlertIngestionService');

const creatorId = '11111111-1111-4111-8111-111111111111';
const alerts = [{ alert_id: 'first' }, { alert_id: 'second' }];

test('collects and persists every validated alert with the trusted creator', async () => {
  const calls = [];
  const integrationService = { collectValidatedAlerts: async () => alerts };
  const persistenceService = {
    persistValidatedAlert: async (alert, options) => {
      calls.push({ alert, options });
      return { database_alert_id: alert.alert_id };
    }
  };
  const service = new OfficialAlertIngestionService({ integrationService, persistenceService });

  const persisted = await service.ingestValidatedAlerts({ createdBy: creatorId });

  assert.deepEqual(calls, [
    { alert: alerts[0], options: { createdBy: creatorId } },
    { alert: alerts[1], options: { createdBy: creatorId } }
  ]);
  assert.deepEqual(persisted, [
    { database_alert_id: 'first' },
    { database_alert_id: 'second' }
  ]);
});

test('returns an empty array without persistence calls when no validated alerts exist', async () => {
  const integrationService = { collectValidatedAlerts: async () => [] };
  const persistenceService = { persistValidatedAlert: async () => assert.fail('should not persist') };
  const service = new OfficialAlertIngestionService({ integrationService, persistenceService });

  assert.deepEqual(await service.ingestValidatedAlerts({ createdBy: creatorId }), []);
});

test('propagates integration and persistence errors', async () => {
  const integrationFailure = new Error('source failed');
  const integrationService = { collectValidatedAlerts: async () => { throw integrationFailure; } };
  const persistenceService = { persistValidatedAlert: async () => ({}) };
  const service = new OfficialAlertIngestionService({ integrationService, persistenceService });
  await assert.rejects(service.ingestValidatedAlerts({ createdBy: creatorId }), integrationFailure);

  const persistenceFailure = new Error('database failed');
  const failingService = new OfficialAlertIngestionService({
    integrationService: { collectValidatedAlerts: async () => [alerts[0]] },
    persistenceService: { persistValidatedAlert: async () => { throw persistenceFailure; } }
  });
  await assert.rejects(failingService.ingestValidatedAlerts({ createdBy: creatorId }), persistenceFailure);
});
