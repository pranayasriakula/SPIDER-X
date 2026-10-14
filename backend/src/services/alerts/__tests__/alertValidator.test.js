const test = require('node:test');
const assert = require('node:assert/strict');
const { mockOfficialAlerts } = require('../fixtures/mockOfficialAlerts');
const { validateAlert } = require('../alertValidator');

test('accepts a complete alert with only agreed fields and enum values', () => {
  const result = validateAlert(mockOfficialAlerts[0]);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('rejects unexpected fields and invalid enum values', () => {
  const result = validateAlert({
    ...mockOfficialAlerts[0],
    severity: 'URGENT',
    source_url: 'https://example.invalid'
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('severity is invalid.'));
  assert.ok(result.errors.includes('Unexpected fields: source_url.'));
});

test('rejects invalid coordinates and timestamps', () => {
  const result = validateAlert({
    ...mockOfficialAlerts[0],
    latitude: 91,
    longitude: Number.NaN,
    created_at: 'not-a-timestamp'
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('latitude must be a finite number between -90 and 90.'));
  assert.ok(result.errors.includes('longitude must be a finite number between -180 and 180.'));
  assert.ok(result.errors.includes('created_at must be a valid timestamp string.'));
});
