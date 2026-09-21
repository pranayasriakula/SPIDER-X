const ApiError = require('./apiError');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISASTER_TYPES = ['FLOOD', 'EARTHQUAKE', 'FIRE', 'LANDSLIDE', 'CYCLONE', 'TSUNAMI', 'DROUGHT', 'INDUSTRIAL', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const REPORT_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'RESOLVED'];
const ALERT_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED'];
const ROBOT_STATUSES = ['ONLINE', 'OFFLINE', 'MISSION', 'ERROR'];
const SENSOR_STATUSES = ['NORMAL', 'WARNING', 'CRITICAL'];
const ROLES = ['PUBLIC', 'AUTHORITY', 'ADMIN'];

const fail = (message) => { throw new ApiError(400, 'VALIDATION_ERROR', message); };
const requireFields = (body, fields) => fields.forEach((field) => {
  if (body[field] === undefined || body[field] === null || body[field] === '') fail(`${field} is required`);
});
const validateUuid = (value, field = 'id') => { if (!UUID_PATTERN.test(value || '')) fail(`${field} must be a UUID`); };
const validateEnum = (value, allowed, field) => { if (value !== undefined && !allowed.includes(value)) fail(`${field} must be one of: ${allowed.join(', ')}`); };
const validateCoordinates = (body) => {
  ['latitude', 'longitude'].forEach((field) => {
    if (body[field] !== undefined && (typeof body[field] !== 'number' || !Number.isFinite(body[field]))) fail(`${field} must be a number`);
  });
  if (body.latitude !== undefined && (body.latitude < -90 || body.latitude > 90)) fail('latitude must be between -90 and 90');
  if (body.longitude !== undefined && (body.longitude < -180 || body.longitude > 180)) fail('longitude must be between -180 and 180');
};
const validateTimestamp = (value, field = 'timestamp') => {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) fail(`${field} must be an ISO 8601 timestamp`);
};
const validateSensorStatuses = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('sensors must be an object');
  const inspect = (item) => {
    if (!item || typeof item !== 'object') return;
    if (item.status !== undefined) validateEnum(item.status, SENSOR_STATUSES, 'sensor status');
    Object.values(item).forEach(inspect);
  };
  inspect(value);
};

module.exports = { DISASTER_TYPES, SEVERITIES, REPORT_STATUSES, ALERT_STATUSES, ROBOT_STATUSES, ROLES, requireFields, validateUuid, validateEnum, validateCoordinates, validateTimestamp, validateSensorStatuses };
