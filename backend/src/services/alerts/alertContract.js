const ALERT_FIELDS = Object.freeze([
  'alert_id',
  'created_by',
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

const DISASTER_TYPES = Object.freeze([
  'FLOOD',
  'EARTHQUAKE',
  'FIRE',
  'LANDSLIDE',
  'CYCLONE',
  'TSUNAMI',
  'DROUGHT',
  'INDUSTRIAL',
  'OTHER'
]);

const SEVERITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const ALERT_STATUSES = Object.freeze([
  'ACTIVE',
  'ACKNOWLEDGED',
  'RESOLVED',
  'CANCELLED'
]);

module.exports = {
  ALERT_FIELDS,
  DISASTER_TYPES,
  SEVERITIES,
  ALERT_STATUSES
};
