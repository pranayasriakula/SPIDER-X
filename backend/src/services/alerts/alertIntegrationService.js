const { normalizeOfficialAlert } = require('./alertNormalizer');
const { validateAlert } = require('./alertValidator');

class AlertIntegrationValidationError extends Error {
  constructor(index, errors) {
    super(`Alert at index ${index} did not satisfy the agreed alert contract.`);
    this.name = 'AlertIntegrationValidationError';
    this.index = index;
    this.errors = errors;
  }
}

class AlertIntegrationService {
  constructor({ source, fieldMap = {} }) {
    if (!source || typeof source.fetchRawAlerts !== 'function') {
      throw new TypeError('source must provide an async fetchRawAlerts() function.');
    }

    this.source = source;
    this.fieldMap = fieldMap;
  }

  async collectValidatedAlerts() {
    const rawAlerts = await this.source.fetchRawAlerts();

    if (!Array.isArray(rawAlerts)) {
      throw new TypeError('fetchRawAlerts() must resolve to an array.');
    }

    return rawAlerts.map((rawAlert, index) => {
      const alert = normalizeOfficialAlert(rawAlert, this.fieldMap);
      const validation = validateAlert(alert);

      if (!validation.valid) {
        throw new AlertIntegrationValidationError(index, validation.errors);
      }

      return alert;
    });
  }
}

module.exports = {
  AlertIntegrationService,
  AlertIntegrationValidationError
};
