const { ALERT_FIELDS } = require('./alertContract');

const normalizeText = (value) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEnum = (value) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const normalizeCoordinate = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : value;
  }

  return value;
};

const normalizeTimestamp = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const parsedTimestamp = Date.parse(value);
  return Number.isNaN(parsedTimestamp) ? value : new Date(parsedTimestamp).toISOString();
};

const normalizeOfficialAlert = (rawAlert, fieldMap = {}) => {
  if (!rawAlert || typeof rawAlert !== 'object' || Array.isArray(rawAlert)) {
    return rawAlert;
  }

  const alert = {};

  for (const field of ALERT_FIELDS) {
    const sourceField = fieldMap[field] || field;
    alert[field] = rawAlert[sourceField];
  }

  alert.alert_id = normalizeText(alert.alert_id);
  alert.created_by = normalizeText(alert.created_by);
  alert.title = normalizeText(alert.title);
  alert.message = normalizeText(alert.message);
  alert.disaster_type = normalizeEnum(alert.disaster_type);
  alert.severity = normalizeEnum(alert.severity);
  alert.status = normalizeEnum(alert.status);
  alert.latitude = normalizeCoordinate(alert.latitude);
  alert.longitude = normalizeCoordinate(alert.longitude);
  alert.created_at = normalizeTimestamp(alert.created_at);
  alert.updated_at = normalizeTimestamp(alert.updated_at);

  return alert;
};

module.exports = { normalizeOfficialAlert };
