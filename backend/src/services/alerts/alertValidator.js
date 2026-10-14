const {
  ALERT_FIELDS,
  DISASTER_TYPES,
  SEVERITIES,
  ALERT_STATUSES
} = require('./alertContract');

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const isValidTimestamp = (value) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

const validateAlert = (alert) => {
  const errors = [];

  if (!alert || typeof alert !== 'object' || Array.isArray(alert)) {
    return { valid: false, errors: ['Alert must be an object.'] };
  }

  const keys = Object.keys(alert);
  const missingFields = ALERT_FIELDS.filter((field) => !(field in alert));
  const unexpectedFields = keys.filter((field) => !ALERT_FIELDS.includes(field));

  if (missingFields.length) {
    errors.push(`Missing required fields: ${missingFields.join(', ')}.`);
  }

  if (unexpectedFields.length) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}.`);
  }

  for (const field of ['alert_id', 'created_by', 'title', 'message']) {
    if (!isNonEmptyString(alert[field])) {
      errors.push(`${field} must be a non-empty string.`);
    }
  }

  if (!DISASTER_TYPES.includes(alert.disaster_type)) {
    errors.push('disaster_type is invalid.');
  }

  if (!SEVERITIES.includes(alert.severity)) {
    errors.push('severity is invalid.');
  }

  if (!ALERT_STATUSES.includes(alert.status)) {
    errors.push('status is invalid.');
  }

  if (
    typeof alert.latitude !== 'number' ||
    !Number.isFinite(alert.latitude) ||
    alert.latitude < -90 ||
    alert.latitude > 90
  ) {
    errors.push('latitude must be a finite number between -90 and 90.');
  }

  if (
    typeof alert.longitude !== 'number' ||
    !Number.isFinite(alert.longitude) ||
    alert.longitude < -180 ||
    alert.longitude > 180
  ) {
    errors.push('longitude must be a finite number between -180 and 180.');
  }

  for (const field of ['created_at', 'updated_at']) {
    if (!isValidTimestamp(alert[field])) {
      errors.push(`${field} must be a valid timestamp string.`);
    }
  }

  return { valid: errors.length === 0, errors };
};

module.exports = { validateAlert };
