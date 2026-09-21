const asyncHandler = require('../utils/asyncHandler');
const { getMany, getById, updateById } = require('../services/dataService');
const { DISASTER_TYPES, SEVERITIES, ALERT_STATUSES, requireFields, validateUuid, validateEnum, validateCoordinates } = require('../utils/validation');
const { pick } = require('../utils/object');
const { randomUUID } = require('crypto');
const { AlertPersistenceService } = require('../services/alertPersistenceService');
const alertPersistenceService = new AlertPersistenceService();
const validateAlert = (body, required) => { if (required) requireFields(body, ['disaster_type', 'severity', 'title', 'message', 'latitude', 'longitude']); validateEnum(body.disaster_type, DISASTER_TYPES, 'disaster_type'); validateEnum(body.severity, SEVERITIES, 'severity'); validateEnum(body.status, ALERT_STATUSES, 'status'); validateCoordinates(body); };
const createAlert = asyncHandler(async (req, res) => {
  validateAlert(req.body, true);
  const timestamp = new Date().toISOString();
  const manualAlert = {
    alert_id: randomUUID(),
    created_by: req.user.id,
    ...pick(req.body, ['disaster_type', 'severity', 'title', 'message', 'latitude', 'longitude']),
    status: 'ACTIVE',
    created_at: timestamp,
    updated_at: timestamp
  };
  const alert = await alertPersistenceService.persistValidatedAlert(manualAlert, { createdBy: req.user.id });
  res.status(201).json({ success: true, data: alert });
});
const listAlerts = asyncHandler(async (req, res) => { res.json({ success: true, data: await getMany('alerts') }); });
const getAlert = asyncHandler(async (req, res) => { validateUuid(req.params.id, 'alert id'); res.json({ success: true, data: await getById('alerts', 'alert_id', req.params.id, 'ALERT_NOT_FOUND') }); });
const updateAlert = asyncHandler(async (req, res) => { validateUuid(req.params.id, 'alert id'); validateAlert(req.body, false); const updates = pick(req.body, ['disaster_type', 'severity', 'title', 'message', 'latitude', 'longitude', 'status']); if (!Object.keys(updates).length) throw new (require('../utils/apiError'))(400, 'VALIDATION_ERROR', 'No allowed alert fields were supplied'); res.json({ success: true, data: await updateById('alerts', 'alert_id', req.params.id, updates, 'ALERT_NOT_FOUND') }); });
module.exports = { createAlert, listAlerts, getAlert, updateAlert };
