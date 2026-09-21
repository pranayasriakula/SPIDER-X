const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { getMany, getById, insert, updateById } = require('../services/dataService');
const { DISASTER_TYPES, SEVERITIES, REPORT_STATUSES, requireFields, validateUuid, validateEnum, validateCoordinates } = require('../utils/validation');
const { pick } = require('../utils/object');
const privileged = (req) => ['AUTHORITY', 'ADMIN'].includes(req.user.profile.role);

const validateReport = (body, required) => {
  if (required) requireFields(body, ['disaster_type', 'severity', 'description', 'latitude', 'longitude']);
  validateEnum(body.disaster_type, DISASTER_TYPES, 'disaster_type'); validateEnum(body.severity, SEVERITIES, 'severity'); validateEnum(body.status, REPORT_STATUSES, 'status'); validateCoordinates(body);
};
const createReport = asyncHandler(async (req, res) => {
  validateReport(req.body, true);
  const report = await insert('disaster_reports', { ...pick(req.body, ['disaster_type', 'severity', 'description', 'latitude', 'longitude']), user_id: req.user.id, status: 'PENDING' });
  res.status(201).json({ success: true, data: report });
});
const listReports = asyncHandler(async (req, res) => { res.json({ success: true, data: await getMany('disaster_reports') }); });
const getReport = asyncHandler(async (req, res) => {
  validateUuid(req.params.id, 'report id'); const report = await getById('disaster_reports', 'report_id', req.params.id, 'REPORT_NOT_FOUND');
  if (report.user_id !== req.user.id && !privileged(req)) throw new ApiError(403, 'FORBIDDEN', 'You are not authorized to view this report');
  res.json({ success: true, data: report });
});
const myReports = asyncHandler(async (req, res) => { res.json({ success: true, data: await getMany('disaster_reports', { user_id: req.user.id }) }); });
const updateReport = asyncHandler(async (req, res) => {
  validateUuid(req.params.id, 'report id'); const report = await getById('disaster_reports', 'report_id', req.params.id, 'REPORT_NOT_FOUND');
  if (report.user_id !== req.user.id && !privileged(req)) throw new ApiError(403, 'FORBIDDEN', 'You are not authorized to update this report');
  validateReport(req.body, false);
  const fields = privileged(req) ? ['disaster_type', 'severity', 'description', 'latitude', 'longitude', 'status'] : ['disaster_type', 'severity', 'description', 'latitude', 'longitude'];
  const updates = pick(req.body, fields); if (!Object.keys(updates).length) throw new ApiError(400, 'VALIDATION_ERROR', 'No allowed report fields were supplied');
  res.json({ success: true, data: await updateById('disaster_reports', 'report_id', req.params.id, updates, 'REPORT_NOT_FOUND') });
});
module.exports = { createReport, listReports, getReport, myReports, updateReport };
