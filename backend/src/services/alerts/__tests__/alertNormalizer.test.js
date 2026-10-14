const test = require('node:test');
const assert = require('node:assert/strict');
const { ALERT_FIELDS } = require('../alertContract');
const { normalizeOfficialAlert } = require('../alertNormalizer');

test('normalizes mapped provider values into exactly the agreed alert fields', () => {
  const normalized = normalizeOfficialAlert(
    {
      id: ' mock-dev-test-fire-002 ',
      author: ' development-test-source ',
      type: ' fire ',
      level: ' high ',
      heading: ' DEVELOPMENT TEST ONLY - Mock fire exercise ',
      body: ' Fictional test data only. ',
      lat: '12.5',
      lng: '77.5',
      state: ' active ',
      published: '2026-01-02T00:00:00Z',
      changed: '2026-01-02T01:00:00Z',
      ignored_provider_field: 'not part of the output'
    },
    {
      alert_id: 'id',
      created_by: 'author',
      disaster_type: 'type',
      severity: 'level',
      title: 'heading',
      message: 'body',
      latitude: 'lat',
      longitude: 'lng',
      status: 'state',
      created_at: 'published',
      updated_at: 'changed'
    }
  );

  assert.deepEqual(Object.keys(normalized), ALERT_FIELDS);
  assert.equal(normalized.disaster_type, 'FIRE');
  assert.equal(normalized.severity, 'HIGH');
  assert.equal(normalized.latitude, 12.5);
  assert.equal(normalized.longitude, 77.5);
  assert.equal(normalized.created_at, '2026-01-02T00:00:00.000Z');
  assert.equal(normalized.updated_at, '2026-01-02T01:00:00.000Z');
});

test('keeps missing mapped values visible for the validator to reject', () => {
  const normalized = normalizeOfficialAlert({ id: 'mock-dev-test-incomplete' }, { alert_id: 'id' });

  assert.deepEqual(Object.keys(normalized), ALERT_FIELDS);
  assert.equal(normalized.alert_id, 'mock-dev-test-incomplete');
  assert.equal(normalized.created_by, undefined);
});
