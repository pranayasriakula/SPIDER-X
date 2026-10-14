const { OfficialAlertSource } = require('./officialAlertSource');
const { mockOfficialAlerts } = require('./fixtures/mockOfficialAlerts');

// DEVELOPMENT/TEST SOURCE ONLY. This class does not contact an external service.
class MockOfficialAlertSource extends OfficialAlertSource {
  async fetchRawAlerts() {
    return mockOfficialAlerts.map((alert) => ({ ...alert }));
  }
}

module.exports = { MockOfficialAlertSource };
