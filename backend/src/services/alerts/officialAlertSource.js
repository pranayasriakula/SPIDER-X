class OfficialAlertSource {
  async fetchRawAlerts() {
    throw new Error('OfficialAlertSource subclasses must implement fetchRawAlerts().');
  }
}

module.exports = { OfficialAlertSource };
