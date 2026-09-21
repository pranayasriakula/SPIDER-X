class OfficialAlertIngestionService {
  constructor({ integrationService, persistenceService } = {}) {
    if (!integrationService || typeof integrationService.collectValidatedAlerts !== 'function') {
      throw new TypeError('integrationService must provide collectValidatedAlerts().');
    }

    if (!persistenceService || typeof persistenceService.persistValidatedAlert !== 'function') {
      throw new TypeError('persistenceService must provide persistValidatedAlert().');
    }

    this.integrationService = integrationService;
    this.persistenceService = persistenceService;
  }

  async ingestValidatedAlerts({ createdBy } = {}) {
    const validatedAlerts = await this.integrationService.collectValidatedAlerts();

    if (!Array.isArray(validatedAlerts)) {
      throw new TypeError('integrationService.collectValidatedAlerts() must resolve to an array.');
    }

    const persistedAlerts = [];
    for (const alert of validatedAlerts) {
      persistedAlerts.push(
        await this.persistenceService.persistValidatedAlert(alert, { createdBy })
      );
    }

    return persistedAlerts;
  }
}

module.exports = { OfficialAlertIngestionService };
