const test = require('node:test');
const assert = require('node:assert/strict');
const { ALERT_FIELDS } = require('../alertContract');
const { MockOfficialAlertSource } = require('../mockOfficialAlertSource');
const {
  AlertIntegrationService,
  AlertIntegrationValidationError
} = require('../alertIntegrationService');

test('returns validated development-only mock alerts with exactly the agreed fields', async () => {
  const service = new AlertIntegrationService({ source: new MockOfficialAlertSource() });
  const alerts = await service.collectValidatedAlerts();

  assert.equal(alerts.length, 1);
  assert.deepEqual(Object.keys(alerts[0]), ALERT_FIELDS);
  assert.match(alerts[0].title, /DEVELOPMENT TEST ONLY/);
  assert.match(alerts[0].message, /fictional test data/i);
});

test('rejects an invalid source record before any backend handoff', async () => {
  const source = {
    async fetchRawAlerts() {
      return [{ alert_id: 'mock-dev-test-invalid' }];
    }
  };
  const service = new AlertIntegrationService({ source });

  await assert.rejects(
    service.collectValidatedAlerts(),
    (error) => error instanceof AlertIntegrationValidationError && error.index === 0
  );
});
