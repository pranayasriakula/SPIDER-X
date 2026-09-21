const test = require('node:test');
const assert = require('node:assert/strict');
const { MockOfficialAlertSource } = require('../alerts/mockOfficialAlertSource');
const { AlertIntegrationService } = require('../alerts/alertIntegrationService');
const { OfficialAlertIngestionService } = require('../officialAlertIngestionService');

test('hands Person 4 validated alerts to Person 3 persistence with only the trusted creator', async () => {
  const trustedCreator = '11111111-1111-4111-8111-111111111111';
  const calls = [];
  const integrationService = new AlertIntegrationService({ source: new MockOfficialAlertSource() });
  const persistenceService = {
    async persistValidatedAlert(alert, options) {
      calls.push({ alert, options });
      return { alert_id: '22222222-2222-4222-8222-222222222222', created_by: options.createdBy };
    }
  };
  const service = new OfficialAlertIngestionService({ integrationService, persistenceService });

  const persisted = await service.ingestValidatedAlerts({ createdBy: trustedCreator });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].alert.alert_id, 'mock-dev-test-flood-001');
  assert.equal(calls[0].alert.created_by, 'development-test-source');
  assert.deepEqual(calls[0].options, { createdBy: trustedCreator });
  assert.deepEqual(persisted, [{ alert_id: '22222222-2222-4222-8222-222222222222', created_by: trustedCreator }]);
});
