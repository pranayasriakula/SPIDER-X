const { randomUUID } = require('crypto');
const defaultDataService = require('./dataService');
const ApiError = require('../utils/apiError');
const {
  DISASTER_TYPES,
  SEVERITIES,
  ALERT_STATUSES,
  requireFields,
  validateUuid,
  validateEnum,
  validateCoordinates,
  validateTimestamp
} = require('../utils/validation');

class AlertPersistenceService {
  constructor({ dataService = defaultDataService, uuidGenerator = randomUUID } = {}) {
    if (!dataService || typeof dataService.insert !== 'function' || typeof dataService.getById !== 'function') {
      throw new TypeError('dataService must provide insert() and getById() functions.');
    }

    if (typeof uuidGenerator !== 'function') {
      throw new TypeError('uuidGenerator must be a function.');
    }

    this.dataService = dataService;
    this.uuidGenerator = uuidGenerator;
  }

  async persistValidatedAlert(alert, { createdBy } = {}) {
    this.validateAlertForDatabase(alert);
    validateUuid(createdBy, 'createdBy');

    // Verify the trusted creator exists before writing the foreign-key value.
    await this.dataService.getById('profiles', 'user_id', createdBy, 'PROFILE_NOT_FOUND');

    const alertId = this.resolveDatabaseAlertId(alert.alert_id);
    const payload = {
      alert_id: alertId,
      created_by: createdBy,
      disaster_type: alert.disaster_type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      latitude: alert.latitude,
      longitude: alert.longitude,
      status: alert.status,
      created_at: new Date(alert.created_at).toISOString(),
      updated_at: new Date(alert.updated_at).toISOString()
    };

    // The schema has no source_alert_id column. The original non-UUID source
    // identifier is intentionally not inserted and cannot provide idempotency.
    return this.dataService.insert('alerts', payload);
  }

  resolveDatabaseAlertId(sourceAlertId) {
    if (this.isUuid(sourceAlertId)) {
      return sourceAlertId;
    }

    const generatedId = this.uuidGenerator();
    validateUuid(generatedId, 'generated alert_id');
    return generatedId;
  }

  validateAlertForDatabase(alert) {
    if (!alert || typeof alert !== 'object' || Array.isArray(alert)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'alert must be an object');
    }

    requireFields(alert, [
      'alert_id',
      'disaster_type',
      'severity',
      'title',
      'message',
      'latitude',
      'longitude',
      'status',
      'created_at',
      'updated_at'
    ]);

    if (typeof alert.alert_id !== 'string' || !alert.alert_id.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'alert_id must be a non-empty source identifier');
    }

    validateEnum(alert.disaster_type, DISASTER_TYPES, 'disaster_type');
    validateEnum(alert.severity, SEVERITIES, 'severity');
    validateEnum(alert.status, ALERT_STATUSES, 'status');
    validateCoordinates(alert);
    validateTimestamp(alert.created_at, 'created_at');
    validateTimestamp(alert.updated_at, 'updated_at');
  }

  isUuid(value) {
    try {
      validateUuid(value, 'alert_id');
      return true;
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') return false;
      throw error;
    }
  }
}

module.exports = { AlertPersistenceService };
