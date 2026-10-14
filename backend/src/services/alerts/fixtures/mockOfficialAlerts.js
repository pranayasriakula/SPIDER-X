// DEVELOPMENT/TEST DATA ONLY.
// These records are fictional and must never be displayed or represented as live government alerts.
const mockOfficialAlerts = Object.freeze([
  Object.freeze({
    alert_id: 'mock-dev-test-flood-001',
    created_by: 'development-test-source',
    disaster_type: 'FLOOD',
    severity: 'LOW',
    title: 'DEVELOPMENT TEST ONLY - Mock flood exercise',
    message: 'This is fictional test data for local development. It is not an official alert.',
    latitude: 12.9716,
    longitude: 77.5946,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  })
]);

module.exports = { mockOfficialAlerts };
