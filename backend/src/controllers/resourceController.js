const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { getMany, insert, updateById } = require('../services/dataService');
const { requireFields, validateUuid } = require('../utils/validation');
const { pick } = require('../utils/object');
const listResources = asyncHandler(async (req, res) => { res.json({ success: true, data: await getMany('resources', {}, 'updated_at') }); });
const createResource = asyncHandler(async (req, res) => { requireFields(req.body, ['name', 'type', 'quantity', 'location', 'status']); if (!Number.isFinite(req.body.quantity) || req.body.quantity < 0) throw new ApiError(400, 'VALIDATION_ERROR', 'quantity must be a non-negative number'); res.status(201).json({ success: true, data: await insert('resources', pick(req.body, ['name', 'type', 'quantity', 'location', 'status'])) }); });
const updateResource = asyncHandler(async (req, res) => { validateUuid(req.params.id, 'resource id'); const updates = pick(req.body, ['name', 'type', 'quantity', 'location', 'status']); if (updates.quantity !== undefined && (!Number.isFinite(updates.quantity) || updates.quantity < 0)) throw new ApiError(400, 'VALIDATION_ERROR', 'quantity must be a non-negative number'); if (!Object.keys(updates).length) throw new ApiError(400, 'VALIDATION_ERROR', 'No allowed resource fields were supplied'); res.json({ success: true, data: await updateById('resources', 'resource_id', req.params.id, updates, 'RESOURCE_NOT_FOUND') }); });
module.exports = { listResources, createResource, updateResource };
